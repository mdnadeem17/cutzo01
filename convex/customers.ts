import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Look up a customer profile by their Firebase Auth UID.
 * Returns null if the user has not completed profile setup yet.
 */
export const getCustomerByFirebaseUid = query({
  args: { firebaseUid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .first();
  },
});

/**
 * Create or update a customer profile linked to a Firebase UID.
 * Safe to call multiple times — will update if the record already exists.
 */
export const upsertCustomer = mutation({
  args: {
    firebaseUid: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    location: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        phone: args.phone,
        location: args.location,
        gpsLocation: args.gpsLocation,
      });
      return existing._id;
    }

    return await ctx.db.insert("customers", {
      firebaseUid: args.firebaseUid,
      email: args.email,
      name: args.name,
      phone: args.phone,
      location: args.location,
      gpsLocation: args.gpsLocation,
      createdAt: new Date().toISOString(),
    });
  },
});
