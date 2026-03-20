import { addDays, format, startOfToday, subDays } from "date-fns";
import {
  AvailabilitySlot,
  BlockedDate,
  VendorBooking,
  VendorProfile,
  VendorService,
  WorkingHours,
} from "./types";

const today = startOfToday();
const isoDate = (date: Date) => format(date, "yyyy-MM-dd");

export const initialVendorProfile: VendorProfile = {
  shopName: "Urban Edge Salon",
  ownerName: "Rahul Mehta",
  address: "214 Residency Road, Bengaluru",
  phone: "+91 98765 43210",
  images: [
    "https://images.unsplash.com/photo-1512690459411-b0fd1c86b8c8?w=800&q=80",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80",
    "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=800&q=80",
  ],
};

export const initialVendorServices: VendorService[] = [
  { id: "service-1", name: "Classic Haircut", durationMinutes: 30, price: 250 },
  { id: "service-2", name: "Beard Styling", durationMinutes: 20, price: 180 },
  { id: "service-3", name: "Haircut + Beard Combo", durationMinutes: 45, price: 420 },
  { id: "service-4", name: "Hair Spa Ritual", durationMinutes: 40, price: 650 },
  { id: "service-5", name: "Kids Haircut", durationMinutes: 25, price: 220 },
  { id: "service-6", name: "Premium Grooming", durationMinutes: 70, price: 900 },
];

export const initialVendorBookings: VendorBooking[] = [
  {
    id: "booking-1",
    customerName: "Arjun Verma",
    service: "Classic Haircut",
    date: isoDate(today),
    time: "09:00 AM",
    price: 250,
    status: "pending",
  },
  {
    id: "booking-2",
    customerName: "Vikram Rao",
    service: "Haircut + Beard Combo",
    date: isoDate(today),
    time: "10:00 AM",
    price: 420,
    status: "confirmed",
  },
  {
    id: "booking-3",
    customerName: "Sameer Khan",
    service: "Beard Styling",
    date: isoDate(today),
    time: "10:45 AM",
    price: 180,
    status: "pending",
  },
  {
    id: "booking-4",
    customerName: "Karan Iyer",
    service: "Hair Spa Ritual",
    date: isoDate(today),
    time: "11:30 AM",
    price: 650,
    status: "completed",
  },
  {
    id: "booking-5",
    customerName: "Rohit Das",
    service: "Kids Haircut",
    date: isoDate(today),
    time: "12:15 PM",
    price: 220,
    status: "completed",
  },
  {
    id: "booking-6",
    customerName: "Aditya Nair",
    service: "Premium Grooming",
    date: isoDate(today),
    time: "02:00 PM",
    price: 900,
    status: "confirmed",
  },
  {
    id: "booking-7",
    customerName: "Manav Shah",
    service: "Beard Styling",
    date: isoDate(today),
    time: "03:30 PM",
    price: 180,
    status: "pending",
  },
  {
    id: "booking-8",
    customerName: "Dev Bhatia",
    service: "Haircut + Beard Combo",
    date: isoDate(today),
    time: "05:00 PM",
    price: 420,
    status: "cancelled",
  },
  {
    id: "booking-9",
    customerName: "Kabir Sethi",
    service: "Haircut + Beard Combo",
    date: isoDate(addDays(today, 1)),
    time: "10:30 AM",
    price: 420,
    status: "confirmed",
  },
  {
    id: "booking-10",
    customerName: "Nikhil Jain",
    service: "Premium Grooming",
    date: isoDate(addDays(today, 2)),
    time: "01:15 PM",
    price: 900,
    status: "pending",
  },
  {
    id: "booking-11",
    customerName: "Rohan Gupta",
    service: "Classic Haircut",
    date: isoDate(subDays(today, 1)),
    time: "04:00 PM",
    price: 250,
    status: "completed",
  },
  {
    id: "booking-12",
    customerName: "Imran Ali",
    service: "Hair Spa Ritual",
    date: isoDate(subDays(today, 2)),
    time: "06:15 PM",
    price: 650,
    status: "completed",
  },
  {
    id: "booking-13",
    customerName: "Sarthak Bose",
    service: "Premium Grooming",
    date: isoDate(subDays(today, 5)),
    time: "11:45 AM",
    price: 900,
    status: "completed",
  },
  {
    id: "booking-14",
    customerName: "Dhruv Menon",
    service: "Beard Styling",
    date: isoDate(subDays(today, 12)),
    time: "01:30 PM",
    price: 180,
    status: "completed",
  },
  {
    id: "booking-15",
    customerName: "Mayank Singh",
    service: "Haircut + Beard Combo",
    date: isoDate(subDays(today, 20)),
    time: "03:00 PM",
    price: 420,
    status: "completed",
  },
];

export const initialAvailabilitySlots: AvailabilitySlot[] = [
  { id: "slot-1", time: "09:00 AM", enabled: true },
  { id: "slot-2", time: "10:00 AM", enabled: true },
  { id: "slot-3", time: "11:00 AM", enabled: true },
  { id: "slot-4", time: "12:00 PM", enabled: false },
  { id: "slot-5", time: "01:00 PM", enabled: true },
  { id: "slot-6", time: "02:00 PM", enabled: true },
  { id: "slot-7", time: "03:00 PM", enabled: true },
  { id: "slot-8", time: "04:00 PM", enabled: false },
  { id: "slot-9", time: "05:00 PM", enabled: true },
  { id: "slot-10", time: "06:00 PM", enabled: true },
  { id: "slot-11", time: "07:00 PM", enabled: true },
];

export const initialWorkingHours: WorkingHours = {
  start: "09:00",
  end: "21:00",
};

export const initialBlockedDates: BlockedDate[] = [
  {
    id: "blocked-1",
    date: isoDate(addDays(today, 3)),
    reason: "Team training session",
  },
  {
    id: "blocked-2",
    date: isoDate(addDays(today, 8)),
    reason: "Deep cleaning and maintenance",
  },
];
