import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Delete notifications older than 30 days
export const cleanupNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // We fetch a batch of 500 to stay within transaction limits
    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", thirtyDaysAgo))
      .take(500);

    for (const notif of oldNotifications) {
      await ctx.db.delete(notif._id);
    }
  },
});

// Delete old slot bookings (past dates)
export const cleanupSlotBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    // We define "old" as older than 7 days based on the 'date' string (YYYY-MM-DD)
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldDateStr = sevenDaysAgoDate.toISOString().split("T")[0];

    // No fast index on date alone, but there shouldn't be millions of these
    const oldSlots = await ctx.db
      .query("slotBookings")
      .filter(q => q.lt(q.field("date"), oldDateStr))
      .take(500);

    for (const slot of oldSlots) {
      await ctx.db.delete(slot._id);
    }
  },
});

// Delete expired OTPs
export const cleanupOtps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find OTCs that expired before now
    const expiredOtps = await ctx.db
      .query("otps")
      .filter(q => q.lt(q.field("expiresAt"), now))
      .take(500);

    for (const otp of expiredOtps) {
      await ctx.db.delete(otp._id);
    }
  },
});

// Delete old rate limits (older than 2 hours)
export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    
    const oldLogs = await ctx.db
      .query("rateLimits")
      .filter(q => q.lt(q.field("timestamp"), twoHoursAgo))
      .take(500);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
  },
});
