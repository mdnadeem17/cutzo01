import { mutation, query } from "./_generated/server";
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
      // Return specific to city
      const cityOffers = await ctx.db
        .query("offers")
        .withIndex("by_city", (q) => q.eq("city", args.city))
        .collect();
      
      // Bug 14: filter out expired offers before returning
      const activeCity = cityOffers.filter(o => o.expiryDate > nowIso);
      if (activeCity.length > 0) return activeCity;
    }
    // Fallback: return any global or local offers that haven't expired
    const all = await ctx.db.query("offers").take(20);
    return all.filter(o => o.expiryDate > nowIso);
  },
});

export const seedOffers = mutation({
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
        title: "Welcome to TRIMO",
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

    // Bug 10: use .take(100) to avoid hitting transaction limits for users
    // with large numbers of notifications. 100 is a safe practical cap.
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(100);
    
    for (const n of notifications) {
      await ctx.db.delete(n._id);
    }
  },
});
