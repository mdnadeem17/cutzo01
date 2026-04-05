import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { timeToMins, minsToTime24, isPastTime, isDuring } from "./utils";

// Get all active shops (used by customer listing)
export const getShops = query({
  args: {},
  handler: async (ctx) => {
    // Bug 2 Fix: use by_status index instead of full table filter scan
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_status", (q) =>
        q.eq("status", "approved").eq("isActive", true)
      )
      // FIX #9: neq(false) excludes undefined — use explicit or() to include legacy shops without isOpen set
      .filter((q) => q.or(q.eq(q.field("isOpen"), true), q.eq(q.field("isOpen"), undefined)))
      .take(500);
    
    return await Promise.all(shops.map(async shop => ({
      ...shop,
      services: shop.servicesSummary || [],
      image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
    })));
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
      
    const authorizedShops = shops.filter(s => {
      return s.firebaseUid === identity.subject || s.ownerId === identity.subject;
    });
    if (shops.length > 0 && authorizedShops.length === 0) throw new Error("Unauthorized");
    
    return await Promise.all(authorizedShops.map(async shop => ({
      ...shop,
      image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
    })));
  },
});

export const getShopByFirebaseUid = query({
  args: { firebaseUid: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.firebaseUid) throw new Error("Unauthorized");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .first();
    if (!shop) return null;
    return {
      ...shop,
      image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
    };
  },
});

// Get trending shops (highest rated)
export const getTrendingShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_status", (q) =>
        q.eq("status", "approved").eq("isActive", true)
      )
      .filter((q) => q.or(q.eq(q.field("isOpen"), true), q.eq(q.field("isOpen"), undefined)))
      .take(500);

    const topShops = shops
      .sort((a, b) => b.rating - a.rating || b.totalReviews - a.totalReviews)
      .slice(0, 10);
      
    return await Promise.all(topShops.map(async shop => ({
        ...shop,
        services: shop.servicesSummary || [],
        image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
      })));
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
      .withIndex("by_status", (q) =>
        q.eq("status", "approved").eq("isActive", true)
      )
      .filter((q) => q.or(q.eq(q.field("isOpen"), true), q.eq(q.field("isOpen"), undefined)))
      .take(500);

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
    const filtered = nearbyShops
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return await Promise.all(filtered.map(async shop => ({
        ...shop,
        services: shop.servicesSummary || [],
        image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
      })));
  },
});

// Internal mutation for upserting a shop (called by auth_actions.ts)
export const upsertShopInternal = internalMutation({
  args: {
    ownerId: v.string(),
    shopName: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.optional(v.string()),
    image: v.optional(v.string()), // Kept for backwards compat
    imageStorageId: v.optional(v.id("_storage")),
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
    password: v.optional(v.string()), // Hashed password passed from action
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

    const shopData: Record<string, any> = {
      ownerId: args.ownerId,
      shopName: args.shopName,
      address: args.address,
      // FIX #7: location is applied conditionally below — skip here
      isActive: true,
      phone: args.phone,
      image: args.image,
      ...(args.imageStorageId ? { imageStorageId: args.imageStorageId } : {}),
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
      ...(args.password ? { password: args.password } : {}),
      // FIX #7: Only overwrite location if we have valid non-zero coordinates
      ...(args.lat !== 0 || args.lng !== 0 ? { location: { lat: args.lat, lng: args.lng } } : {}),
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

    if (args.services) {
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
      await ctx.db.patch(shopId, { servicesSummary: summary });
    }

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

// Internal mutation to patch shop password (called by auth_actions login for lazy migration)
export const patchShopPassword = internalMutation({
  args: { shopId: v.id("shops"), password: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shopId, { password: args.password });
  },
});

export const patchShopFirebaseUid = internalMutation({
  args: { shopId: v.id("shops"), firebaseUid: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shopId, { firebaseUid: args.firebaseUid });
  },
});

/**
 * Secures the current Firebase Auth session to a shop record.
 * Called after a successful username/password login to ensure subsequent 
 * real-time queries (which use JWT auth) work correctly.
 */
export const syncShopOwnerUid = mutation({
  args: { shopId: v.id("shops"), ownerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // If there's no auth token, we can't link anything.
      return { success: false, reason: "No active auth token" };
    }

    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    // Authorization: Prove the client actually has the credentials for this shop
    // by matching the private ownerId returned during login.
    if (shop.ownerId !== args.ownerId) {
      throw new Error("Unauthorized: Owner ID mismatch");
    }

    await ctx.db.patch(args.shopId, { firebaseUid: identity.subject });
    return { success: true };
  },
});

// Internal query to get shop by username for login comparison
export const getShopForLogin = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    // Bug 6: use the by_username index instead of a full table scan
    return await ctx.db
      .query("shops")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
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

    return { 
      ...shop, 
      services,
      image: shop.imageStorageId ? await ctx.storage.getUrl(shop.imageStorageId) : shop.image,
    };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  // SEC-04 FIX: Only authenticated users may generate a storage upload URL.
  // Without this check, any anonymous caller could write arbitrary files to our storage.
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated: you must be logged in to upload files.");
  return await ctx.storage.generateUploadUrl();
});

// SEC-05 FIX: Changed from mutation to query — this only reads data and
// should never have been a mutation (wastes write credits, bypasses cache).
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});


// Get slots booking counts for a specific shop
export const getShopBookedSlots = query({
  args: {
    shopId: v.id("shops"),
    fromDate: v.optional(v.string()), // Accept a fromDate arg (YYYY-MM-DD)
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query("slotBookings")
      .withIndex("by_shop_date_time", (q) => 
        args.fromDate 
          ? q.eq("shopId", args.shopId).gte("date", args.fromDate)
          : q.eq("shopId", args.shopId)
      );

    return await query.collect();
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
    if (identity.subject !== shop.firebaseUid && identity.subject !== shop.ownerId) {
      throw new Error("Unauthorized");
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
    if (identity.subject !== shop.firebaseUid && identity.subject !== shop.ownerId) {
      throw new Error("Unauthorized");
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
  args: { shopId: v.id("shops"), date: v.string(), clientNow: v.optional(v.number()), timezoneOffset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive) return [];

    const openMins = timeToMins(shop.openTime || "09:00");
    const closeMins = timeToMins(shop.closeTime || "21:00");
    const duration = shop.slotDuration || 30;
    const maxCapacity = shop.maxBookingsPerSlot || 1;
    const now = args.clientNow ?? Date.now();
    const tzOffset = args.timezoneOffset ?? 0;

    // 1. Get real-time barber status
    const statusResult = await ctx.db
      .query("barberStatus")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .first();
    const busyUntil = statusResult?.currentStatus === "busy" ? statusResult.busyUntil : 0;
    const bufferTime = 5 * 60 * 1000;
    const [year, month, day] = args.date.split("-").map(Number);

    // 2. Get blocked dates
    const blockedDatesRaw = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    
    const isBlockedDate = blockedDatesRaw.length > 0;
    if (isBlockedDate) return [];

    // 2. Get existing bookings for this date to determine availability

    // 3. Get existing bookings for this date to determine availability
    const slotBookings = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => q.eq("shopId", args.shopId).eq("date", args.date))
      .collect();
    
    const bookingMap = new Map(slotBookings.map(sb => [sb.time, sb.bookedCount]));

    // 4. Generate slots
    const slots = [];
    for (let m = openMins; m < closeMins; m += duration) {
      const time24 = minsToTime24(m);
      
      const [h, min] = time24.split(":").map(Number);
      
      const slotStartTimestamp = Date.UTC(year, month - 1, day, h, min) + (tzOffset * 60000);
      
      // Determine status
      let status: "available" | "booked" | "break" | "past" | "closed" = "available";
      
      if (isPastTime(args.date, time24, now, tzOffset)) {
        status = "past";
      } else if (slotStartTimestamp < busyUntil + bufferTime && slotStartTimestamp + (duration * 60 * 1000) > Date.now()) {
        status = "booked"; // busy due to walk-in or current appointment + buffer
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
  args: { shopId: v.id("shops"), date: v.string(), time: v.string(), clientNow: v.optional(v.number()), timezoneOffset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || !shop.isActive || shop.isOpen === false) {
      return { available: false, reason: "Shop is closed." };
    }

    const now = args.clientNow ?? Date.now();
    const tzOffset = args.timezoneOffset ?? 0;
    
    // Convert 12h to 24h if necessary. In Cutzo, args.time might be "09:00 AM" if we use old logic, 
    // but looking at getAvailableSlots, we generate "HH:MM" (time24). Let's safely extract numbers
    const [year, month, day] = args.date.split("-").map(Number);
    const timeMatch = args.time.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
    let h = 0, min = 0;
    if (timeMatch) {
       h = parseInt(timeMatch[1], 10);
       min = parseInt(timeMatch[2], 10);
       if (timeMatch[3] && timeMatch[3].toUpperCase() === "PM" && h < 12) h += 12;
       if (timeMatch[3] && timeMatch[3].toUpperCase() === "AM" && h === 12) h = 0;
    }
    const slotStartTimestamp = Date.UTC(year, month - 1, day, h, min) + (tzOffset * 60000);
    
    // 1. Real-time status check
    const statusResult = await ctx.db
      .query("barberStatus")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .first();
    const busyUntil = statusResult?.currentStatus === "busy" ? statusResult.busyUntil : 0;
    const bufferTime = 5 * 60 * 1000;
    
    if (slotStartTimestamp < busyUntil + bufferTime && slotStartTimestamp + ((shop.slotDuration || 30) * 60 * 1000) > Date.now()) {
      return { available: false, reason: "Barber is currently busy until " + new Date(busyUntil).toLocaleTimeString() };
    }

    // 2. Past check
    if (isPastTime(args.date, args.time, now, tzOffset)) {
      return { available: false, reason: "This time has already passed." };
    }

    // 3. Working hours check
    if (!isDuring(args.time, shop.openTime || "09:00", shop.closeTime || "21:00")) {
      return { available: false, reason: "Shop is closed at this time." };
    }

    // 4. Blocked dates check
    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    if (blockedDates.length > 0) return { available: false, reason: "Date is blocked." };

    // 5. Break time check
    if (shop.breakTime && isDuring(args.time, shop.breakTime.start, shop.breakTime.end)) {
      return { available: false, reason: "Shop is on break." };
    }

    // 6. Capacity check
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

