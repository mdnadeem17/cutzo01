import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a review and atomically update shop rating
export const addReview = mutation({
  args: {
    userId: v.id("users"),
    shopId: v.id("shops"),
    rating: v.number(), // Assume 1-5 scale
    reviewText: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify user actually completed a booking at this shop
    const userBookingsAtShop = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    if (userBookingsAtShop.length === 0) {
      throw new Error("You must have completed a booking at this shop to leave a review.");
    }

    // 2. Add the review
    const reviewId = await ctx.db.insert("reviews", {
      userId: args.userId,
      shopId: args.shopId,
      rating: args.rating,
      reviewText: args.reviewText,
    });

    // 3. Update shop global rating
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    const newTotalReviews = shop.totalReviews + 1;
    const newRating = (shop.rating * shop.totalReviews + args.rating) / newTotalReviews;

    // Apply the update to the shop record
    await ctx.db.patch(args.shopId, {
      rating: newRating,
      totalReviews: newTotalReviews,
    });

    return reviewId;
  },
});

// Get reviews for a specific shop
export const getShopReviews = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .collect();
  },
});
