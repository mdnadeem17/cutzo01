export type VendorTab = "dashboard" | "bookings" | "services" | "profile";

export type VendorScreen = VendorTab | "availability" | "earnings";

export type VendorBookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface VendorBooking {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  status: VendorBookingStatus;
}

export interface VendorService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface AvailabilitySlot {
  id: string;
  time: string;
  enabled: boolean;
}

export interface WorkingHours {
  start: string;
  end: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

export interface VendorProfile {
  shopName: string;
  ownerName: string;
  address: string;
  phone: string;
  images: string[];
}
