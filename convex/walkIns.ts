import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper to fetch consolidated active sessions for a shop
async function getActiveSessions(ctx: any, shopId: string) {
  const walkIns = await ctx.db
    .query("walkIns")
    .withIndex("by_shop", (q: any) => q.eq("shopId", shopId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_shop", (q: any) => q.eq("shopId", shopId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  const sessions = [];

  for (const w of walkIns) {
    sessions.push({
      id: w._id,
      type: "walk-in",
      serviceName: w.serviceName,
      startTime: w.startTime,
      busyUntil: w.calculatedFinishTime,
    });
  }

  for (const b of bookings) {
    const totalDuration = b.services.reduce((acc: number, s: any) => acc + s.duration, 0) || 30;
    // OTP verification marks it active, estimate start time is roughly otpCreatedAt or now
    const startTime = b.otpCreatedAt || Date.now();
    const busyUntil = startTime + (totalDuration * 60 * 1000);
    sessions.push({
      id: b._id,
      type: "online",
      serviceName: b.services.map((s: any) => s.name).join(", "),
      startTime: startTime,
      busyUntil: busyUntil,
    });
  }

  return sessions.sort((a, b) => a.busyUntil - b.busyUntil);
}

// Get the current capacity and status of the shop
export const getBarberStatus = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
      
    if (!shop) return { 
      currentStatus: "idle", 
      capacity: { total: 1, occupied: 0 },
      busyUntil: 0,
      activeSessions: []
    };

    const maxSeats = shop.maxBookingsPerSlot || 1;
    const sessions = await getActiveSessions(ctx, shop._id);
    
    // Auto-clean stale statuses might still be required, but we calculate pure capacity here
    const isBusy = sessions.length >= maxSeats;
    const nextFreeTime = isBusy ? Math.min(...sessions.map(s => s.busyUntil)) : 0;

    return {
      currentStatus: isBusy ? "busy" : "idle",
      capacity: { total: maxSeats, occupied: sessions.length },
      busyUntil: nextFreeTime,
      activeSessions: sessions,
    };
  },
});

// Used by customer app? Keep it consistent.
export const getBarberStatusByShopId = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop) return { 
      currentStatus: "idle", 
      capacity: { total: 1, occupied: 0 },
      busyUntil: 0,
      activeSessions: []
    };

    const maxSeats = shop.maxBookingsPerSlot || 1;
    const sessions = await getActiveSessions(ctx, shop._id);
    const isBusy = sessions.length >= maxSeats;
    const nextFreeTime = isBusy ? Math.min(...sessions.map(s => s.busyUntil)) : 0;

    return {
      currentStatus: isBusy ? "busy" : "idle",
      capacity: { total: maxSeats, occupied: sessions.length },
      busyUntil: nextFreeTime,
      activeSessions: sessions,
    };
  },
});

// Start a walk-in service
export const startWalkIn = mutation({
  args: {
    ownerId: v.string(),
    serviceName: v.string(),
    estimatedDuration: v.number(), // in minutes
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
    if (!shop) throw new Error("Shop not found");

    if (identity.subject !== shop.firebaseUid && identity.subject !== shop.ownerId) {
      throw new Error("Unauthorized: you can only start a walk-in for your own shop.");
    }

    // Capacity math check
    const maxSeats = shop.maxBookingsPerSlot || 1;
    const walkIns = await ctx.db
      .query("walkIns")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const currentOccupied = walkIns.length + bookings.length;

    if (currentOccupied >= maxSeats) {
      throw new Error(`Shop capacity full. You only have ${maxSeats} seat(s) available.`);
    }

    const now = Date.now();
    const busyUntil = now + (args.estimatedDuration * 60 * 1000);

    const walkInId = await ctx.db.insert("walkIns", {
      shopId: shop._id,
      serviceName: args.serviceName,
      startTime: now,
      estimatedDuration: args.estimatedDuration,
      calculatedFinishTime: busyUntil,
      status: "active",
    });

    return walkInId;
  },
});

// specific Walk-In finisher (now takes the walkInId instead of assuming 1 global)
export const finishWalkIn = mutation({
  args: { 
    ownerId: v.string(),
    walkInId: v.id("walkIns") // ADDED TARGET ID
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
    if (!shop) throw new Error("Shop not found");

    if (identity.subject !== shop.firebaseUid && identity.subject !== shop.ownerId) {
      throw new Error("Unauthorized: you can only finish services for your own shop.");
    }

    const walkIn = await ctx.db.get(args.walkInId);
    if (!walkIn || walkIn.shopId !== shop._id) {
      throw new Error("Walk-in record not found.");
    }

    await ctx.db.patch(args.walkInId, { status: "completed" });
    
    return true;
  },
});

// Cancel Walk-In (if created by mistake)
export const cancelWalkIn = mutation({
  args: { 
    ownerId: v.string(),
    walkInId: v.id("walkIns") 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
    if (!shop) throw new Error("Shop not found");

    if (identity.subject !== shop.firebaseUid && identity.subject !== shop.ownerId) {
      throw new Error("Unauthorized: you can only cancel services for your own shop.");
    }

    const walkIn = await ctx.db.get(args.walkInId);
    if (!walkIn || walkIn.shopId !== shop._id) {
      throw new Error("Walk-in record not found.");
    }

    // Hard delete or mark cancelled so it stops occupying capacity
    await ctx.db.delete(args.walkInId);
    
    return true;
  },
});

// Legacy auto-cleaner
export const expireStaleBarberStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Only cleans old walkIns now since barberStatus table is deprecated
    const now = Date.now();
    const staleWalkIns = await ctx.db
      .query("walkIns")
      .filter((q) => q.and(
        q.eq(q.field("status"), "active"),
        q.lt(q.field("calculatedFinishTime"), now - (60 * 60 * 1000)) // 1 hour past expiry
      ))
      .collect();

    for (const w of staleWalkIns) {
      await ctx.db.patch(w._id, { status: "completed" });
    }
  },
});
