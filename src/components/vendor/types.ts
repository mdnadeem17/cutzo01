export type VendorTab = "dashboard" | "bookings" | "services" | "profile";

export type VendorScreen = VendorTab | "availability" | "earnings";

export type VendorBookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface VendorBooking {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  status: VendorBookingStatus;
  otp?: number;
  otpVerified?: boolean;
}

export interface VendorService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category?: "Haircut" | "Beard" | "Facial" | "Kids" | "Other";
  popular?: boolean;
  available?: boolean;
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

export interface BreakTime {
  start: string;
  end: string;
}

export interface VendorProfile {
  shopName: string;
  ownerName: string;
  address: string;
  phone: string;
  images: string[];
  isOpen?: boolean;
}
