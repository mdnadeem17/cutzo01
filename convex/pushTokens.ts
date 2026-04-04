import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Register FCM Token for a customer user by their Firebase UID
export const registerCustomerToken = mutation({
  args: { token: v.string(), uid: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();
      
    if (user) {
      await ctx.db.patch(user._id, { fcmToken: args.token });
      console.log(`[FCM] Registered customer token for uid=${args.uid}`);
    } else {
      console.warn(`[FCM] No user found for uid=${args.uid}`);
    }
  },
});

// Register FCM Token for a shop owner by their ownerId
export const registerVendorToken = mutation({
  args: { token: v.string(), ownerId: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
      
    if (shop) {
      await ctx.db.patch(shop._id, { fcmToken: args.token });
      console.log(`[FCM] Registered vendor token for ownerId=${args.ownerId}`);
    } else {
      console.warn(`[FCM] No shop found for ownerId=${args.ownerId}`);
    }
  },
});

// Legacy: keep old name as no-op so existing imports don't break
export const registerToken = mutation({
  args: { token: v.string(), isVendor: v.optional(v.boolean()) },
  handler: async (_ctx, _args) => {
    // Replaced by registerCustomerToken / registerVendorToken
  },
});
