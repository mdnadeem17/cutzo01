import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all active shops
export const getShops = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get trending shops (highest rated)
export const getTrendingShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    return shops
      .sort((a, b) => b.rating - a.rating || b.totalReviews - a.totalReviews)
      .slice(0, 10);
  },
});

// Get nearby shops using Haversine formula
export const getNearbyShops = query({
  args: { 
    lat: v.number(), 
    lng: v.number(), 
    radiusInKm: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
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

    const radius = args.radiusInKm ?? 10; // Default 10km search
    return nearbyShops
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  },
});

export const createShop = mutation({
  args: {
    ownerId: v.id("users"),
    shopName: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shops", {
      ownerId: args.ownerId,
      shopName: args.shopName,
      address: args.address,
      location: { lat: args.lat, lng: args.lng },
      rating: 0,
      totalReviews: 0,
      isActive: true,
    });
  },
});

export const getShopById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shopId);
  },
});
