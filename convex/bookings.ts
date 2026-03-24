import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {

    const shop = await ctx.db.get(args.shopId);
    if (!shop) {
      throw new Error("Shop not found.");
    }

    // ── 1. Check blocked dates ─────────────────────────────────────────────
    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    
    if (blockedDates.length > 0) {
      throw new Error("This date is blocked by the shop owner.");
    }

    // Check JSON blocked dates for backwards compatibility
    if (shop.blockedDatesJson) {
      try {
        const parsedBlockedDates = JSON.parse(shop.blockedDatesJson);
        const isBlocked = parsedBlockedDates.some((b: any) => b.date === args.date);
        if (isBlocked) {
          throw new Error("This date is blocked by the shop owner.");
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // ── 2. Check and allocate slot capacity ────────────────────────────────
    const maxCapacity = shop.maxBookingsPerSlot || 1;

    const existingSlot = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) => 
        q.eq("shopId", args.shopId).eq("date", args.date).eq("time", args.time)
      )
      .first();

    if (!existingSlot) {
      await ctx.db.insert("slotBookings", {
        shopId: args.shopId,
        date: args.date,
        time: args.time,
        bookedCount: 1,
        maxCount: maxCapacity,
      });
    } else {
      if (existingSlot.bookedCount >= existingSlot.maxCount) {
        throw new Error("Slot Full: Overbooking prevented. This time slot is no longer available.");
      }
      await ctx.db.patch(existingSlot._id, {
        bookedCount: existingSlot.bookedCount + 1,
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
      
      // ── 5. Send notification to customer  ────────────────────────────────
      await ctx.db.insert("notifications", {
        userId: args.customerId,
        title: "Booking Requested",
        message: `Your booking at ${shop.shopName} was sent. Your service OTP is ${otp}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });
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
  },
  handler: async (ctx, args) => {
    if (!args.customerId) return [];
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .collect();

    // Enrich with shop details for display
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const shop = await ctx.db.get(booking.shopId);
        return {
          ...booking,
          shopName: shop?.shopName ?? "Unknown Shop",
          shopImage: shop?.images?.[0] ?? shop?.image ?? "",
          address: shop?.address ?? "",
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

    // Sort newest first
    return enriched.sort((a, b) => {
      const aTime = new Date(a.date + "T" + a.time).getTime() || 0;
      const bTime = new Date(b.date + "T" + b.time).getTime() || 0;
      return bTime - aTime;
    });
  },
});

// Get bookings for a shop by ownerId (Vendor App - real-time)
export const getShopBookingsByOwnerId = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.ownerId) return [];

    // Find the shop by ownerId
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (!shop) return [];

    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("shopId"), shop._id))
      .collect();

    // Map to VendorBooking shape
    return bookings.map((b) => ({
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
  },
});

// Legacy query — kept for backwards compatibility
export const getUserBookings = query({
  args: {
    customerId: v.string(),
    callerUid: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("customerId"), args.customerId))
      .collect();
  },
});

// Get bookings for a specific shop (ONLY the verified shop owner may access)
export const getShopBookings = query({
  args: {
    shopId: v.id("shops"),
    callerOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop || shop.ownerId !== args.callerOwnerId) {
      throw new Error("Unauthorized: you can only view bookings for shops you own.");
    }

    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .collect();
  },
});

// ── TRIMO STRICT BOOKING FLOW MUTATIONS ──

export const acceptBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    callerOwnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "pending") throw new Error("Only pending bookings can be accepted.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop || shop.ownerId !== args.callerOwnerId) {
      throw new Error("Unauthorized: you can only accept bookings for your own shop.");
    }

    await ctx.db.patch(args.bookingId, { status: "confirmed" });

    // Send notification
    if (booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Booking Confirmed!",
        message: `Your appointment on ${booking.date} at ${booking.time} has been confirmed. Your OTP to start the service is ${booking.otp}.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });
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
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "confirmed") throw new Error("Booking is not confirmed yet.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop || shop.ownerId !== args.callerOwnerId) {
      throw new Error("Unauthorized.");
    }

    if (booking.otp !== args.otp) {
      throw new Error("Invalid OTP");
    }

    await ctx.db.patch(args.bookingId, {
      status: "active",
      otpVerified: true,
    });

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
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "active") throw new Error("Only active bookings can be completed.");

    const shop = await ctx.db.get(booking.shopId);
    if (!shop || shop.ownerId !== args.callerOwnerId) {
      throw new Error("Unauthorized.");
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      completedAt: Date.now().toString(),
    });

    if (booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Service Completed",
        message: `Your appointment on ${booking.date} has finished. Please leave a review!`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });
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
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");

    if (args.callerOwnerId) {
      const shop = await ctx.db.get(booking.shopId);
      if (!shop || shop.ownerId !== args.callerOwnerId) {
        throw new Error("Unauthorized.");
      }
    } else if (args.callerCustomerId) {
      if (booking.customerId !== args.callerCustomerId) {
        throw new Error("Unauthorized.");
      }
    } else {
      throw new Error("Must provide credentials.");
    }

    await ctx.db.patch(args.bookingId, { status: "cancelled" });

    if (args.callerOwnerId && booking.customerId) {
      await ctx.db.insert("notifications", {
        userId: booking.customerId,
        title: "Booking Cancelled",
        message: `Your appointment on ${booking.date} at ${booking.time} was cancelled by the shop.`,
        type: "booking_update",
        isRead: false,
        createdAt: Date.now(),
      });
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
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.customerId !== args.callerCustomerId) {
      throw new Error("Unauthorized: you can only reschedule your own bookings.");
    }
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new Error("Only pending or confirmed bookings can be rescheduled.");
    }

    // Check new date is not blocked
    const shop = await ctx.db.get(booking.shopId);
    if (!shop) throw new Error("Shop not found.");

    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_shop", (q) => q.eq("shopId", booking.shopId))
      .filter((q) => q.eq(q.field("date"), args.newDate))
      .collect();
    if (blockedDates.length > 0) throw new Error("The new date is blocked by the shop.");

    // Decrement old slot count
    const oldSlot = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", booking.shopId).eq("date", booking.date).eq("time", booking.time)
      )
      .first();
    if (oldSlot && oldSlot.bookedCount > 0) {
      await ctx.db.patch(oldSlot._id, { bookedCount: oldSlot.bookedCount - 1 });
    }

    // Allocate new slot
    const maxCapacity = shop.maxBookingsPerSlot || 1;
    const newSlot = await ctx.db
      .query("slotBookings")
      .withIndex("by_shop_date_time", (q) =>
        q.eq("shopId", booking.shopId).eq("date", args.newDate).eq("time", args.newTime)
      )
      .first();

    if (!newSlot) {
      await ctx.db.insert("slotBookings", {
        shopId: booking.shopId,
        date: args.newDate,
        time: args.newTime,
        bookedCount: 1,
        maxCount: maxCapacity,
      });
    } else {
      if (newSlot.bookedCount >= newSlot.maxCount) {
        throw new Error("The new time slot is already full.");
      }
      await ctx.db.patch(newSlot._id, { bookedCount: newSlot.bookedCount + 1 });
    }

    await ctx.db.patch(args.bookingId, {
      date: args.newDate,
      time: args.newTime,
    });
    return true;
  },
});

// Alias for specific frontend request
export const createBookingWithOtp = createBooking;
