import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./rateLimit";

// Submit a review for a completed booking.
// Uses string-based customerId (matching our booking system).
export const submitReview = mutation({
  args: {
    customerId: v.string(),    // local customer userId string
    customerName: v.string(),  // for universal display
    shopId: v.id("shops"),
    bookingId: v.id("bookings"),
    rating: v.number(),        // 1–5
    reviewText: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.customerId) throw new Error("Unauthorized");

    await checkRateLimit(ctx, identity.subject, "submitReview", 5, 24 * 60 * 60 * 1000); // 5 per day

    // ── 1. Validate rating range ───────────────────────────────────────────
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    // ── 2. Verify booking belongs to the caller ────────────────────────────
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.customerId !== args.customerId) {
      throw new Error("Unauthorized: you can only review your own bookings.");
    }
    if (booking.status !== "completed") {
      throw new Error("You can only review completed bookings.");
    }

    // ── 3. Check shop exists ───────────────────────────────────────────────
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found.");

    // ── 4. Insert the review using a userId placeholder ────────────────────
    // The reviews table uses v.id("users"), but we use string-based customerIds.
    // We store the review in the slotBookings-style approach via the reviews table
    // using the first available user id, or we work around it.
    // Since our reviews table's userId is v.id("users"), and we have a separate
    // customers table, we use a workaround: store in the bookings record as metadata
    // and update shop rating directly.

    // Update shop rating atomically using sum-based averaging to prevent drift
    const newTotalReviews = (shop.totalReviews || 0) + 1;
    const newTotalSum = (shop.totalRatingSum || (shop.rating * shop.totalReviews)) + args.rating;
    const newRating = newTotalSum / newTotalReviews;

    // Actually insert the universal review doc
    await ctx.db.insert("reviews", {
      customerId: args.customerId,
      customerName: args.customerName,
      shopId: args.shopId,
      rating: args.rating,
      reviewText: args.reviewText,
      tags: args.tags || [],
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.shopId, {
      rating: Math.round(newRating * 10) / 10,
      totalReviews: newTotalReviews,
      totalRatingSum: newTotalSum,
    });

    // Mark the booking as reviewed (store rating in completedAt field, or patch status)
    // We add a notification for the shop owner
    try {
      await ctx.db.insert("notifications", {
        userId: shop.ownerId,
        title: "New Review Received",
        message: `A customer rated your shop ${args.rating}/5 stars. "${args.reviewText.slice(0, 80)}"`,
        type: "review",
        isRead: false,
        createdAt: Date.now(),
      });
    } catch {
      // non-critical
    }

    return { success: true };
  },
});

// Get reviews submitted by a customer (to know which bookings were reviewed)
export const getReviewsByCustomer = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.customerId) throw new Error("Unauthorized");

    // We track reviews by looking for bookings that are completed and
    // their booking IDs were used in review submission.
    // Since we don't have a separate reviews table keyed by customerId,
    // we return an empty array — the UI will use local state for reviewed IDs.
    return [] as { bookingId: string }[];
  },
});

// Original addReview mutation — kept for backward compatibility
// Uses v.id("users") — only callable from systems with a users table
export const addReview = mutation({
  args: {
    userId: v.id("users"),
    shopId: v.id("shops"),
    rating: v.number(),
    reviewText: v.string(),
    callerUid: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.callerUid) throw new Error("Unauthorized");

    const user = await ctx.db.get(args.userId);
    if (!user || user.uid !== args.callerUid) {
      throw new Error("Unauthorized: you cannot post a review as another user.");
    }

    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    const existingReview = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .first();

    if (existingReview) {
      throw new Error("You have already reviewed this shop.");
    }

    const reviewId = await ctx.db.insert("reviews", {
      userId: args.userId,
      shopId: args.shopId,
      rating: args.rating,
      reviewText: args.reviewText,
    });

    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    const newTotalReviews = (shop.totalReviews || 0) + 1;
    const newTotalSum = (shop.totalRatingSum || (shop.rating * shop.totalReviews)) + args.rating;
    const newRating = newTotalSum / newTotalReviews;

    await ctx.db.patch(args.shopId, {
      rating: Math.round(newRating * 10) / 10,
      totalReviews: newTotalReviews,
      totalRatingSum: newTotalSum,
    });

    return reviewId;
  },
});

// Get reviews for a specific shop (public endpoint)
export const getShopReviews = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .collect();
  },
});

// Get all reviews for universal load
export const getAllReviews = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reviews").collect();
  },
});
