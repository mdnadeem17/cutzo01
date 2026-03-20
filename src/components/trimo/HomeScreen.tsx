import {
  Bell,
  ChevronRight,
  Clock,
  LocateFixed,
  MapPin,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { CATEGORIES, SHOPS } from "./data";
import { Shop } from "./types";

interface Props {
  onShopSelect: (shop: Shop) => void;
}

function ShopCard({ shop, onSelect }: { shop: Shop; onSelect: () => void }) {
  return (
    <div
      className="mb-4 cursor-pointer overflow-hidden rounded-[16px] bg-card card-shadow scale-tap transition-transform"
      onClick={onSelect}
    >
      <div className="relative h-44 overflow-hidden">
        <img src={shop.image} alt={shop.name} className="h-full w-full object-cover" />
        <div className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 backdrop-blur-sm">
          <span className="text-xs font-medium text-white">{shop.category}</span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 backdrop-blur-sm">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold text-foreground">{shop.rating}</span>
          <span className="text-xs text-muted-foreground">({shop.reviewCount})</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1.5 flex items-start justify-between">
          <h3 className="text-[16px] font-semibold leading-tight text-card-foreground">{shop.name}</h3>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mb-3 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs">
            {shop.distance} away / {shop.address.split(",")[1]?.trim()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-accent">Haircut from Rs {shop.startingPrice}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{shop.nextSlot}</span>
          </div>
        </div>

        <button
          className="gradient-btn mt-3 h-[42px] w-full rounded-[10px] text-sm font-semibold text-white scale-tap transition-transform"
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

const parseDistance = (value: string) => Number.parseFloat(value.replace(/[^\d.]/g, "")) || 999;

const getTrendingScore = (shop: Shop) => shop.rating * 100 + shop.bookingCount;

export default function HomeScreen({ onShopSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [loading] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [locationMessage, setLocationMessage] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const requestNearby = () => {
    setActiveCategory("Near Me");

    if (!navigator.geolocation) {
      setLocationState("denied");
      setLocationMessage("Please allow location to find nearby shops");
      return;
    }

    setLocationState("loading");
    setLocationMessage("Finding barber shops near you...");

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationState("granted");
        setLocationMessage("Showing nearby barber shops around your current location.");
      },
      () => {
        setLocationState("denied");
        setLocationMessage("Please allow location to find nearby shops");
      }
    );
  };

  const handleFilterClick = (category: string) => {
    if (category === "Near Me") {
      requestNearby();
      return;
    }

    setActiveCategory(category);
    setLocationMessage("");
  };

  const searchedShops = SHOPS.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchText.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchText.toLowerCase());

    return matchesSearch;
  });

  const filtered =
    activeCategory === "Near Me"
      ? locationState === "granted"
        ? searchedShops
            .filter((shop) => parseDistance(shop.distance) <= 1.5)
            .sort((left, right) => parseDistance(left.distance) - parseDistance(right.distance))
        : []
      : activeCategory === "Trending"
        ? [...searchedShops]
            .sort((left, right) => getTrendingScore(right) - getTrendingScore(left))
            .slice(0, 4)
        : searchedShops;

  const resultLabel =
    activeCategory === "Trending"
      ? "Trending shops"
      : activeCategory === "Near Me"
        ? "Nearby shops"
        : "shops found";

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div
        className="brand-gradient sticky top-0 z-10 px-4 pb-5 pt-12"
        style={{ boxShadow: "0 18px 40px rgba(30,58,138,0.16)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {greeting}
            </p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight text-white">
              Book the right barber
              <br />
              near you
            </h1>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl"
            style={{ boxShadow: "0 12px 24px rgba(9,25,71,0.14)" }}
          >
            <Bell className="h-5 w-5 text-white" />
          </button>
        </div>

        <div
          className="rounded-[22px] border border-white/14 px-4 py-3 backdrop-blur-xl"
          style={{
            background: "rgba(255,255,255,0.14)",
            boxShadow: "0 16px 30px rgba(8,24,68,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-white/80" />
            <input
              className="flex-1 bg-transparent text-[15px] font-medium text-white placeholder:text-white/70 outline-none"
              placeholder="Search barber shops..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto scrollbar-hide pb-1">
          <div className="inline-flex min-w-full gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleFilterClick(category)}
                className="h-10 shrink-0 rounded-[16px] px-4 text-[13px] font-semibold tracking-[0.01em] scale-tap transition-all"
                style={{
                  background: activeCategory === category ? "#06B6D4" : "rgba(255,255,255,0.2)",
                  color: activeCategory === category ? "#ffffff" : "#E0E7FF",
                  boxShadow: activeCategory === category ? "0 10px 22px rgba(6,182,212,0.28)" : "none",
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {activeCategory === "Near Me" && locationMessage && (
          <div
            className="mt-4 flex items-start gap-3 rounded-[18px] border px-4 py-3 backdrop-blur-xl"
            style={{
              background:
                locationState === "denied" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.14)",
              borderColor:
                locationState === "denied" ? "rgba(239,68,68,0.24)" : "rgba(255,255,255,0.14)",
            }}
          >
            <LocateFixed
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: locationState === "denied" ? "#fecaca" : "#ffffff" }}
            />
            <p className="text-xs leading-relaxed text-[#E0E7FF]">{locationMessage}</p>
          </div>
        )}

        {activeCategory === "Trending" && (
          <div
            className="mt-4 flex items-start gap-3 rounded-[18px] border border-white/14 px-4 py-3 backdrop-blur-xl"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-white" />
            <p className="text-xs leading-relaxed text-[#E0E7FF]">
              Trending shops are ranked by stronger ratings and more completed bookings on TRIMO.
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {filtered.length} {resultLabel}
          </p>
          <p className="text-xs font-semibold text-accent">
            {activeCategory === "Trending" ? "TRIMO Picks" : "Live Availability"}
          </p>
        </div>

        {loading
          ? Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
          : filtered.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onSelect={() => onShopSelect(shop)} />
            ))}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">
              {activeCategory === "Near Me" && locationState === "denied"
                ? "Location permission needed"
                : "No shops found"}
            </p>
            <p className="mt-1 text-xs">
              {activeCategory === "Near Me" && locationState === "denied"
                ? "Please allow location to find nearby shops"
                : "Try a different search or filter"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
