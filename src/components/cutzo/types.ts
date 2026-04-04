export type Screen =
  | "splash"
  | "value"
  | "home"
  | "shopDetail"
  | "serviceSelect"
  | "timeSelect"
  | "confirmation"
  | "success"
  | "activity"
  | "profile"
  | "howItWorks"
  | "savedShops"
  | "offers"
  | "personalInfo"
  | "notifications"
  | "privacy"
  | "help"
  | "about"
  | "shopLogin"
  | "registerShop";

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  image: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  bookingCount: number;
  distance: string;
  locationLabel: string;
  gpsLocation?: string;
  startingPrice: number;
  nextSlot: string;
  address: string;
  category: string;
  tags: string[];
  about: string;
  openTime: string;
  closeTime: string;
  isOpen?: boolean;
  services: Service[];
  availabilitySlots: TimeSlot[];
  slotDuration?: number;
  maxBookingsPerSlot?: number;
  breakTime?: { start: string; end: string } | null;
  blockedDates: string[];
}

export interface Service {
  id: string;
  name: string;
  icon: string;
  duration: string;
  price: number;
  popular?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  shopId: string;   // Convex _id of the shop document
  ownerId?: string; // ownerId (owner-XXXX) of the shop — used to match vendor bookings
  userId: string;
  customerName?: string;
  customerPhone?: string;
  shopName: string;
  shopImage: string;
  service: string;
  date: string;
  time: string;
  address: string;
  price: number;
  status: "pending" | "confirmed" | "active" | "cancelled" | "completed";
  createdAt?: string;
  otp?: number;
  otpVerified?: boolean;
}

export interface Review {
  reviewId: string;
  userId: string;
  customerName?: string;
  shopId: string;
  bookingId?: string;
  rating: number;
  reviewText: string;
  tags: string[];
  createdAt: string;
}

export interface CustomerRecord {
  userId: string;
  role: "customer";
  name: string;
  phone: string;
  location: string;
  gpsLocation?: string;
  createdAt: string;
  authProvider: "phone" | "google";
}

export interface AppState {
  screen: Screen;
  selectedShop: Shop | null;
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  activeTab: "home" | "activity" | "profile";
}
