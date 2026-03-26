import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { App } from "@capacitor/app";
import { auth } from "../lib/firebase";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { toast } from "sonner";
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
import {
  AboutScreen,
  HelpScreen,
  NotificationsScreen,
  OffersScreen,
  PersonalInfoScreen,
  PrivacyScreen,
  SavedShopsScreen,
} from "@/components/trimo/ProfileSubScreens";
import TimeSelectionScreen from "@/components/trimo/TimeSelectionScreen";
import ValueScreen from "@/components/trimo/ValueScreen";
import { clearCustomerSession, getActiveCustomer } from "@/components/trimo/authStorage";
import { CustomerRecord, Review, Screen, Service, Shop } from "@/components/trimo/types";
import ShopOwnerPortal from "@/components/vendor/ShopOwnerPortal";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { formatError } from "@/lib/errorUtils";

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App crash:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100dvh", background: "#0f172a",
          color: "#fff", padding: "32px", textAlign: "center", gap: "16px"
        }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800 }}>Something went wrong</h2>
          <p style={{ fontSize: "14px", color: "#f87171", fontWeight: 600 }}>
            {this.state.error.name}: {this.state.error.message}
          </p>
          <div style={{
            background: "rgba(0,0,0,0.3)",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "10px",
            color: "#94a3b8",
            textAlign: "left",
            maxWidth: "100%",
            overflow: "auto",
            maxHeight: "200px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap"
          }}>
            {this.state.error.stack || "No stack trace available"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px", padding: "12px 28px", borderRadius: "12px",
              background: "#6366f1", color: "#fff", fontWeight: 700,
              fontSize: "14px", border: "none", cursor: "pointer"
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = "home" | "activity" | "profile";
type AppMode = "customer" | "vendor" | null;
type AuthIntent = "profile" | "booking" | null;
type NavDir = "forward" | "back";

// Screens with a logical "parent" — going to a parent is a back navigation
const BACK_SCREENS = new Set<Screen>(["home", "splash", "value"]);

const SCREEN_TRANSITION = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
  opacity: { duration: 0.25 },
};

const screenVariants: Variants = {
  enter: (dir: NavDir) => ({
    opacity: 0,
    x: dir === "forward" ? "100%" : "-30%",
    zIndex: dir === "forward" ? 20 : 10,
    transition: SCREEN_TRANSITION,
  }),
  center: {
    opacity: 1,
    x: "0%",
    zIndex: 20,
    transition: SCREEN_TRANSITION,
  },
  exit: (dir: NavDir) => ({
    opacity: 0,
    x: dir === "forward" ? "-30%" : "100%",
    zIndex: dir === "forward" ? 10 : 20,
    transition: SCREEN_TRANSITION,
  }),
};

export default function Index() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [navDir, setNavDir] = useState<NavDir>("forward");
  const [appMode, setAppMode] = useState<AppMode>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [customer, setCustomer] = useState<CustomerRecord | null>(() => getActiveCustomer());
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<{
    shop: Shop;
    services: Service[];
    date: string;
    time: string;
    id?: string;
    otp?: number;
  } | null>(null);

  const createBooking = useMutation(api.bookings.createBooking);
  const cancelBookingMutation = useMutation(api.bookings.cancelBooking);
  const rescheduleBookingMutation = useMutation(api.bookings.rescheduleBooking);
  const submitReviewMutation = useMutation(api.reviews.submitReview);

  // Auto-advance past splash screen
  useEffect(() => {
    if (screen === "splash") {
      const timeoutId = setTimeout(() => setScreen("value"), 1800);
      return () => clearTimeout(timeoutId);
    }
  }, [screen]);

  // Android hardware back button: navigate instead of exit
  useEffect(() => {
    const handler = App.addListener("backButton", () => {
      if (appMode === "vendor") return;

      // Map each screen to its logical "back" destination
      const backMap: Partial<Record<Screen, Screen>> = {
        shopDetail: "home",
        serviceSelect: "shopDetail",
        timeSelect: "serviceSelect",
        confirmation: "timeSelect",
        success: "home",
        activity: "home",
        profile: "home",
        howItWorks: "profile",
        savedShops: "profile",
        offers: "profile",
        personalInfo: "profile",
        notifications: "profile",
        privacy: "profile",
        help: "profile",
        about: "profile",
        shopLogin: "home",
        registerShop: "home",
        value: "value", // stay on value (welcome) — no exit
      };

      const previous = backMap[screen];
      if (previous) {
        navigateTo(previous, "back");
      } else if (screen === "home") {
        // Exit app only from Home screen
        App.exitApp();
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [screen]);
  // ── Live customer bookings from Convex (Paginated) ───────────────────────
  const { results: convexBookingsRaw, status: bookingsStatus, loadMore: loadMoreBookings } = usePaginatedQuery(
    api.bookings.getBookingsByCustomer,
    customer ? { customerId: customer.userId } : "skip",
    { initialNumItems: 10 }
  );

  const bookingsLoading = bookingsStatus === "LoadingFirstPage";
  const canLoadMoreBookings = bookingsStatus === "CanLoadMore";
  const isLoadingMoreBookings = bookingsStatus === "LoadingMore";

  // Map to local Booking type for ActivityScreen
  const customerBookings: any[] = (convexBookingsRaw ?? []).map((b: any) => ({
    id: b._id,
    shopId: b.shopId,
    ownerId: b.ownerId ?? "",
    userId: b.customerId,
    customerName: b.customerName,
    customerPhone: b.customerPhone ?? "",
    shopName: b.shopName,
    shopImage: b.shopImage ?? "",
    service: b.service,
    date: b.date,
    time: b.time,
    address: b.address ?? "",
    price: b.price,
    status: b.status,
    otp: b.otp,
    otpVerified: b.otpVerified,
    createdAt: b._creationTime ? new Date(Number(b._creationTime)).toISOString() : (b.date || new Date().toISOString()),
  }));

  const bookingCount = customerBookings.filter(
    (booking) => booking.status === "pending" || booking.status === "confirmed" || booking.status === "active"
  ).length;

  const reviewedBookingIdsRaw = useQuery(
    api.reviews.getReviewedBookingIds,
    customer ? { customerId: customer.userId } : "skip"
  );
  const reviewedBookingIds = new Set(reviewedBookingIdsRaw || []);

  const today = new Date().toISOString().split("T")[0];
  const dbBookedSlots = useQuery(
    api.shops.getShopBookedSlots,
    selectedShop ? { shopId: selectedShop.id as Id<"shops">, fromDate: today } : "skip"
  );

  // Fetch full shop details (relational services, etc.) only when a shop is selected
  const fullShopDetails = useQuery(
    api.shops.getShopById,
    selectedShop ? { shopId: selectedShop.id as Id<"shops"> } : "skip"
  );

  // The local 'effectiveShop' uses the full data if available, otherwise falls back to the list summary
  const effectiveShop = fullShopDetails
    ? ({
        ...selectedShop,
        ...fullShopDetails,
        services: (fullShopDetails.services || []).map((s) => ({
          ...s,
          id: s._id,
          duration: `${s.duration} min`,
          icon: "Scissors", // Default icon as expected by Service interface
        })),
      } as any as Shop)
    : selectedShop;

  const reservedSlots = selectedShop && dbBookedSlots
    ? dbBookedSlots.reduce<Record<string, Record<string, number>>>((accumulator, slot) => {
        if (!accumulator[slot.date]) {
          accumulator[slot.date] = {};
        }
        accumulator[slot.date][slot.time] = slot.bookedCount;
        return accumulator;
      }, {})
    : {};

  // Central navigation function — tracks forward vs back direction for animations
  const navigateTo = (nextScreen: Screen, dir: NavDir = "forward") => {
    if (nextScreen === "shopLogin" || nextScreen === "registerShop") {
      setAppMode("vendor");
      setScreen("value");
      return;
    }
    setNavDir(dir);
    setScreen(nextScreen);
    // Update tab highlight when navigating to tab screens
    if (nextScreen === "home") setActiveTab("home");
    if (nextScreen === "profile") setActiveTab("profile");
    if (nextScreen === "activity") setActiveTab("activity");
  };

  // Remove old CSS transition class since framer-motion handles it

  const handleTab = (tab: Tab) => {
    if (tab === "profile" && !customer) {
      setAuthIntent("profile");
      setShowCustomerAuth(true);
      return;
    }

    setActiveTab(tab);
    if (tab === "home") navigateTo("home", "back");
    else if (tab === "activity") navigateTo("activity");
    else if (tab === "profile") navigateTo("profile");
  };

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop);
    setSelectedServices([]);
    navigateTo("shopDetail");
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
    navigateTo("home", "forward");
  };

  const handleOpenVendor = () => {
    setAppMode("vendor");
  };

  const handleExitVendor = () => {
    setAppMode(null);
    navigateTo("value", "back");
  };

  const handleSubmitReview = async (review: Omit<Review, "reviewId" | "createdAt" | "customerName"> & { customerName?: string }) => {

    // Persist to Convex (updates shop rating too)
    try {
      await submitReviewMutation({
        customerId: review.userId,
        customerName: review.customerName || customer?.name || "Anonymous",
        shopId: review.shopId as Id<"shops">,
        bookingId: review.bookingId as Id<"bookings">,
        rating: review.rating,
        reviewText: review.reviewText,
      });
    } catch (err) {
      // non-critical — local state already updated
      console.error("Review submission failed:", err);
    }
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


  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Firebase signOut error (non-critical):", e);
    }
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
      className="app-container relative"
      style={{ background: "hsl(var(--background))", minHeight: "100vh" }}
    >
      {appMode === "vendor" ? (
        <ShopOwnerPortal onBackToCustomer={handleExitVendor} />
      ) : (
        <div className="customer-theme w-full min-h-screen">
          <div className="grid grid-cols-1 grid-rows-1 relative min-h-screen overflow-x-hidden">
            <AnimatePresence initial={false} custom={navDir} mode="popLayout">
              <motion.div
                key={screen}
                custom={navDir}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="col-start-1 row-start-1 w-full bg-background"
              >
                {screen === "splash" && <SplashScreen />}

          {screen === "value" && (
            <ValueScreen onGetStarted={handleOpenCustomer} onOpenVendor={handleOpenVendor} />
          )}

          {screen === "home" && (
            <HomeScreen
              onShopSelect={handleShopSelect}
              onNavigate={(s) => navigateTo(s)}
              onLogout={handleLogout}
              customer={customer}
            />
          )}

          {screen === "shopDetail" && effectiveShop && (
            <ShopDetailScreen
              shop={effectiveShop}
              onBack={() => navigateTo("home", "back")}
              onBookNow={handleBookNow}
              onOpenNotifications={() => navigateTo("notifications")}
            />
          )}

          {screen === "serviceSelect" && effectiveShop && (
            <ServiceSelectionScreen
              shopName={effectiveShop.name}
              services={effectiveShop.services}
              selected={selectedServices}
              onToggle={handleServiceToggle}
              onBack={() => navigateTo("shopDetail", "back")}
              onContinue={() => navigateTo("timeSelect")}
            />
          )}

          {screen === "timeSelect" && effectiveShop && (
            <TimeSelectionScreen
              shopId={effectiveShop.id}
              shopName={effectiveShop.name}
              totalPrice={selectedServices.reduce((acc, service) => acc + service.price, 0)}
              onBack={() => navigateTo("serviceSelect", "back")}
              onContinue={(date, time) => {
                setSelectedDate(date);
                setSelectedTime(time);
                navigateTo("confirmation");
              }}
            />
          )}

          {screen === "confirmation" && effectiveShop && customer && (
            <BookingConfirmationScreen
              shop={effectiveShop}
              services={selectedServices}
              date={selectedDate}
              time={selectedTime}
              customerPhone={customer.phone}
              onBack={() => navigateTo("timeSelect", "back")}
              onSuccess={async (booking) => {
                try {
                  // Save to Convex — single source of truth
                  const { bookingId, otp } = await createBooking({
                    customerId: customer.userId,
                    shopId: booking.shop.id as Id<"shops">,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    services: booking.services.map(s => ({
                      id: s.id,
                      name: s.name,
                      price: s.price,
                      duration: typeof s.duration === "string" ? parseInt(s.duration) || 0 : s.duration
                    })),
                    totalAmount: booking.services.reduce((acc, s) => acc + s.price, 0),
                    date: booking.date,
                    time: booking.time,
                    clientNow: Date.now(),
                  });

                  setConfirmedBooking({ ...booking, id: bookingId, otp });
                  navigateTo("success");
                } catch (error: any) {
                  toast.error(error.message || "Failed to book slot. It might be full already.");
                }
              }}
            />
          )}

          {screen === "success" && confirmedBooking && (
            <SuccessScreen
              shop={confirmedBooking.shop}
              services={confirmedBooking.services}
              date={confirmedBooking.date}
              time={confirmedBooking.time}
              id={confirmedBooking.id}
              otp={confirmedBooking.otp}
              onGoHome={() => navigateTo("home", "back")}
              onViewBookings={() => navigateTo("activity")}
            />
          )}

          {screen === "activity" && (
            <ActivityScreen
              bookings={customerBookings}
              bookingsLoading={bookingsLoading}
              canLoadMore={canLoadMoreBookings}
              isLoadingMore={isLoadingMoreBookings}
              onLoadMore={() => loadMoreBookings(10)}
              reviewedBookingIds={reviewedBookingIds}
              onSubmitReview={handleSubmitReview}
              onGoHome={() => navigateTo("home", "back")}
              onCancelBooking={async (bookingId) => {
                if (!customer) return;
                try {
                  await cancelBookingMutation({
                    bookingId: bookingId as Id<"bookings">,
                    callerCustomerId: customer.userId,
                  });
                } catch (err: any) {
                  toast.error(err.message ?? "Failed to cancel booking.");
                }
              }}
              onRescheduleBooking={async (bookingId, newDate, newTime) => {
                if (!customer) return;
                try {
                  await rescheduleBookingMutation({
                    bookingId: bookingId as Id<"bookings">,
                    newDate,
                    newTime,
                    callerCustomerId: customer.userId,
                  });
                } catch (err: any) {
                  toast.error(err.message ?? "Failed to reschedule booking.");
                }
              }}
            />
          )}

          {screen === "profile" && customer && (
            <ProfileScreen
              user={customer}
              onNavigate={(s) => navigateTo(s)}
              onLogout={handleLogout}
            />
          )}

          {screen === "savedShops" && customer && (
            <SavedShopsScreen
              userId={customer.userId}
              onBack={() => navigateTo("profile", "back")}
            />
          )}

          {screen === "offers" && customer && (
            <OffersScreen
              city={customer.location}
              onBack={() => navigateTo("profile", "back")}
            />
          )}

          {screen === "personalInfo" && customer && (
            <PersonalInfoScreen
              userId={customer.userId}
              onBack={() => navigateTo("profile", "back")}
            />
          )}

          {screen === "notifications" && customer && (
            <NotificationsScreen
              userId={customer.userId}
              onBack={() => navigateTo("profile", "back")}
            />
          )}

          {screen === "privacy" && (
            <PrivacyScreen onBack={() => navigateTo("profile", "back")} />
          )}

          {screen === "help" && (
            <HelpScreen onBack={() => navigateTo("profile", "back")} />
          )}

          {screen === "about" && (
            <AboutScreen onBack={() => navigateTo("profile", "back")} />
          )}

          {screen === "howItWorks" && <HowItWorksScreen onBack={() => navigateTo("profile", "back")} />}

          </motion.div>
            </AnimatePresence>
          </div>

          {showBottomNav && (
            <BottomNav active={activeTab} onTab={handleTab} bookingCount={bookingCount} />
          )}

          <CustomerAuthModal
            open={showCustomerAuth}
            onClose={handleCloseCustomerAuth}
            onAuthenticated={handleCustomerAuthenticated}
          />
        </div>
      )}
    </div>
  );
}
