import { useEffect, useState } from "react";
import SplashScreen from "@/components/trimo/SplashScreen";
import ValueScreen from "@/components/trimo/ValueScreen";
import HomeScreen from "@/components/trimo/HomeScreen";
import HowItWorksScreen from "@/components/trimo/HowItWorksScreen";
import ShopDetailScreen from "@/components/trimo/ShopDetailScreen";
import ServiceSelectionScreen from "@/components/trimo/ServiceSelectionScreen";
import TimeSelectionScreen from "@/components/trimo/TimeSelectionScreen";
import BookingConfirmationScreen from "@/components/trimo/BookingConfirmationScreen";
import SuccessScreen from "@/components/trimo/SuccessScreen";
import ActivityScreen from "@/components/trimo/ActivityScreen";
import ProfileScreen from "@/components/trimo/ProfileScreen";
import BottomNav from "@/components/trimo/BottomNav";
import CustomerAuthModal from "@/components/trimo/CustomerAuthModal";
import ShopOwnerPortal from "@/components/vendor/ShopOwnerPortal";
import {
  clearCustomerSession,
  getActiveCustomer,
} from "@/components/trimo/authStorage";
import { loadStoredReviews, saveReview } from "@/components/trimo/reviewStorage";
import { CustomerRecord, Review, Screen, Service, Shop } from "@/components/trimo/types";

type Tab = "home" | "activity" | "profile";
type AppMode = "customer" | "vendor" | null;
type AuthIntent = "profile" | null;

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
    shop: Shop; services: Service[]; date: string; time: string;
  } | null>(null);
  const [bookingCount, setBookingCount] = useState(2);

  // Splash auto-advance
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("value"), 1800);
      return () => clearTimeout(t);
    }
  }, [screen]);

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
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
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

  const handleSubmitReview = (
    review: Omit<Review, "reviewId" | "createdAt">
  ) => {
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

  const showBottomNav = ["home", "activity", "profile"].includes(screen);

  return (
    <div
      className="relative mx-auto overflow-hidden min-h-screen"
      style={{ maxWidth: "430px", background: "hsl(var(--background))" }}
    >
      {appMode === "vendor" ? (
        <ShopOwnerPortal onBackToCustomer={handleExitVendor} />
      ) : (
        <>
          {/* Screens */}
          {screen === "splash" && <SplashScreen />}

          {screen === "value" && (
            <ValueScreen
              onGetStarted={handleOpenCustomer}
              onOpenVendor={handleOpenVendor}
            />
          )}

          {screen === "home" && (
            <HomeScreen onShopSelect={handleShopSelect} />
          )}

          {screen === "shopDetail" && selectedShop && (
            <ShopDetailScreen
              shop={selectedShop}
              reviews={reviews}
              onBack={() => setScreen("home")}
              onBookNow={() => setScreen("serviceSelect")}
            />
          )}

          {screen === "serviceSelect" && selectedShop && (
            <ServiceSelectionScreen
              shopName={selectedShop.name}
              selected={selectedServices}
              onToggle={handleServiceToggle}
              onBack={() => setScreen("shopDetail")}
              onContinue={() => setScreen("timeSelect")}
            />
          )}

          {screen === "timeSelect" && selectedShop && (
            <TimeSelectionScreen
              shopName={selectedShop.name}
              totalPrice={selectedServices.reduce((acc, s) => acc + s.price, 0)}
              onBack={() => setScreen("serviceSelect")}
              onContinue={(date, time) => {
                setSelectedDate(date);
                setSelectedTime(time);
                setScreen("confirmation");
              }}
            />
          )}

          {screen === "confirmation" && selectedShop && (
            <BookingConfirmationScreen
              shop={selectedShop}
              services={selectedServices}
              date={selectedDate}
              time={selectedTime}
              onBack={() => setScreen("timeSelect")}
              onSuccess={(booking) => {
                setConfirmedBooking(booking);
                setBookingCount((c) => c + 1);
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
              onGoHome={() => { setScreen("home"); setActiveTab("home"); }}
              onViewBookings={() => { setScreen("activity"); setActiveTab("activity"); }}
            />
          )}

          {screen === "activity" && (
            <ActivityScreen
              reviews={reviews}
              onSubmitReview={handleSubmitReview}
              onGoHome={() => { setScreen("home"); setActiveTab("home"); }}
            />
          )}

          {screen === "profile" && (
            customer && (
              <ProfileScreen
                user={customer}
                onOpenHowItWorks={() => setScreen("howItWorks")}
                onLogout={handleLogout}
              />
            )
          )}

          {screen === "howItWorks" && (
            <HowItWorksScreen onBack={() => setScreen("profile")} />
          )}

          {/* Bottom Navigation */}
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
