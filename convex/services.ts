import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all services for a particular shop
export const getShopServices = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .collect();
  },
});

// Add a service
export const addService = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.string(),
    price: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("services", {
      shopId: args.shopId,
      name: args.name,
      price: args.price,
      duration: args.duration,
    });
  },
});

// Update a service
export const updateService = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { serviceId, ...rest } = args;
    await ctx.db.patch(serviceId, rest);
    return true;
  },
});

// Delete a service
export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.serviceId);
    return true;
  },
});
