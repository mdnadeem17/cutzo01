import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    uid: v.string(), // Firebase UID
    firebaseUid: v.optional(v.string()), // Standardized field name
    name: v.string(),
    email: v.string(),
    location: v.optional(v.string()),
    gpsLocation: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal("customer"), v.literal("shop_owner"))),
    fcmToken: v.optional(v.string()), // added for push notifications
    createdAt: v.optional(v.string()),
  }).index("by_uid", ["uid"])
    .index("by_firebase_uid", ["firebaseUid"])
    .index("by_phone", ["phone"]),

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
    totalRatingSum: v.optional(v.number()), // New field for accurate averaging
    isActive: v.boolean(),
    servicesSummary: v.optional(v.array(v.object({ name: v.string(), price: v.number() }))), // Denormalized for listing performance
    isOpen: v.optional(v.boolean()), // Owner-controlled: accepts bookings right now?
    phone: v.optional(v.string()),
    image: v.optional(v.string()), // Deprecated base64, kept for backwards compatibility
    imageStorageId: v.optional(v.id("_storage")), // New Convex Storage ID
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
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    firebaseUid: v.optional(v.string()), // Firebase Auth linking
    fcmToken: v.optional(v.string()), // added for push notifications
    // Credentials-based login fields (shop owner username/password setup)
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    // Legacy JSON blob fields — kept optional so old documents remain valid.
    // New writes use relational tables (services, blockedDates) instead.
    servicesJson: v.optional(v.string()),
    availabilitySlotsJson: v.optional(v.string()),
    blockedDatesJson: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]).index("by_phone", ["phone"]).index("by_firebase_uid", ["firebaseUid"]).index("by_username", ["username"]).index("by_status", ["status", "isActive"]),

  services: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    price: v.number(),
    duration: v.number(),
  }).index("by_shopId", ["shopId"]),

  savedShops: defineTable({
    userId: v.string(),
    shopId: v.id("shops"),
  }).index("by_user", ["userId"])
    .index("by_user_shop", ["userId", "shopId"]),

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
  }).index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]) // Added for faster cleanup
    .index("by_created", ["createdAt"]), // Added for global time-based cleanup

  bookings: defineTable({
    customerId: v.string(), // Local customer ID string (Firebase UID)
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
  }).index("by_shop_date_time", ["shopId", "date", "time"])
    .index("by_customer", ["customerId", "date", "time"])
    .index("by_shop", ["shopId"]),

  reviews: defineTable({
    userId: v.optional(v.id("users")),
    customerId: v.optional(v.string()), // Firebase UID
    customerName: v.optional(v.string()),
    shopId: v.id("shops"),
    bookingId: v.optional(v.id("bookings")), // Linked booking
    rating: v.number(),
    reviewText: v.string(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.optional(v.number()),
  }).index("by_shop", ["shopId"])
    .index("by_customer", ["customerId"])
    .index("by_booking", ["bookingId"]),

  slotBookings: defineTable({
    shopId: v.id("shops"),
    date: v.string(), // "YYYY-MM-DD"
    time: v.string(), // e.g. "09:00 AM"
    bookedCount: v.number(),
    maxCount: v.optional(v.number()),
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

  rateLimits: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    timestamp: v.number(),
  }).index("by_user_endpoint_time", ["userId", "endpoint", "timestamp"]),

  walkIns: defineTable({
    shopId: v.id("shops"),
    serviceName: v.string(),
    startTime: v.number(), // timestamp
    estimatedDuration: v.number(), // minutes
    calculatedFinishTime: v.number(), // timestamp
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
  }).index("by_shop", ["shopId"])
    .index("by_status", ["status"]),

  barberStatus: defineTable({
    shopId: v.id("shops"),
    currentStatus: v.union(v.literal("idle"), v.literal("busy")),
    busyUntil: v.number(), // timestamp
    currentServiceType: v.optional(v.string()),
    currentCustomerType: v.optional(v.union(v.literal("walk-in"), v.literal("online"))),
    activeItemId: v.optional(v.string()), // ID of the walkIn or booking
  }).index("by_shop", ["shopId"]),
});
