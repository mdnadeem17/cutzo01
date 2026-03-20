import { Booking, Review, Service, Shop, TimeSlot } from "./types";
import { readDatabase } from "../vendor/storage";
import { VendorBooking, VendorService } from "../vendor/types";

interface BookingDatabase {
  bookings: Record<string, Booking>;
}

const BOOKING_STORAGE_KEY = "trimo_booking_db";
const SERVICE_ICONS = ["Scissors", "Smile", "Hand", "Droplets", "Sparkles", "Star", "Wind", "Flame"];

const hasWindow = () => typeof window !== "undefined";

const emptyBookingDatabase = (): BookingDatabase => ({ bookings: {} });

const readBookingDatabase = (): BookingDatabase => {
  if (!hasWindow()) {
    return emptyBookingDatabase();
  }

  const raw = window.localStorage.getItem(BOOKING_STORAGE_KEY);

  if (!raw) {
    return emptyBookingDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as BookingDatabase;
    return parsed?.bookings ? parsed : emptyBookingDatabase();
  } catch {
    return emptyBookingDatabase();
  }
};

const writeBookingDatabase = (database: BookingDatabase) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(database));
};

const toCustomerService = (service: VendorService, index: number): Service => ({
  id: service.id,
  name: service.name,
  icon: SERVICE_ICONS[index % SERVICE_ICONS.length],
  duration: `${service.durationMinutes} min`,
  price: service.price,
  popular: index === 0,
});

const toCustomerSlots = (slots: { time: string; enabled: boolean }[]): TimeSlot[] =>
  slots.map((slot) => ({
    time: slot.time,
    available: slot.enabled,
  }));

const sortBookingsNewestFirst = (left: Booking, right: Booking) => {
  const leftTime = new Date(left.createdAt ?? left.date).getTime();
  const rightTime = new Date(right.createdAt ?? right.date).getTime();
  return rightTime - leftTime;
};

export const loadAllBookings = () =>
  Object.values(readBookingDatabase().bookings).sort(sortBookingsNewestFirst);

export const loadCustomerBookings = (userId: string) =>
  loadAllBookings().filter((booking) => booking.userId === userId);

export const loadVendorBookings = (ownerId: string): VendorBooking[] =>
  loadAllBookings()
    .filter((booking) => booking.shopId === ownerId)
    .map((booking) => ({
      id: booking.id,
      customerName: booking.customerName || "Customer",
      service: booking.service,
      date: booking.date,
      time: booking.time,
      price: booking.price,
      status: booking.status,
    }));

export const saveBooking = (booking: Booking) => {
  const database = readBookingDatabase();
  database.bookings[booking.id] = booking;
  writeBookingDatabase(database);
  return loadAllBookings();
};

export const updateStoredBookingStatus = (
  bookingId: string,
  status: Booking["status"]
) => {
  const database = readBookingDatabase();

  if (!database.bookings[bookingId]) {
    return loadAllBookings();
  }

  database.bookings[bookingId] = {
    ...database.bookings[bookingId],
    status,
  };
  writeBookingDatabase(database);
  return loadAllBookings();
};

export const loadMarketplaceShops = (reviews: Review[]): Shop[] => {
  const owners = Object.values(readDatabase().users);
  const bookings = loadAllBookings();

  return owners
    .filter((owner) => owner.shopName.trim() && owner.address.trim() && owner.serviceCatalog.length > 0)
    .map((owner) => {
      const shopReviews = reviews.filter((review) => review.shopId === owner.userId);
      const reviewCount = shopReviews.length;
      const rating =
        reviewCount > 0
          ? shopReviews.reduce((total, review) => total + review.rating, 0) / reviewCount
          : 0;
      const bookingCount = bookings.filter((booking) => booking.shopId === owner.userId).length;
      const customerServices = owner.serviceCatalog.map(toCustomerService);
      const startingPrice =
        owner.serviceCatalog.length > 0
          ? Math.min(...owner.serviceCatalog.map((service) => service.price))
          : owner.startingPrice;
      const nextSlot =
        owner.availabilitySlots.find((slot) => slot.enabled)?.time ?? "Not available";

      return {
        id: owner.userId,
        ownerId: owner.userId,
        name: owner.shopName,
        image: owner.images[0] ?? owner.image ?? "/placeholder.svg",
        rating,
        reviewCount,
        bookingCount,
        distance: owner.location || "Location not set",
        locationLabel: owner.location || owner.address,
        gpsLocation: owner.gpsLocation,
        startingPrice,
        nextSlot,
        address: owner.address,
        category: "Barber Shop",
        tags: [],
        about: "",
        openTime: owner.workingHours.start,
        closeTime: owner.workingHours.end,
        services: customerServices,
        availabilitySlots: toCustomerSlots(owner.availabilitySlots),
        blockedDates: owner.blockedDates.map((entry) => entry.date),
      };
    });
};
