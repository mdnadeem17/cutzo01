import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    uid: v.string(),
    name: v.string(),
    location: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        name: args.name,
        location: args.location,
        phone: args.phone,
      });
      return existing._id;
    }

    // Insert new user
    return await ctx.db.insert("users", {
      uid: args.uid,
      name: args.name,
      email: args.email,
      location: args.location,
      phone: args.phone,
      role: "customer",
    });
  },
});

export const getUserById = query({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();
  },
});
