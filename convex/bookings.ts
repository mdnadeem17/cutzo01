import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new booking
export const createBooking = mutation({
  args: {
    userId: v.id("users"),
    shopId: v.id("shops"),
    serviceId: v.id("services"),
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // HH:MM
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bookings", {
      userId: args.userId,
      shopId: args.shopId,
      serviceId: args.serviceId,
      date: args.date,
      time: args.time,
      status: "pending",
    });
  },
});

// Get bookings for a specific customer
export const getUserBookings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

// Get bookings for a specific shop
export const getShopBookings = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .collect();
  },
});

// Update the booking status
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, { status: args.status });
    return true;
  },
});
