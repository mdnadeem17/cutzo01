import {
  Bell,
  Bookmark,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  LogOut,
  MapPin,
  Menu,
  Scissors,
  Search,
  Settings,
  Shield,
  Star,
  Tag,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { App } from "@capacitor/app";
import useEmblaCarousel from "embla-carousel-react";
import { useLoading } from "./LoadingContext";
import { api } from "../../../convex/_generated/api";
import { CustomerRecord, Screen, Shop } from "./types";

interface Props {
  onShopSelect: (shop: Shop) => void;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  customer: CustomerRecord | null;
}

interface Coordinates {
  lat: number;
  lng: number;
}

function ShopCard({ shop, onSelect }: { shop: Shop; onSelect: () => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const ratingLabel = shop.reviewCount > 0 ? shop.rating.toFixed(1) : "New";
  const locationLine = shop.locationLabel;
    
  const images = shop.images?.length ? shop.images : [shop.image];

  return (
    <div
      className="mb-4 cursor-pointer overflow-hidden rounded-[16px] bg-white card-shadow scale-tap transition-transform"
      onClick={onSelect}
    >
      <div className="relative h-48 overflow-hidden rounded-t-[16px]" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {images.map((img, idx) => (
            <div className="relative min-w-0 flex-[0_0_100%] h-full" key={idx}>
              <img 
                src={img} 
                alt={`${shop.name} ${idx + 1}`} 
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
              />
            </div>
          ))}
        </div>
        
        {/* Top left badge */}
        <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 backdrop-blur-md shadow-sm ${shop.isOpen === false ? 'bg-red-500/95' : 'bg-black/60'}`}>
          <span className="text-[10px] font-bold tracking-wider text-white uppercase">
            {shop.isOpen === false ? "Closed" : "Barber Shop"}
          </span>
        </div>
        
        {/* Top right rating */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 backdrop-blur-md shadow-sm">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-foreground">{ratingLabel}</span>
        </div>

        {/* Bottom dots for multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="mb-2">
          <h3 className="text-lg font-bold leading-tight text-foreground">{shop.name}</h3>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs font-medium">{locationLine}</span>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-sm font-extrabold text-foreground">
              {shop.startingPrice > 0 ? `Services from ₹${shop.startingPrice}` : "Pricing not set"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{shop.nextSlot}</span>
          </div>
        </div>

        <button
          className="customer-gradient h-[46px] w-full rounded-xl text-sm font-bold tracking-wide text-white scale-tap transition-transform shadow-[0_0_10px_rgba(143,0,255,0.25)]"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="mb-4 overflow-hidden rounded-[16px] bg-card card-shadow">
      <div className="h-44 shimmer" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded-full shimmer" />
        <div className="h-3 w-1/2 rounded-full shimmer" />
        <div className="h-3 w-1/3 rounded-full shimmer" />
        <div className="h-10 rounded-[10px] shimmer" />
      </div>
    </div>
  );
}

// ── Drawer Menu Component ────────────────────────────────────────────────
function DrawerMenu({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  customer,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  customer: CustomerRecord | null;
}) {
  // Handle Android back button
  useEffect(() => {
    if (!isOpen) return;
    const backListener = App.addListener("backButton", () => {
      onClose();
    });
    return () => {
      backListener.then((l) => l.remove());
    };
  }, [isOpen, onClose]);

  const initials = customer ? customer.name.slice(0, 2).toUpperCase() : "GU";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-[75%] max-w-[320px] bg-background shadow-2xl safe-top safe-bottom flex flex-col"
          >
            {/* Header */}
            <div className="customer-header px-4 pb-6 pt-6 relative">
              <button
                onClick={onClose}
                className="absolute right-4 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white scale-tap"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-white/30 shadow-sm animate-scale-in">
                  <span className="text-lg font-bold text-white">{initials}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg animate-fade-slide-up">{customer ? customer.name : "Guest User"}</h3>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate("profile");
                    }}
                    className="text-xs font-semibold text-white/80 animate-fade-in-delayed"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
              <div className="mb-6">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Menu
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { icon: Scissors, label: "My Bookings", screen: "activity" as Screen },
                    { icon: Bookmark, label: "Saved Shops", screen: "savedShops" as Screen },
                    { icon: Tag, label: "Offers & Coupons", screen: "offers" as Screen },
                  ].map(({ icon: Icon, label, screen }) => (
                    <button
                      key={label}
                      onClick={() => { onClose(); onNavigate(screen); }}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-left hover:bg-muted scale-tap transition-colors"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Business
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { icon: TrendingUp, label: "Register Your Shop", screen: "registerShop" as Screen },
                    { icon: User, label: "Shop Owner Login", screen: "shopLogin" as Screen },
                  ].map(({ icon: Icon, label, screen }) => (
                    <button
                      key={label}
                      onClick={() => { onClose(); onNavigate(screen); }}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-left hover:bg-muted scale-tap transition-colors"
                    >
                      <Icon className="h-5 w-5 text-accent" />
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Support
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { icon: HelpCircle, label: "Help Center", screen: "help" as Screen },
                    { icon: MapPin, label: "How CUTZO Works", screen: "howItWorks" as Screen },
                    { icon: Info, label: "About CUTZO", screen: "about" as Screen },
                    { icon: Shield, label: "Privacy Policy", screen: "privacy" as Screen },
                  ].map(({ icon: Icon, label, screen }) => (
                    <button
                      key={label}
                      onClick={() => { onClose(); onNavigate(screen); }}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left hover:bg-muted scale-tap transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4">
              {customer && (
                <button
                  onClick={onLogout}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-destructive/10 py-3 scale-tap transition-transform"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-bold text-destructive">Logout</span>
                </button>
              )}
              <p className="text-center text-xs font-semibold text-muted-foreground opacity-60">
                CUTZO App v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const getTrendingScore = (shop: Shop) => shop.rating * 100 + shop.bookingCount;

export default function HomeScreen({ onShopSelect, onNavigate, onLogout, customer }: Props) {
  const [searchText, setSearchText] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLoading, hideLoading } = useLoading();

  const handleScroll = () => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 10);
    }
  };

  // ── Pull-to-refresh state ───────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const REFRESH_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY === 0 || (scrollRef.current && scrollRef.current.scrollTop > 0)) return;
    const currentY = e.touches[0].pageY;
    if (currentY <= startY) return; // Ignore upward swipes
    
    // If we are at the top and pulling down, prevent native scroll to eliminate jank
    if (e.cancelable) e.preventDefault();
    
    const distance = currentY - startY;
    // Apply logarithmic damping for authentic native tension
    const maxPull = 160;
    const resistantDist = maxPull * Math.log10(1 + (distance * 0.5) / maxPull);
    setPullDistance(resistantDist);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Register touchmove as non-passive to allow preventDefault()
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [startY]); // Re-bind when startY changes to keep closure fresh

  const handleTouchEnd = () => {
    if (pullDistance > REFRESH_THRESHOLD) {
      triggerRefresh();
    }
    setPullDistance(0);
    setStartY(0);
  };

  const triggerRefresh = () => {
    setIsRefreshing(true);
    showLoading("Refreshing live data...");
    setTimeout(() => {
      setIsRefreshing(false);
      hideLoading();
    }, 800);
  };

  // Global loader for initial shop fetch
  const convexShopsQuery = useQuery(api.shops.getShops);
  const loading = convexShopsQuery === undefined;
  
  const convexShops = convexShopsQuery ?? [];

  // Notifications logic
  const { results: notificationResults } = usePaginatedQuery(
    api.profile.getUserNotifications,
    customer ? { userId: customer.userId } : "skip",
    { initialNumItems: 50 }
  );
  const notifications = notificationResults ?? [];
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length || 0;
  }, [notifications]);

  // Map Convex shop records to the local Shop type
  const shops: Shop[] = convexShops.map((s) => {
    const relationalServices: any[] = s.services ?? [];
    return {
      id: s._id as string,
      ownerId: s.ownerId,
      name: s.shopName ?? "Unnamed Shop",
      address: s.address ?? "No address provided",
      image: s.images?.[0] ?? s.image ?? "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80",
      images: s.images && s.images.length > 0 ? s.images : s.image ? [s.image] : [],
      rating: s.rating ?? 0,
      reviewCount: s.totalReviews ?? 0,
      bookingCount: 0,
      distance: s.locationLabel ?? s.address ?? "Nearby",
      locationLabel: s.locationLabel ?? s.address ?? "Nearby",
      startingPrice: s.startingPrice ?? 0,
      nextSlot: s.nextSlot ?? "Available",
      gpsLocation: s.gpsLocation,
      category: "Barber Shop",
      tags: [],
      about: "",
      openTime: s.openTime ?? "09:00",
      closeTime: s.closeTime ?? "21:00",
      isOpen: s.isOpen ?? true,
      slotDuration: s.slotDuration,
      maxBookingsPerSlot: s.maxBookingsPerSlot,
      breakTime: s.breakTime,
      services: relationalServices.map((svc: any, idx) => ({
        id: svc._id as string || `service-${idx}`,
        name: svc.name ?? "",
        icon: "Scissors",
        duration: `${svc.duration ?? 10} min`,
        price: svc.price ?? 0,
        popular: idx === 0,
      })),
      availabilitySlots: [],
      blockedDates: [],
    };
  });


  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const searchedShops = shops.filter((shop) => {
    const matchesSearch =
      (shop.name ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      (shop.address ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      (shop.locationLabel ?? "").toLowerCase().includes(searchText.toLowerCase());

    return matchesSearch;
  });

  const filtered = (() => {
    const result = [...searchedShops];
    result.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    return result;
  })();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Pull-to-refresh Indicator */}
      <div
        className="absolute left-0 right-0 top-0 z-[100] flex justify-center overflow-hidden pointer-events-none transition-all duration-300"
        style={{
          height: isRefreshing ? "80px" : `${pullDistance}px`,
          opacity: isRefreshing || pullDistance > 20 ? 1 : 0,
        }}
      >
        <div className="mt-12 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg pointer-events-auto">
          <div className={`ptr-spinner`} />
        </div>
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] pb-[8px] px-4 flex-none safe-top">
        <div className="flex flex-col items-center justify-center">
          <h1 className="font-montserrat text-2xl font-bold tracking-tight text-primary leading-tight">
            CUTZO
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-[2px] mb-[10px]">
            India's Barber Booking App
          </p>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto px-[16px] pt-[10px] pb-[110px] scroll-smooth"
      >
        <div className="flex items-center gap-[12px] mb-[20px]">
          <div className="flex-1 rounded-[22px] border border-border bg-white px-4 py-3 shadow-sm transition-all focus-within:shadow-md focus-within:border-primary/20">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none w-full"
                placeholder="Search barber shops..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
          </div>
          
          <button
            onClick={() => onNavigate("notifications")}
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[16px] border border-border bg-white scale-tap transition-transform shadow-sm relative"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute right-3 top-2.5 h-2.5 w-2.5 rounded-full bg-[#8F00FF] ring-2 ring-white" />
            )}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {loading ? "Loading..." : `${convexShops.length} Barber Shops Available`}
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
             <div className="flex space-x-2">
               <div className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: "0s" }} />
               <div className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: "0.15s" }} />
               <div className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: "0.3s" }} />
             </div>
          </div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.04 }, // Faster stagger for snappiness
              },
            }}
            initial="hidden"
            animate="show"
          >
            {filtered.map((shop) => (
              <motion.div
                key={shop.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                  },
                }}
                className="mb-[16px]"
              >
                <ShopCard shop={shop} onSelect={() => onShopSelect(shop)} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">No shops found</p>
            <p className="mt-1 text-xs">
              {shops.length === 0
                ? "A shop will appear here once an owner finishes setup and publishes services."
                : "Try a different search."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
