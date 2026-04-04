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
    background: "hsl(28 96% 92%)",
    color: "hsl(28 92% 45%)",
    border: "hsl(28 88% 80%)",
  },
  confirmed: {
    label: "Confirmed",
    background: "hsl(214 96% 92%)",
    color: "hsl(214 92% 45%)",
    border: "hsl(214 88% 80%)",
  },
  active: {
    label: "In Progress",
    background: "hsl(270 96% 94%)",
    color: "hsl(270 70% 50%)",
    border: "hsl(270 80% 86%)",
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

// FIX #19: Use local date string (YYYY-MM-DD) for comparison to avoid UTC offset issues.
// new Date().toLocaleDateString("en-CA") returns the date in YYYY-MM-DD format in LOCAL timezone.
export const isBookingToday = (booking: VendorBooking) => {
  const todayLocal = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local tz
  return booking.date === todayLocal;
};

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

export const compressImage = (file: File, maxSize = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
