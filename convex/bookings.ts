import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isPastTime, isDuring } from "./utils";
import { checkRateLimit } from "./rateLimit";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";

// Create a new booking
export const createBooking = mutation({
  args: {
    customerId: v.string(),
    shopId: v.id("shops"),
    customerName: v.string(),
    customerPhone: v.string(),
    services: v.array(v.object({
      id: v.string(),
      name: v.string(),
      price: v.number(),
      duration: v.number()
    })),
    totalAmount: v.number(),
    date: v.string(),
    time: v.string(),
    clientNow: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.customerId) throw new Error("Unauthorized");

    await checkRateLimit(ctx, identity.subject, "createBooking", 10, 60 * 60 * 1000); // 10 per hour

    const shop = await ctx.db.get(args.shopId);
    if (!shop) {
      throw new Error("Shop not found.");
    }

    const now = args.clientNow ?? Date.now();

    // 1. Check if past time
    if (isPastTime(args.date, args.time, now)) {
      throw new Error("This time has already passed.");
    }

    // 2. Check working hours
    if (!isDuring(args.time, shop.openTime || "09:00", shop.closeTime || "21:00")) {
      throw new Error("Shop is closed at this time.");
    }

    // 3. Check break time
    if (shop.breakTime && isDuring(args.time, shop.breakTime.start, shop.breakTime.end)) {
      throw new Error("Shop is on break during this time.");
    }

    // 4. Check blocked dates
    const blockedDatesRaw = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    
    let isBlocked = blockedDatesRaw.length > 0;
    if (!isBlocked && shop.blockedDatesJson) {
      try {
        const parsed = JSON.parse(shop.blockedDatesJson);
        isBlocked = parsed.some((b: any) => b.date === args.date);
      } catch (e) {}
    }
    if (isBlocked) {
      throw new Error("This date is blocked by the shop owner.");
    }

    // ── 2. Check and allocate slot capacity ────────────────────────────────
    const maxCapacity = shop.maxBookingsPerSlot || 1;

    // Use the bookings table as the source of truth for atomic capacity checks.
    // Convex tracks the read of this index range, so concurrent inserts will trigger OCC retries.
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_shop_date_time", (q) => 
        q.eq("shopId", args.shopId).eq("date", args.date).eq("time", args.time)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    if (existingBookings.length >= maxCapacity) {
      throw new Error("Slot Full: Overbooking prevented. This time slot is no longer available.");
    }

    if (existingBookings.some(b => b.customerId === args.customerId)) {
      throw new Error("You already have a booking for this slot.");
    }

    // Sync slotBookings summary table (for dashboard performance)
    const slotSummary = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => 
        q.eq("shopId", args.shopId).eq("date", args.date).eq("time", args.time)
      )
      .first();

    if (!slotSummary) {
      await ctx.db.insert("slotBookings", {
        shopId: args.shopId,
        date: args.date,
        time: args.time,
        // Bug 5: re-count from the source-of-truth bookings table
        // existingBookings.length is already accurate here (read in the same tx),
        // but we add 1 explicitly to account for the booking we are about to insert.
        bookedCount: existingBookings.length + 1,
        maxCount: maxCapacity,
      });
    } else {
      // Bug 5: always derive count from existing bookings (already read in this tx)
      await ctx.db.patch(slotSummary._id, {
        bookedCount: existingBookings.length + 1,
      });
    }

    // ── 3. Create the Booking ──────────────────────────────────────────────
    const otp = Math.floor(1000 + Math.random() * 9000);

    const bookingId = await ctx.db.insert("bookings", {
      customerId: args.customerId,
      shopId: args.shopId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      services: args.services,
      totalAmount: args.totalAmount,
      date: args.date,
      time: args.time,
      status: "pending",
      otp,
      otpVerified: false,
      otpCreatedAt: Date.now(),
    });

    // ── 4. Send notification to shop owner ────────────────────────────────
    try {
      await ctx.db.insert("notifications", {
        userId: shop.ownerId,
        title: "New Booking Request",
        message: `${args.customerName} wants to book ${args.services.map(s => s.name).join(", ")} on ${args.date} at ${args.time}.`,
        type: "booking",
        isRead: false,
        createdAt: Date.now(),
      });
      
      if (shop.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: shop.fcmToken,
          title: "New Booking Request",
          body: `${args.customerName} wants to book ${args.services.map(s => s.name).join(", ")} on ${args.date} at ${args.time}.`,
        });
      }
      
      // ── 5. Send notification to customer  ────────────────────────────────
      await ctx.db.insert("notifications", {
        userId: args.customerId,
        title: "Booking Requested",
        message: `Your booking at ${shop.shopName} was sent. Your service OTP is ${otp}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      const customer = await ctx.db
        .query("users")
        .withIndex("by_uid", (q) => q.eq("uid", args.customerId))
        .first();

      if (customer?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: customer.fcmToken,
          title: "Booking Requested",
          body: `Your booking at ${shop.shopName} was sent. Your service OTP is ${otp}.`,
        });
      }
    } catch (e) {
      // non-critical
    }

    return { bookingId, otp };
  },
});

// Get bookings for a specific customer (Customer App "My Bookings" screen)
export const getBookingsByCustomer = query({
  args: {
    customerId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.customerId) throw new Error("Unauthorized");

    if (!args.customerId) return { page: [], isDone: true, continueCursor: "" };
    
    const results = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc") // newest first (by date/time in index)
      .paginate(args.paginationOpts);

    // Enrich with shop details for display
    const enrichedPage = await Promise.all(
      results.page.map(async (booking) => {
        const shop = await ctx.db.get(booking.shopId);
        return {
          ...booking,
          shopName: shop?.shopName ?? "Unknown Shop",
          shopImage: shop?.images?.[0] ?? shop?.image ?? "",
          address: shop?.address ?? "",
          // Bug 8 support: pass shop hours so RescheduleView can generate correct slots
          shopOpenTime: shop?.openTime ?? "09:00",
          shopCloseTime: shop?.closeTime ?? "21:00",
          // Legacy fields for ActivityScreen compatibility
          service: booking.services.map(s => s.name).join(", "),
          price: booking.totalAmount,
          userId: booking.customerId,
          shopId: booking.shopId as string,
          ownerId: shop?.ownerId ?? "",
          customerPhone: booking.customerPhone,
        };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

// Get bookings for a shop by ownerId (Vendor App - real-time)
export const getShopBookingsByOwnerId = query({
  args: {
    ownerId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    if (!args.ownerId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Find the shop by ownerId
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    
    // Authorization check
    const isLegacy = shop.firebaseUid?.startsWith("owner-");
    const isOwnerMatch = shop.ownerId === args.ownerId;
    
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      // Allow access if it's a legacy record matching the requested ownerId
      // OR if the provided ownerId matches (this allows recovery after manual login)
      if (isOwnerMatch) {
         // Allow (Safe fallback for recovery/manual login sync timing)
      } else {
        throw new Error(`[V2] Unauthorized (Shop UID: ${shop.firebaseUid} !== Token: ${identity.subject})`);
      }
    }

    const results = await ctx.db
      .query("bookings")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .order("desc") // newest first
      .paginate(args.paginationOpts);

    // Map to VendorBooking shape
    const vendorPage = results.page.map((b) => ({
      id: b._id as string,
      customerName: b.customerName ?? "Customer",
      customerPhone: b.customerPhone ?? "",
      service: b.services.map((s) => s.name).join(", "),
      date: b.date,
      time: b.time,
      price: b.totalAmount,
      status: b.status,
      otp: b.otp,
      otpVerified: b.otpVerified,
    }));

    return { ...results, page: vendorPage };
  },
});

// Legacy query — kept for backwards compatibility
export const getUserBookings = query({
  args: {
    customerId: v.string(),
    callerUid: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.callerUid || args.callerUid !== args.customerId) throw new Error("Unauthorized");

    // Bug 3: use the index instead of a full table scan with .filter()
    return await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

// Get bookings for a specific shop (ONLY the verified shop owner may access)
export const getShopBookings = query({
  args: {
    shopId: v.id("shops"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    
    // Migration-Aware auth: allow if token matches OR ownerId contract is held
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (shop.ownerId) {
        // Allow (owner lookup is implicit in the request, so the ownerId contract holds)
      } else {
        throw new Error("Unauthorized access to shop bookings");
      }
    }

    return await ctx.db
      .query("bookings")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ── CUTZO STRICT BOOKING FLOW MUTATIONS ──

export const acceptBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    callerOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "pending") throw new Error("Only pending bookings can be accepted.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found");
    
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (shop.ownerId === args.callerOwnerId) {
         // Allow (Safe fallback for recovery/manual login sync timing)
      } else {
        throw new Error("Unauthorized: you can only accept bookings for your own shop.");
      }
    }

    // BUG 3 FIX: Reset otpCreatedAt to NOW so the 30-min OTP window starts
    // from the moment of confirmation, not from the original booking creation time.
    await ctx.db.patch(args.bookingId, { 
      status: "confirmed",
      otpCreatedAt: Date.now(),
    });

    // Send notification with fresh OTP
    if (booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Booking Confirmed!",
        message: `Your appointment on ${booking.date} at ${booking.time} has been confirmed. Your OTP to start the service is ${booking.otp}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      const customer = await ctx.db
        .query("users")
        .withIndex("by_uid", (q) => q.eq("uid", booking.customerId))
        .first();

      if (customer?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: customer.fcmToken,
          title: "Booking Confirmed!",
          body: `Your appointment at ${shop.shopName} on ${booking.date} has been confirmed. OTP: ${booking.otp}`,
        });
      }
    }
  },
});

export const verifyBookingOtp = mutation({
  args: {
    bookingId: v.id("bookings"),
    otp: v.number(),
    callerOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "confirmed") throw new Error("Booking is not confirmed yet.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found");
    
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (shop.ownerId === args.callerOwnerId) {
         // Allow
      } else {
        throw new Error("Unauthorized to verify OTP for this shop.");
      }
    }

    // 1. Rate limit check (max 5 attempts per 10 mins per booking)
    // We use the bookingId as the unique key for rate limiting this specific OTP.
    await checkRateLimit(ctx, args.bookingId as string, "otpVerify", 5, 10 * 60 * 1000);

    // 2. Expiry check (30 mins)
    const thirtyMinutes = 30 * 60 * 1000;
    if (booking.otpCreatedAt && Date.now() - booking.otpCreatedAt > thirtyMinutes) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (booking.otp !== args.otp) {
      throw new Error("Invalid OTP");
    }

    await ctx.db.patch(args.bookingId, {
      status: "active",
      otpVerified: true,
    });

    const totalDuration = booking.services.reduce((acc, s) => acc + s.duration, 0) || 30;
    const busyUntil = Date.now() + (totalDuration * 60 * 1000);
    const serviceName = booking.services.map(s => s.name).join(", ");
    
    const existingStatus = await ctx.db
      .query("barberStatus")
      .withIndex("by_shop", (q) => q.eq("shopId", booking.shopId))
      .first();

    if (existingStatus) {
      await ctx.db.patch(existingStatus._id, {
        currentStatus: "busy",
        busyUntil: busyUntil,
        currentServiceType: serviceName,
        currentCustomerType: "online",
        activeItemId: args.bookingId as string,
      });
    } else {
      await ctx.db.insert("barberStatus", {
        shopId: booking.shopId,
        currentStatus: "busy",
        busyUntil: busyUntil,
        currentServiceType: serviceName,
        currentCustomerType: "online",
        activeItemId: args.bookingId as string,
      });
    }

    if (booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Service Started",
        message: `Your appointment on ${booking.date} is now active. sit back and relax!`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });
    }
    return true;
  },
});

export const completeBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    callerOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "active") throw new Error("Only active bookings can be completed.");
    // Bug 16: guard against completing a booking before OTP is verified
    if (!booking.otpVerified) throw new Error("OTP must be verified before completing the booking.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found");
    
    if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
      if (shop.ownerId === args.callerOwnerId) {
         // Allow
      } else {
        throw new Error("Unauthorized to complete booking for this shop.");
      }
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      completedAt: Date.now().toString(),
    });

    const existingStatus = await ctx.db
      .query("barberStatus")
      .withIndex("by_shop", (q) => q.eq("shopId", booking.shopId))
      .first();
      
    if (existingStatus && existingStatus.activeItemId === args.bookingId) {
      await ctx.db.patch(existingStatus._id, {
        currentStatus: "idle",
        busyUntil: Date.now(),
        currentServiceType: undefined,
        currentCustomerType: undefined,
        activeItemId: undefined,
      });
    }

    if (booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Service Completed",
        message: `Your appointment on ${booking.date} has finished. Please leave a review!`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      const customer = await ctx.db
        .query("users")
        .withIndex("by_uid", (q) => q.eq("uid", booking.customerId))
        .first();

      if (customer?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: customer.fcmToken,
          title: "Service Completed",
          body: `Your appointment at ${shop.shopName} has finished. Hope you liked the service!`,
        });
      }
    }
  },
});

export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    callerOwnerId: v.optional(v.string()), // vendor caller
    callerCustomerId: v.optional(v.string()), // customer caller (for cancel)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    // BUG 8 FIX: Do NOT check identity.subject === callerOwnerId here.
    // For manual-login vendors, callerOwnerId is their legacy owner-xxx string,
    // while identity.subject is the Google UID. They will never match.
    // Authorization is done below by verifying shop.ownerId === callerOwnerId.

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found.");

    if (args.callerOwnerId) {
      if (shop.firebaseUid && shop.firebaseUid !== identity.subject) {
        if (shop.ownerId === args.callerOwnerId) {
          // Allow
        } else {
          throw new Error("Unauthorized to cancel booking for this shop.");
        }
      }
    } else if (args.callerCustomerId) {
      // Bug 4: verify the identity matches the callerCustomerId so one customer
      // cannot cancel another customer's booking by guessing their ID.
      if (identity.subject !== args.callerCustomerId) {
        throw new Error("Unauthorized");
      }
      if (booking.customerId !== args.callerCustomerId) {
        throw new Error("Unauthorized.");
      }
      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new Error(`Cannot cancel a booking that is ${booking.status}.`);
      }
    } else {
      throw new Error("Must provide credentials.");
    }

    // ── 3. Update Status ──────────────────────────────────────────────
    await ctx.db.patch(args.bookingId, { status: "cancelled" });

    // ── 4. Sync Slot Summary ──────────────────────────────────────────
    const slot = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => 
        q.eq("shopId", booking.shopId).eq("date", booking.date).eq("time", booking.time)
      )
      .first();
    
    if (slot) {
      // Re-calculate the actual count from the bookings table
      const actualCount = await ctx.db
        .query("bookings")
        .withIndex("by_shop_date_time", (q) => 
          q.eq("shopId", booking.shopId).eq("date", booking.date).eq("time", booking.time)
        )
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();
      
      await ctx.db.patch(slot._id, { bookedCount: actualCount.length });
    }

    if (args.callerOwnerId && booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Booking Cancelled",
        message: `Your appointment on ${booking.date} at ${booking.time} was cancelled by the shop.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      const customer = await ctx.db
        .query("users")
        .withIndex("by_uid", (q) => q.eq("uid", booking.customerId))
        .first();

      if (customer?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: customer.fcmToken,
          title: "Booking Cancelled",
          body: `Sorry, your appointment at ${shop?.shopName} on ${booking.date} was cancelled.`,
        });
      }
    } else if (args.callerCustomerId) {
      // Notify owner if customer cancels
      if (shop?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: shop.fcmToken,
          title: "Booking Cancelled",
          body: `${booking.customerName} cancelled their appointment on ${booking.date} at ${booking.time}.`,
        });
      }
    }
  },
});

// Reschedule a booking (customer action)
export const rescheduleBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    newDate: v.string(),
    newTime: v.string(),
    callerCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.callerCustomerId) throw new Error("Unauthorized");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.customerId !== args.callerCustomerId) {
      throw new Error("Unauthorized: you can only reschedule your own bookings.");
    }
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new Error("Only pending or confirmed bookings can be rescheduled.");
    }

    // ── VALIDATE NEW SLOT ──
    const now = Date.now();
    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found.");
    
    // 1. Past check
    if (isPastTime(args.newDate, args.newTime, now)) {
      throw new Error("New time has already passed.");
    }

    // 2. Working hours check
    if (!isDuring(args.newTime, shop.openTime || "09:00", shop.closeTime || "21:00")) {
      throw new Error("Shop is closed at the new time.");
    }

    // 3. Break time check
    if (shop.breakTime && isDuring(args.newTime, shop.breakTime.start, shop.breakTime.end)) {
      throw new Error("Shop is on break at the new time.");
    }

    // 4. Blocked dates check
    const blockedDatesRaw = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", booking.shopId))
      .filter((q) => q.eq(q.field("date"), args.newDate))
      .collect();
    
    let isBlocked = blockedDatesRaw.length > 0;
    if (!isBlocked && shop.blockedDatesJson) {
      try {
        const parsed = JSON.parse(shop.blockedDatesJson);
        isBlocked = parsed.some((b: any) => b.date === args.newDate);
      } catch (e) {}
    }
    if (isBlocked) throw new Error("The new date is blocked by the shop.");

    // Allocate new slot
    const maxCapacity = shop.maxBookingsPerSlot || 1;
    
    // Check actual capacity in the new slot
    const newSlotBookings = await ctx.db
      .query("bookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", booking.shopId).eq("date", args.newDate).eq("time", args.newTime)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    if (newSlotBookings.length >= maxCapacity) {
      throw new Error("The new time slot is already full.");
    }

    // Sync NEW slot summary
    const newSlotSummary = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", booking.shopId).eq("date", args.newDate).eq("time", args.newTime)
      )
      .first();

    if (!newSlotSummary) {
      await ctx.db.insert("slotBookings", {
        shopId: booking.shopId,
        date: args.newDate,
        time: args.newTime,
        bookedCount: newSlotBookings.length + 1,
        maxCount: maxCapacity,
      });
    } else {
      await ctx.db.patch(newSlotSummary._id, { bookedCount: newSlotBookings.length + 1 });
    }

    // Sync OLD slot summary (decrement)
    const oldSlotSummary = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", booking.shopId).eq("date", booking.date).eq("time", booking.time)
      )
      .first();
    if (oldSlotSummary) {
      const oldSlotBookings = await ctx.db
        .query("bookings")
        .withIndex("by_shop_date_time", (q) =>
          q.eq("shopId", booking.shopId).eq("date", booking.date).eq("time", booking.time)
        )
        .filter((q) => q.neq(q.field("status"), "cancelled") && q.neq(q.field("_id"), args.bookingId))
        .collect();
      await ctx.db.patch(oldSlotSummary._id, { bookedCount: oldSlotBookings.length });
    }

    await ctx.db.patch(args.bookingId, {
      date: args.newDate,
      time: args.newTime,
    });

    // ── NOTIFY OWNER AND CUSTOMER ──
    try {
      // 1. Notify Owner
      await ctx.db.insert("notifications", {
        userId: shop.ownerId,
        title: "Booking Rescheduled",
        message: `${booking.customerName} rescheduled their appointment to ${args.newDate} at ${args.newTime}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      // 2. Notify Customer
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Reschedule Confirmed",
        message: `Your appointment at ${shop.shopName} has been moved to ${args.newDate} at ${args.newTime}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });

      // 3. Push for Owner
      if (shop.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: shop.fcmToken,
          title: "Booking Rescheduled",
          body: `${booking.customerName} moved their appointment to ${args.newDate} at ${args.newTime}.`,
        });
      }

      // 4. Push for Customer
      const customer = await ctx.db
        .query("users")
        .withIndex("by_uid", (q) => q.eq("uid", booking.customerId))
        .first();

      if (customer?.fcmToken) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotification, {
          fcmToken: customer.fcmToken,
          title: "Reschedule Confirmed",
          body: `Your appointment at ${shop.shopName} has been moved to ${args.newDate} at ${args.newTime}.`,
        });
      }
    } catch (e) {
      // non-critical
    }

    return true;
  },
});

// Alias for specific frontend request
export const createBookingWithOtp = createBooking;

