import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = mutation({
  args: {
    uid: v.string(), // Firebase UID
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
    role: v.optional(v.union(v.literal("customer"), v.literal("shop_owner"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.uid) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();

    const data = {
      uid: args.uid,
      firebaseUid: args.uid, // Align both for consistency
      name: args.name,
      email: args.email,
      phone: args.phone,
      location: args.location,
      gpsLocation: args.gpsLocation,
      role: args.role ?? (existing?.role || "customer"),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...data,
      createdAt: new Date().toISOString(),
    });
  },
});

export const getUserByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.uid) throw new Error("Unauthorized");

    return await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();
  },
});
export const deleteUserAccount = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.uid) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();

    if (!user) throw new Error("User not found");

    // LEG-07 FIX: Delete personal data to comply with "Right to Erasure"
    // Here we hard-delete the user record containing PII.
    // In a full implementation, you would also delete or anonymize related
    // bookings, reviews, and notifications in a background job or here.
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
