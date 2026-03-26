"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import bcrypt from "bcryptjs";

export const upsertShop = action({
  args: {
    ownerId: v.string(),
    shopName: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    startingPrice: v.optional(v.number()),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    slotDuration: v.optional(v.number()),
    maxBookingsPerSlot: v.optional(v.number()),
    breakTime: v.optional(v.object({
      start: v.string(),
      end: v.string(),
    })),
    nextSlot: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    firebaseUid: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    services: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      duration: v.number(),
    }))),
    blockedDates: v.optional(v.array(v.object({
      date: v.string(),
      reason: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Hash password if provided and not already hashed
    let hashedPassword = args.password;
    if (args.password && !args.password.startsWith("$2a$")) {
      hashedPassword = await bcrypt.hash(args.password, 10);
    }

    return await ctx.runMutation(internal.shops.upsertShopInternal, {
      ...args,
      password: hashedPassword,
    });
  },
});

export const loginShopOwner = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const shop: any = await ctx.runQuery(internal.shops.getShopForLogin, {
      username: args.username,
    });

    if (!shop || !shop.password) {
      return { success: false, error: "Invalid username or password." };
    }

    let isMatch = false;
    const storedPassword = shop.password;

    // 1. Try standard bcrypt comparison
    if (storedPassword.startsWith("$2a$")) {
      isMatch = await bcrypt.compare(args.password, storedPassword);
    } else {
      // 2. Legacy plaintext comparison (Lazy Migration)
      isMatch = storedPassword === args.password;
      
      if (isMatch) {
        // Automatically upgrade to hashed password
        const newHash = await bcrypt.hash(args.password, 10);
        await ctx.runMutation(internal.shops.patchShopPassword, {
          shopId: shop._id,
          password: newHash,
        });
      }
    }

    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    if (shop.status === "pending") {
      return { success: false, error: "pending" };
    }

    if (shop.status === "rejected") {
      return { success: false, error: "Your account has been rejected." };
    }

    // Return shop data without sensitive fields
    const { password: _pw, username: _un, ...safeShop } = shop;
    return { success: true, shop: safeShop };
  },
});
