import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    role: v.union(v.literal("customer"), v.literal("shop_owner")),
    location: v.optional(v.string()),
  }),

  shops: defineTable({
    ownerId: v.id("users"),
    shopName: v.string(),
    address: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    rating: v.number(),
    totalReviews: v.number(),
    isActive: v.boolean(),
  }),

  services: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    price: v.number(),
    duration: v.number(),
  }),

  bookings: defineTable({
    userId: v.id("users"),
    shopId: v.id("shops"),
    serviceId: v.id("services"),
    date: v.string(),
    time: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  }),

  reviews: defineTable({
    userId: v.id("users"),
    shopId: v.id("shops"),
    rating: v.number(),
    reviewText: v.string(),
  }),

  otps: defineTable({
    phone: v.string(),
    otp: v.string(),
    expiresAt: v.number(), // timestamp
  }).index("by_phone", ["phone"]),
});
