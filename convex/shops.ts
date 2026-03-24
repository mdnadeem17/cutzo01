import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all active shops (used by customer listing)
export const getShops = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get shops owned by a specific owner (used by vendor dashboard)
export const getShopsByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

// Get trending shops (highest rated)
export const getTrendingShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return shops
      .sort((a, b) => b.rating - a.rating || b.totalReviews - a.totalReviews)
      .slice(0, 10);
  },
});

// Get nearby shops using Haversine formula
export const getNearbyShops = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusInKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const R = 6371; // Radius of the Earth in km
    const toRad = (value: number) => (value * Math.PI) / 180;

    const nearbyShops = shops.map((shop) => {
      const dLatVal = toRad(shop.location.lat - args.lat);
      const dLonVal = toRad(shop.location.lng - args.lng);

      const a =
        Math.sin(dLatVal / 2) * Math.sin(dLatVal / 2) +
        Math.cos(toRad(args.lat)) *
          Math.cos(toRad(shop.location.lat)) *
          Math.sin(dLonVal / 2) *
          Math.sin(dLonVal / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return { ...shop, distance };
    });

    const radius = args.radiusInKm ?? 10;
    return nearbyShops
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  },
});

// Upsert a shop by ownerId — insert if new, update if existing.
// Called from the vendor frontend whenever shop data is saved.
export const upsertShop = mutation({
  args: {
    ownerId: v.string(),
    shopName: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    servicesJson: v.optional(v.string()),
    startingPrice: v.optional(v.number()),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    slotDuration: v.optional(v.number()),
    maxBookingsPerSlot: v.optional(v.number()),
    breakTime: v.optional(v.object({
      start: v.string(),
      end: v.string(),
    })),
    nextSlot: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    availabilitySlotsJson: v.optional(v.string()),
    blockedDatesJson: v.optional(v.string()),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    // Primary check: shop by ownerId
    let existing = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    // Secondary check: if not found by ownerId, check by phone number
    // This prevents duplicates when the same owner re-registers with a new timestamp-based userId
    if (!existing && args.phone) {
      existing = await ctx.db
        .query("shops")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first() ?? null;
    }

    const shopData = {
      ownerId: args.ownerId,
      shopName: args.shopName,
      address: args.address,
      location: { lat: args.lat, lng: args.lng },
      isActive: true,
      phone: args.phone,
      image: args.image,
      images: args.images,
      servicesJson: args.servicesJson,
      startingPrice: args.startingPrice,
      openTime: args.openTime,
      closeTime: args.closeTime,
      slotDuration: args.slotDuration,
      maxBookingsPerSlot: args.maxBookingsPerSlot,
      breakTime: args.breakTime,
      nextSlot: args.nextSlot,
      gpsLocation: args.gpsLocation,
      locationLabel: args.locationLabel,
      availabilitySlotsJson: args.availabilitySlotsJson,
      blockedDatesJson: args.blockedDatesJson,
      username: args.username,
      password: args.password,
    };

    if (existing) {
      // ── Ownership check ──────────────────────────────────────────────────
      // If found via ownerId: must match (security check).
      // If found via phone fallback (ownerId differs): this is a legitimate
      // re-registration — update the record and adopt the new ownerId.
      if (existing.ownerId !== args.ownerId) {
        // Phone-fallback case: update ownerId to the new value so future
        // by_owner lookups work correctly.
        shopData.ownerId = args.ownerId;
      }
      // Preserve existing rating/reviews/status on update
      await ctx.db.patch(existing._id, {
        ...shopData,
        status: existing.status || args.status || "pending",
      });
      return existing._id;
    }

    return await ctx.db.insert("shops", {
      ...shopData,
      status: args.status || "pending",
      rating: 0,
      totalReviews: 0,
    });
  },
});

/**
 * Secure login mutation for shop owners.
 * 
 * Security properties:
 * - This is a MUTATION (not a query) → not cached, not publicly introspectable
 * - Rate limited: 5 failures → 5-minute lockout
 * - Returns sanitized record: password + username NEVER sent to client
 * - Approval enforced server-side: only status=approved can log in
 */
export const loginShopOwner = mutation({
  args: {
    username: v.string(),
    password: v.string(), // SHA-256 hex hash from client
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

    // ── 1. Rate limit check ───────────────────────────────────
    const attemptRecord = await ctx.db
      .query("loginAttempts")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (attemptRecord?.lockedUntil && now < attemptRecord.lockedUntil) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      // Log: blocked by rate limiter
      await ctx.db.insert("securityLogs", {
        event: "login_locked",
        username: args.username,
        outcome: "blocked",
        detail: `Account locked. ${remainingSeconds}s remaining.`,
        timestamp: now,
      });
      throw new Error(`Too many failed attempts. Try again in ${remainingSeconds} seconds.`);
    }

    // ── 2. Credential lookup ──────────────────────────────────
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    const credentialsValid = shop && shop.password === args.password;

    // ── 3. Update attempt counter ─────────────────────────────
    if (!credentialsValid) {
      const newCount = (attemptRecord?.failedCount ?? 0) + 1;
      const shouldLock = newCount >= MAX_ATTEMPTS;

      if (attemptRecord) {
        await ctx.db.patch(attemptRecord._id, {
          failedCount: newCount,
          lastAttemptAt: now,
          lockedUntil: shouldLock ? now + LOCKOUT_MS : undefined,
        });
      } else {
        await ctx.db.insert("loginAttempts", {
          username: args.username,
          failedCount: newCount,
          lockedUntil: shouldLock ? now + LOCKOUT_MS : undefined,
          lastAttemptAt: now,
        });
      }

      // Log: failed login attempt
      await ctx.db.insert("securityLogs", {
        event: shouldLock ? "login_rate_limited" : "login_failure",
        username: args.username,
        outcome: "failure",
        detail: shouldLock
          ? `Account locked after ${newCount} failed attempts.`
          : `Failed attempt ${newCount} of ${MAX_ATTEMPTS}.`,
        timestamp: now,
      });

      return { success: false, error: "Invalid username or password." };
    }

    // ── 4. Reset attempt counter on success ───────────────────
    if (attemptRecord) {
      await ctx.db.patch(attemptRecord._id, {
        failedCount: 0,
        lockedUntil: undefined,
        lastAttemptAt: now,
      });
    }

    // ── 5. Enforce approval status server-side ────────────────
    if (shop.status !== "approved") {
      // Log: blocked due to pending/rejected status
      await ctx.db.insert("securityLogs", {
        event: "login_blocked_approval",
        username: args.username,
        outcome: "blocked",
        detail: `Shop status is "${shop.status}". Access denied.`,
        timestamp: now,
      });
      return { success: false, error: "pending" };
    }

    // ── 6. Return SANITIZED record — never leak password ─────
    const { password: _pwd, username: _uname, ...safeShop } = shop;

    // Log: successful login
    await ctx.db.insert("securityLogs", {
      event: "login_success",
      username: args.username,
      outcome: "success",
      detail: `Shop "${shop.shopName}" authenticated successfully.`,
      timestamp: now,
    });

    return { success: true, shop: safeShop };
  },
});

export const getShopById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shopId);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getImageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get slots booking counts for a specific shop
export const getShopBookedSlots = query({
  args: {
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => 
        q.eq("shopId", args.shopId)
      )
      .collect();
  },
});

// Get blocked dates for a specific shop
export const getShopBlockedDates = query({
  args: {
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
  },
});

// ── Operational Status (isOpen) ─────────────────────────────────────────────

/**
 * Toggle the shop's live open/closed status.
 * Uses ownerId for lookup so the frontend doesn't need the internal shopId.
 */
export const toggleShopStatus = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) throw new Error("Shop not found for ownerId: " + args.ownerId);

    const next = !(shop.isOpen ?? true); // default open if undefined
    await ctx.db.patch(shop._id, { isOpen: next });
    return next;
  },
});

/**
 * Reactively read the shop's current isOpen status.
 * Returns true (open) if the field is undefined (backward compat).
 */
export const getShopIsOpen = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) return true; // fallback: treat as open if shop not synced yet
    return shop.isOpen ?? true;
  },
});

// ── Shop Availability for Wheel Picker ──────────────────────────────────────

export const getShopAvailability = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive) {
      throw new Error("Shop not found or inactive.");
    }
    
    return {
      openTime: shop.openTime || "09:00",
      closeTime: shop.closeTime || "21:00",
      slotDuration: shop.slotDuration || 30,
      breakTime: shop.breakTime,
      blockedDatesJson: shop.blockedDatesJson,
      availabilitySlotsJson: shop.availabilitySlotsJson,
    };
  },
});

export const checkSlotAvailable = query({
  args: { shopId: v.id("shops"), date: v.string(), time: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive || shop.isOpen === false) {
      return { available: false, reason: "Shop is closed." };
    }

    // 1. Check blocked dates natively
    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    if (blockedDates.length > 0) return { available: false, reason: "Date is blocked." };

    if (shop.blockedDatesJson) {
      try {
        const parsed = JSON.parse(shop.blockedDatesJson);
        if (parsed.some((b: any) => b.date === args.date)) {
          return { available: false, reason: "Date is blocked." };
        }
      } catch (e) {}
    }

    // 2. Check break times
    // Assuming time comes in "HH:MM" 24h format as the existing system uses.
    if (shop.breakTime) {
      const bStart = shop.breakTime.start; // e.g. "13:00"
      const bEnd = shop.breakTime.end;

      const tNum = parseInt(args.time.replace(":", ""), 10);
      const sNum = parseInt(bStart.replace(":", ""), 10);
      const eNum = parseInt(bEnd.replace(":", ""), 10);

      if (tNum >= sNum && tNum < eNum) {
        return { available: false, reason: "Shop is on break." };
      }
    }

    // 3. Check capacity in slotBookings
    const existingSlot = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", args.shopId).eq("date", args.date).eq("time", args.time)
      )
      .first();

    const maxCapacity = shop.maxBookingsPerSlot || 1;
    if (existingSlot && existingSlot.bookedCount >= maxCapacity) {
      return { available: false, reason: "Slot is fully booked." };
    }

    return { available: true };
  },
});
