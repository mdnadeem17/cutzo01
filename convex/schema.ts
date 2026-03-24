import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    uid: v.string(), // Firebase UID
    name: v.string(),
    email: v.string(),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal("customer"), v.literal("shop_owner"))),
  }).index("by_uid", ["uid"]),

  // Customer profiles linked to Firebase Auth UID
  customers: defineTable({
    firebaseUid: v.string(),      // Firebase Auth uid (stable across sessions)
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    location: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_firebase_uid", ["firebaseUid"]),

  shops: defineTable({
    ownerId: v.string(), // local userId from localStorage (e.g. "owner-1234")
    shopName: v.string(),
    address: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    rating: v.number(),
    totalReviews: v.number(),
    isActive: v.boolean(),
    isOpen: v.optional(v.boolean()), // Owner-controlled: accepts bookings right now?
    // Extended fields for customer listing
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    servicesJson: v.optional(v.string()), // JSON stringified VendorService[]
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
    availabilitySlotsJson: v.optional(v.string()), // JSON stringified slots
    blockedDatesJson: v.optional(v.string()), // JSON stringified blocked dates
    // Owner credentials
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  }).index("by_owner", ["ownerId"]).index("by_username", ["username"]).index("by_phone", ["phone"]),

  services: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    price: v.number(),
    duration: v.number(),
  }),

  savedShops: defineTable({
    userId: v.string(),
    shopId: v.id("shops"),
  }).index("by_user", ["userId"]),

  offers: defineTable({
    title: v.string(),
    discount: v.string(),
    expiryDate: v.string(),
    city: v.string(),
    applicableShops: v.optional(v.array(v.string())),
  }).index("by_city", ["city"]),

  notifications: defineTable({
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  bookings: defineTable({
    customerId: v.string(), // Local customer ID string
    shopId: v.id("shops"),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    services: v.array(v.object({
      id: v.string(),
      name: v.string(),
      price: v.number(),
      duration: v.number()
    })),
    totalAmount: v.number(),
    date: v.string(),
    time: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    otp: v.optional(v.number()),
    otpVerified: v.optional(v.boolean()),
    otpCreatedAt: v.optional(v.number()),
    completedAt: v.optional(v.string())
  }),

  reviews: defineTable({
    userId: v.optional(v.id("users")),
    customerId: v.optional(v.string()), // Local customer ID string
    customerName: v.optional(v.string()),
    shopId: v.id("shops"),
    rating: v.number(),
    reviewText: v.string(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.optional(v.number()),
  }),

  // Table to prevent double bookings logic efficiently
  slotBookings: defineTable({
    shopId: v.id("shops"),
    date: v.string(), // "YYYY-MM-DD"
    time: v.string(), // e.g. "09:00 AM"
    bookedCount: v.number(),
    maxCount: v.number(),
  }).index("by_shop_date_time", ["shopId", "date", "time"]),

  blockedDates: defineTable({
    shopId: v.id("shops"),
    date: v.string(), // "YYYY-MM-DD"
    reason: v.optional(v.string()),
  }).index("by_shop", ["shopId"]),

  otps: defineTable({
    phone: v.string(),
    otp: v.string(),
    expiresAt: v.number(), // timestamp
  }).index("by_phone", ["phone"]),

  // Rate limiting: tracks failed login attempts per username
  loginAttempts: defineTable({
    username: v.string(),
    failedCount: v.number(),
    lockedUntil: v.optional(v.number()),
    lastAttemptAt: v.number(),
  }).index("by_username", ["username"]),

  // Immutable security audit trail — never deleted
  securityLogs: defineTable({
    event: v.string(),    // e.g. "login_success", "login_failure", "login_locked"
    username: v.string(), // sanitized username (no password data)
    outcome: v.union(v.literal("success"), v.literal("failure"), v.literal("blocked")),
    detail: v.optional(v.string()), // extra info e.g. "Wrong password" or "Locked 300s"
    timestamp: v.number(),  // Date.now()
  }).index("by_timestamp", ["timestamp"]).index("by_username", ["username"]),
});
