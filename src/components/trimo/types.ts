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
  | "howItWorks";

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  image: string;
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
  services: Service[];
  availabilitySlots: TimeSlot[];
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
  shopId: string;
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
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt?: string;
}

export interface Review {
  reviewId: string;
  userId: string;
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
