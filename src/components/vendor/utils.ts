import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { VendorBooking, VendorBookingStatus } from "./types";

export const bookingStatusStyles: Record<
  VendorBookingStatus,
  { label: string; background: string; color: string; border: string }
> = {
  pending: {
    label: "Pending",
    background: "hsl(43 96% 92%)",
    color: "hsl(31 92% 45%)",
    border: "hsl(43 88% 80%)",
  },
  confirmed: {
    label: "Confirmed",
    background: "hsl(189 93% 95%)",
    color: "hsl(189 93% 31%)",
    border: "hsl(189 80% 82%)",
  },
  completed: {
    label: "Completed",
    background: "hsl(142 76% 95%)",
    color: "hsl(142 70% 30%)",
    border: "hsl(142 55% 82%)",
  },
  cancelled: {
    label: "Cancelled",
    background: "hsl(0 84% 96%)",
    color: "hsl(0 72% 45%)",
    border: "hsl(0 75% 86%)",
  },
};

export const formatCurrency = (amount: number) =>
  `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;

export const formatHeaderDate = (date: Date = new Date()) => format(date, "EEEE, MMM d");

export const formatBookingDate = (value: string) => format(parseISO(value), "EEE, MMM d");

export const formatFullDate = (value: string) => format(parseISO(value), "MMM d, yyyy");

export const formatHourLabel = (value: string) =>
  format(parse(value, "HH:mm", new Date()), "hh:mm a");

export const isBookingToday = (booking: VendorBooking) =>
  isSameDay(parseISO(booking.date), new Date());

const completedBookings = (bookings: VendorBooking[]) =>
  bookings.filter((booking) => booking.status === "completed");

export const getTodayEarnings = (bookings: VendorBooking[]) =>
  completedBookings(bookings)
    .filter((booking) => isSameDay(parseISO(booking.date), new Date()))
    .reduce((total, booking) => total + booking.price, 0);

export const getWeeklyEarnings = (bookings: VendorBooking[]) => {
  const today = new Date();
  const range = {
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
  };

  return completedBookings(bookings)
    .filter((booking) => isWithinInterval(parseISO(booking.date), range))
    .reduce((total, booking) => total + booking.price, 0);
};

export const getMonthlyEarnings = (bookings: VendorBooking[]) => {
  const today = new Date();
  const range = {
    start: startOfMonth(today),
    end: endOfMonth(today),
  };

  return completedBookings(bookings)
    .filter((booking) => isWithinInterval(parseISO(booking.date), range))
    .reduce((total, booking) => total + booking.price, 0);
};
