import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── SAVED SHOPS ─────────────────────────────────────────────────────────

export const toggleSavedShop = mutation({
  args: {
    userId: v.string(),
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("savedShops")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      await ctx.db.insert("savedShops", {
        userId: args.userId,
        shopId: args.shopId,
      });
      return { saved: true };
    }
  },
});

export const getSavedShops = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");

    const records = await ctx.db
      .query("savedShops")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const shops = [];
    for (const record of records) {
      const shop = await ctx.db.get(record.shopId);
      if (shop) {
        shops.push({
          ...shop,
          savedAppId: record._id, // to remove if needed
        });
      }
    }
    return shops;
  },
});

export const removeSavedShop = mutation({
  args: { savedId: v.id("savedShops") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const saved = await ctx.db.get(args.savedId);
    if (!saved) throw new Error("Saved shop not found");
    if (saved.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.delete(args.savedId);
  },
});

// ─── OFFERS ──────────────────────────────────────────────────────────────

export const getActiveOffers = query({
  args: { city: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const nowIso = new Date().toISOString();
    if (args.city) {
      // DB-05 FIX: Use the compound index to filter by city AND expiry at DB level.
      // This avoids fetching all offers for a city and filtering them in memory.
      const cityOffers = await ctx.db
        .query("offers")
        .withIndex("by_city_expiry", (q) =>
          q.eq("city", args.city!).gte("expiryDate", nowIso)
        )
        .collect();
      if (cityOffers.length > 0) return cityOffers;
    }
    // Fallback: return any global offers that haven't expired
    const globalOffers = await ctx.db
      .query("offers")
      .withIndex("by_city_expiry", (q) =>
        q.eq("city", "Global").gte("expiryDate", nowIso)
      )
      .take(20);
    return globalOffers;
  },
});

// SEC-08 FIX: Changed from public mutation to internalMutation.
// Previously any authenticated user could call this to inject arbitrary offers.
// Now it can only be triggered from server-side code (cron jobs, internal actions).
export const seedOffers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("offers").take(1);
    if (existing.length === 0) {
      await ctx.db.insert("offers", {
        title: "Welcome Bonus",
        discount: "20% OFF",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        city: "Global",
        applicableShops: [],
      });
      await ctx.db.insert("offers", {
        title: "Weekend Special",
        discount: "₹50 Cashback",
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        city: "Global",
        applicableShops: [],
      });
    }
  },
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────

import { paginationOptsValidator } from "convex/server";

export const getUserNotifications = query({
  args: { 
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc") // newest first
      .paginate(args.paginationOpts);
  },
});

export const seedNotifications = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(1);
    
    if (existing.length === 0) {
      await ctx.db.insert("notifications", {
        userId: args.userId,
        title: "Welcome to CUTZO",
        message: "Your profile is set up successfully. Book your first haircut now!",
        type: "system",
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.delete(args.notificationId);
  },
});

export const clearUserNotifications = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");

    // BUG-06 FIX: Convex mutations have a transaction document limit.
    // We delete in batches of 100 per call and return `hasMore: true`
    // so the frontend can call this again until all notifications are gone.
    const BATCH_SIZE = 100;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(BATCH_SIZE);
    
    for (const n of notifications) {
      await ctx.db.delete(n._id);
    }

    // If we filled the full batch there may be more remaining
    return { hasMore: notifications.length === BATCH_SIZE };
  },
});

