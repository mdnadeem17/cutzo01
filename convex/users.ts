import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    role: v.union(v.literal("customer"), v.literal("shop_owner")),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      name: args.name,
      phone: args.phone,
      email: args.email,
      role: args.role,
      location: args.location,
    });
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
