import { useEffect, useState } from "react";
import ActivityScreen from "@/components/trimo/ActivityScreen";
import BookingConfirmationScreen from "@/components/trimo/BookingConfirmationScreen";
import BottomNav from "@/components/trimo/BottomNav";
import CustomerAuthModal from "@/components/trimo/CustomerAuthModal";
import HomeScreen from "@/components/trimo/HomeScreen";
import HowItWorksScreen from "@/components/trimo/HowItWorksScreen";
import ProfileScreen from "@/components/trimo/ProfileScreen";
import ServiceSelectionScreen from "@/components/trimo/ServiceSelectionScreen";
import ShopDetailScreen from "@/components/trimo/ShopDetailScreen";
import SplashScreen from "@/components/trimo/SplashScreen";
import SuccessScreen from "@/components/trimo/SuccessScreen";
import TimeSelectionScreen from "@/components/trimo/TimeSelectionScreen";
import ValueScreen from "@/components/trimo/ValueScreen";
import { clearCustomerSession, getActiveCustomer } from "@/components/trimo/authStorage";
import {
  loadAllBookings,
  loadCustomerBookings,
  loadMarketplaceShops,
  saveBooking,
} from "@/components/trimo/marketplaceStorage";
import { loadStoredReviews, saveReview } from "@/components/trimo/reviewStorage";
import { CustomerRecord, Review, Screen, Service, Shop } from "@/components/trimo/types";
import ShopOwnerPortal from "@/components/vendor/ShopOwnerPortal";

type Tab = "home" | "activity" | "profile";
type AppMode = "customer" | "vendor" | null;
type AuthIntent = "profile" | "booking" | null;

export default function Index() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [appMode, setAppMode] = useState<AppMode>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [customer, setCustomer] = useState<CustomerRecord | null>(() => getActiveCustomer());
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reviews, setReviews] = useState<Review[]>(() => loadStoredReviews());
  const [confirmedBooking, setConfirmedBooking] = useState<{
    shop: Shop;
    services: Service[];
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    if (screen === "splash") {
      const timeoutId = setTimeout(() => setScreen("value"), 1800);
      return () => clearTimeout(timeoutId);
    }
  }, [screen]);

  const shops = loadMarketplaceShops(reviews);
  const allBookings = loadAllBookings();
  const customerBookings = customer ? loadCustomerBookings(customer.userId) : [];
  const bookingCount = customerBookings.filter(
    (booking) => booking.status === "pending" || booking.status === "confirmed"
  ).length;
  const reservedSlots = selectedShop
    ? allBookings
        .filter(
          (booking) =>
            booking.shopId === selectedShop.id &&
            (booking.status === "pending" || booking.status === "confirmed")
        )
        .reduce<Record<string, string[]>>((accumulator, booking) => {
          if (!accumulator[booking.date]) {
            accumulator[booking.date] = [];
          }

          accumulator[booking.date].push(booking.time);
          return accumulator;
        }, {})
    : {};

  const handleTab = (tab: Tab) => {
    if (tab === "profile" && !customer) {
      setAuthIntent("profile");
      setShowCustomerAuth(true);
      return;
    }

    setActiveTab(tab);
    if (tab === "home") setScreen("home");
    else if (tab === "activity") setScreen("activity");
    else if (tab === "profile") setScreen("profile");
  };

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop);
    setSelectedServices([]);
    setScreen("shopDetail");
  };

  const handleServiceToggle = (service: Service) => {
    setSelectedServices((prev) =>
      prev.some((selectedService) => selectedService.id === service.id)
        ? prev.filter((selectedService) => selectedService.id !== service.id)
        : [...prev, service]
    );
  };

  const handleOpenCustomer = () => {
    setAppMode("customer");
    setScreen("home");
    setActiveTab("home");
  };

  const handleOpenVendor = () => {
    setAppMode("vendor");
  };

  const handleExitVendor = () => {
    setAppMode(null);
    setScreen("value");
  };

  const handleSubmitReview = (review: Omit<Review, "reviewId" | "createdAt">) => {
    const nextReviews = saveReview({
      ...review,
      reviewId: `review-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    setReviews(nextReviews);
  };

  const handleCustomerAuthenticated = (nextCustomer: CustomerRecord) => {
    setCustomer(nextCustomer);
    setShowCustomerAuth(false);

    if (authIntent === "profile") {
      setActiveTab("profile");
      setScreen("profile");
    }

    if (authIntent === "booking" && selectedShop) {
      setScreen("serviceSelect");
    }

    setAuthIntent(null);
  };

  const handleCloseCustomerAuth = () => {
    setShowCustomerAuth(false);
    setAuthIntent(null);
  };

  const handleLogout = () => {
    clearCustomerSession();
    setCustomer(null);
    setActiveTab("home");
    setScreen("home");
  };

  const handleBookNow = () => {
    if (!customer) {
      setAuthIntent("booking");
      setShowCustomerAuth(true);
      return;
    }

    setScreen("serviceSelect");
  };

  const showBottomNav = ["home", "activity", "profile"].includes(screen);

  return (
    <div
      className="app-container relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {appMode === "vendor" ? (
        <ShopOwnerPortal onBackToCustomer={handleExitVendor} />
      ) : (
        <>
          {screen === "splash" && <SplashScreen />}

          {screen === "value" && (
            <ValueScreen onGetStarted={handleOpenCustomer} onOpenVendor={handleOpenVendor} />
          )}

          {screen === "home" && <HomeScreen shops={shops} onShopSelect={handleShopSelect} />}

          {screen === "shopDetail" && selectedShop && (
            <ShopDetailScreen
              shop={selectedShop}
              reviews={reviews}
              onBack={() => setScreen("home")}
              onBookNow={handleBookNow}
            />
          )}

          {screen === "serviceSelect" && selectedShop && (
            <ServiceSelectionScreen
              shopName={selectedShop.name}
              services={selectedShop.services}
              selected={selectedServices}
              onToggle={handleServiceToggle}
              onBack={() => setScreen("shopDetail")}
              onContinue={() => setScreen("timeSelect")}
            />
          )}

          {screen === "timeSelect" && selectedShop && (
            <TimeSelectionScreen
              shopName={selectedShop.name}
              totalPrice={selectedServices.reduce((acc, service) => acc + service.price, 0)}
              slots={selectedShop.availabilitySlots}
              blockedDates={selectedShop.blockedDates}
              reservedSlots={reservedSlots}
              onBack={() => setScreen("serviceSelect")}
              onContinue={(date, time) => {
                setSelectedDate(date);
                setSelectedTime(time);
                setScreen("confirmation");
              }}
            />
          )}

          {screen === "confirmation" && selectedShop && customer && (
            <BookingConfirmationScreen
              shop={selectedShop}
              services={selectedServices}
              date={selectedDate}
              time={selectedTime}
              customerPhone={customer.phone}
              onBack={() => setScreen("timeSelect")}
              onSuccess={(booking) => {
                saveBooking({
                  id: `booking-${Date.now()}`,
                  shopId: booking.shop.id,
                  userId: customer.userId,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  shopName: booking.shop.name,
                  shopImage: booking.shop.image,
                  service: booking.services.map((service) => service.name).join(", "),
                  date: booking.date,
                  time: booking.time,
                  address: booking.shop.address,
                  price: booking.services.reduce((acc, service) => acc + service.price, 0),
                  status: "pending",
                  createdAt: new Date().toISOString(),
                });
                setConfirmedBooking(booking);
                setScreen("success");
              }}
            />
          )}

          {screen === "success" && confirmedBooking && (
            <SuccessScreen
              shop={confirmedBooking.shop}
              services={confirmedBooking.services}
              date={confirmedBooking.date}
              time={confirmedBooking.time}
              onGoHome={() => {
                setScreen("home");
                setActiveTab("home");
              }}
              onViewBookings={() => {
                setScreen("activity");
                setActiveTab("activity");
              }}
            />
          )}

          {screen === "activity" && (
            <ActivityScreen
              bookings={customerBookings}
              reviews={reviews}
              onSubmitReview={handleSubmitReview}
              onGoHome={() => {
                setScreen("home");
                setActiveTab("home");
              }}
            />
          )}

          {screen === "profile" &&
            customer && (
              <ProfileScreen
                user={customer}
                onOpenHowItWorks={() => setScreen("howItWorks")}
                onLogout={handleLogout}
              />
            )}

          {screen === "howItWorks" && <HowItWorksScreen onBack={() => setScreen("profile")} />}

          {showBottomNav && (
            <BottomNav active={activeTab} onTab={handleTab} bookingCount={bookingCount} />
          )}

          <CustomerAuthModal
            open={showCustomerAuth}
            onClose={handleCloseCustomerAuth}
            onAuthenticated={handleCustomerAuthenticated}
          />
        </>
      )}
    </div>
  );
}
