"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const upsertShop = action({
  args: {
    ownerId: v.string(),
    shopName: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
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

    // Allow migration from legacy owner-style UIDs
    const incomingUid = args.firebaseUid;
    const isLegacy = incomingUid?.startsWith("owner-");
    const finalFirebaseUid = isLegacy ? identity.subject : (incomingUid || identity.subject);

    // Strict ownership check: prevent creating/updating a shop for another user
    if (finalFirebaseUid !== identity.subject) {
      throw new Error("Unauthorized: Identity mismatch");
    }

    // Hash password if provided and not already hashed
    let hashedPassword = args.password;
    if (args.password && !args.password.startsWith("$2")) {
      hashedPassword = await bcrypt.hash(args.password, 10);
    }

    return await ctx.runMutation(internal.shops.upsertShopInternal, {
      ...args,
      firebaseUid: finalFirebaseUid,
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

    // 1. Try standard bcrypt comparison ($2a$, $2b$, $2y$)
    if (storedPassword.startsWith("$2")) {
      isMatch = await bcrypt.compare(args.password, storedPassword);
      
      // Secondary check: for accounts created while the double-hashing bug was active.
      // (Client sent SHA-256 string, server bcrypt-ed that SHA-256 string).
      if (!isMatch) {
        const doubleHashedFallback = crypto.createHash("sha256").update(args.password).digest("hex");
        isMatch = await bcrypt.compare(doubleHashedFallback, storedPassword);

        // If it worked, we auto-upgrade them to standard bcrypt immediately!
        if (isMatch) {
          const newHash = await bcrypt.hash(args.password, 10);
          await ctx.runMutation(internal.shops.patchShopPassword, {
            shopId: shop._id,
            password: newHash,
          });
        }
      }
    } else {
      // 2. Legacy plaintext comparison
      isMatch = storedPassword === args.password;
      
      // 3. Legacy SHA-256 hex comparison (from previous client-side hashing behavior)
      if (!isMatch && storedPassword.length === 64) {
        const sha256Hash = crypto.createHash("sha256").update(args.password).digest("hex");
        isMatch = storedPassword === sha256Hash;
      }
      
      if (isMatch) {
        // Automatically upgrade to bcrypt hash once they succeed
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

    // Lazy Migration: Sync current Firebase Auth token to the shop so subsequent queries pass
    let updatedFirebaseUid = shop.firebaseUid;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity && shop.firebaseUid !== identity.subject) {
        await ctx.runMutation(internal.shops.patchShopFirebaseUid, {
          shopId: shop._id,
          firebaseUid: identity.subject,
        });
        // BUG 5 FIX: do NOT mutate frozen Convex document; track new value locally instead
        updatedFirebaseUid = identity.subject;
      }
    } catch(e) {
      // Ignore auth errors if they aren't signed in to firebase yet
    }

    // Return shop data without sensitive fields
    // FIX #14: Ensure shop password hash and other internal fields specifically are never leaked.
    const { password: _pw, passwordHash: _ph, ...safeShopBase } = shop;
    const safeShop = { ...safeShopBase, firebaseUid: updatedFirebaseUid };
    return { success: true, shop: safeShop };
  },
});
