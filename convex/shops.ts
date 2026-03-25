import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { timeToMins, minsToTime24, isPastTime, isDuring } from "./utils";
import bcrypt from "bcryptjs";

// Get all active shops (used by customer listing)
export const getShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    // Map denormalized summary to services field for O(1) listing performance
    return shops.map(shop => ({
      ...shop,
      services: shop.servicesSummary || []
    }));
  },
});

// Get shops owned by a specific owner (used by vendor dashboard)
export const getShopsByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shops = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
      
    // Enforce RLS on returned shops
    const authorizedShops = shops.filter(s => {
      if (!s.firebaseUid) return true;
      if (s.firebaseUid === identity.subject) return true;
      // Lenient check for legacy "owner-*" IDs
      if (s.firebaseUid.startsWith("owner-")) return true;
      return false;
    });
    if (shops.length > 0 && authorizedShops.length === 0) throw new Error("Unauthorized");
    
    return authorizedShops;
  },
});

export const getShopByFirebaseUid = query({
  args: { firebaseUid: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.firebaseUid) throw new Error("Unauthorized");

    return await ctx.db
      .query("shops")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .first();
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
      .slice(0, 10)
      .map(shop => ({
        ...shop,
        services: shop.servicesSummary || []
      }));
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
      .sort((a, b) => a.distance - b.distance)
      .map(shop => ({
        ...shop,
        services: shop.servicesSummary || []
      }));
  },
});

// Upsert a shop by ownerId — insert if new, update if existing.
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
    firebaseUid: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    services: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      duration: v.number(),
    }))),
    blockedDates: v.optional(v.array(v.object({
      date: v.string(),
      reason: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    let existing = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!existing && args.phone) {
      existing = await ctx.db
        .query("shops")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
    }

    if (existing) {
      if (existing.firebaseUid && existing.firebaseUid !== identity.subject) {
        // Lenient check for legacy "owner-*" IDs — allow repair
        if (!existing.firebaseUid.startsWith("owner-")) {
          throw new Error("Unauthorized to modify this shop");
        }
      }
    } else {
      if (args.firebaseUid && args.firebaseUid !== identity.subject) {
        throw new Error("Unauthorized to create shop for another user");
      }
    }

    // Hash password if provided and not already hashed
    let hashedPassword = args.password;
    if (args.password && !args.password.startsWith("$2a$")) {
      hashedPassword = await bcrypt.hash(args.password, 10);
    }

    const shopData: Record<string, any> = {
      ownerId: args.ownerId,
      shopName: args.shopName,
      address: args.address,
      location: { lat: args.lat, lng: args.lng },
      isActive: true,
      phone: args.phone,
      image: args.image,
      images: args.images,
      startingPrice: args.startingPrice,
      openTime: args.openTime,
      closeTime: args.closeTime,
      slotDuration: args.slotDuration,
      maxBookingsPerSlot: args.maxBookingsPerSlot,
      breakTime: args.breakTime,
      nextSlot: args.nextSlot,
      gpsLocation: args.gpsLocation,
      locationLabel: args.locationLabel,
      firebaseUid: args.firebaseUid,
      ...(args.username ? { username: args.username } : {}),
      ...(hashedPassword ? { password: hashedPassword } : {}),
    };

    const shopId = existing ? existing._id : await ctx.db.insert("shops", {
      ...shopData,
      status: args.status || "pending",
      rating: 0,
      totalReviews: 0,
      totalRatingSum: 0,
    } as any);

    if (existing) {
      if (existing.ownerId !== args.ownerId) {
        shopData.ownerId = args.ownerId;
      }
      await ctx.db.patch(existing._id, {
        ...shopData,
        status: existing.status || args.status || "pending",
      });
    }

    // ── 1. Batch sync Services ──────────────────────────────────────────
    if (args.services) {
      // Clean sweep (purer than managing IDs in frontend)
      const oldServices = await ctx.db
        .query("services")
        .withIndex("by_shopId", (q) => q.eq("shopId", shopId))
        .collect();
      for (const s of oldServices) await ctx.db.delete(s._id);
      
      const summary = [];
      for (const s of args.services) {
        await ctx.db.insert("services", {
          shopId,
          name: s.name,
          price: s.price,
          duration: s.duration,
        });
        summary.push({ name: s.name, price: s.price });
      }

      // Update the denormalized summary for architectural performance
      await ctx.db.patch(shopId, { servicesSummary: summary });
    }

    // ── 2. Batch sync Blocked Dates ─────────────────────────────────────
    if (args.blockedDates) {
      const oldBlocked = await ctx.db
        .query("blockedDates")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      for (const b of oldBlocked) await ctx.db.delete(b._id);

      for (const b of args.blockedDates) {
        await ctx.db.insert("blockedDates", {
          shopId,
          date: b.date,
          reason: b.reason,
        });
      }
    }

    return shopId;
  },
});

// Credentials-based login for shop owners
export const loginShopOwner = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    const shop = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (!shop || !shop.password) {
      return { success: false, error: "Invalid username or password." };
    }

    let isMatch = false;
    const storedPassword = shop.password;

    // 1. Try standard bcrypt comparison
    if (storedPassword.startsWith("$2a$")) {
      isMatch = await bcrypt.compare(args.password, storedPassword);
    } else {
      // 2. Legacy plaintext comparison (Lazy Migration)
      isMatch = storedPassword === args.password;
      
      if (isMatch) {
        // Automatically upgrade to hashed password
        const newHash = await bcrypt.hash(args.password, 10);
        await ctx.db.patch(shop._id, { password: newHash });
      }
    }

    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    if (shop.status === "pending") {
      return { success: false, error: "pending" };
    }

    if (shop.status === "rejected") {
      return { success: false, error: "Your account has been rejected." };
    }

    // Return shop data without sensitive fields
    const { password: _pw, username: _un, ...safeShop } = shop as any;
    return { success: true, shop: safeShop };
  },
});

export const getShopById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop) return null;

    const services = await ctx.db
      .query("services")
      .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
      .collect();

    return { ...shop, services };
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) throw new Error("Shop not found for ownerId: " + args.ownerId);
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (!shop.firebaseUid.startsWith("owner-")) {
        throw new Error("Unauthorized");
      }
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) return true; // fallback: treat as open if shop not synced yet
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (!shop.firebaseUid.startsWith("owner-")) {
        throw new Error("Unauthorized");
      }
    }
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
    };
  },
});

export const getAvailableSlots = query({
  args: { shopId: v.id("shops"), date: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive) return [];

    const openMins = timeToMins(shop.openTime || "09:00");
    const closeMins = timeToMins(shop.closeTime || "21:00");
    const duration = shop.slotDuration || 30;
    const maxCapacity = shop.maxBookingsPerSlot || 1;
    const now = Date.now();

    // 1. Get blocked dates
    const blockedDatesRaw = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    
    let isBlockedDate = blockedDatesRaw.length > 0;
    if (isBlockedDate) return [];

    // 2. Get existing bookings for this date to determine availability

    // 3. Get existing bookings for this date to determine availability
    const slotBookings = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => q.eq("shopId", args.shopId).eq("date", args.date))
      .collect();
    
    const bookingMap = new Map(slotBookings.map(sb => [sb.time, sb.bookedCount]));

    // 3. Generate slots
    const slots = [];
    for (let m = openMins; m < closeMins; m += duration) {
      const time24 = minsToTime24(m);
      
      // Determine status
      let status: "available" | "booked" | "break" | "past" | "closed" = "available";
      
      if (isPastTime(args.date, time24, now)) {
        status = "past";
      } else if (shop.breakTime && isDuring(time24, shop.breakTime.start, shop.breakTime.end)) {
        status = "break";
      } else {
        const bookedCount = bookingMap.get(time24) || 0;
        if (bookedCount >= maxCapacity) {
          status = "booked";
        }
      }

      slots.push({
        time: time24,
        status,
        available: status === "available"
      });
    }

    return slots;
  },
});

export const checkSlotAvailable = query({
  args: { shopId: v.id("shops"), date: v.string(), time: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive || shop.isOpen === false) {
      return { available: false, reason: "Shop is closed." };
    }

    const now = Date.now();
    
    // 1. Past check
    if (isPastTime(args.date, args.time, now)) {
      return { available: false, reason: "This time has already passed." };
    }

    // 2. Working hours check
    if (!isDuring(args.time, shop.openTime || "09:00", shop.closeTime || "21:00")) {
      return { available: false, reason: "Shop is closed at this time." };
    }

    // 3. Blocked dates check
    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    if (blockedDates.length > 0) return { available: false, reason: "Date is blocked." };

    // 4. Break time check
    if (shop.breakTime && isDuring(args.time, shop.breakTime.start, shop.breakTime.end)) {
      return { available: false, reason: "Shop is on break." };
    }

    // 5. Capacity check
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
