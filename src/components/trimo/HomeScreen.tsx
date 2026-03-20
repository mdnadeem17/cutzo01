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
import { CATEGORIES } from "./data";
import { Shop } from "./types";

interface Props {
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface VisibleShop extends Shop {
  distanceKm: number | null;
}

function ShopCard({ shop, onSelect }: { shop: VisibleShop; onSelect: () => void }) {
  const ratingLabel = shop.reviewCount > 0 ? shop.rating.toFixed(1) : "New";
  const locationLine =
    shop.distanceKm !== null ? `${shop.distance} away / ${shop.locationLabel}` : shop.locationLabel;

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
          <span className="text-xs font-semibold text-foreground">{ratingLabel}</span>
          <span className="text-xs text-muted-foreground">
            ({shop.reviewCount > 0 ? shop.reviewCount : 0})
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1.5 flex items-start justify-between">
          <h3 className="text-[16px] font-semibold leading-tight text-card-foreground">{shop.name}</h3>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mb-3 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs">{locationLine}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-accent">
              {shop.startingPrice > 0 ? `Services from Rs ${shop.startingPrice}` : "Pricing not set"}
            </span>
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

const parseGpsLocation = (value?: string): Coordinates | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);

  if (!match) {
    return null;
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
  };
};

const calculateDistanceKm = (source: Coordinates, target: Coordinates) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(target.lat - source.lat);
  const lngDelta = toRadians(target.lng - source.lng);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(toRadians(source.lat)) *
      Math.cos(toRadians(target.lat)) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getTrendingScore = (shop: Shop) => shop.rating * 100 + shop.bookingCount;

export default function HomeScreen({ shops, onShopSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [loading] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);

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
      (position) => {
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState("granted");
        setLocationMessage("Showing barber shops with live location data near you.");
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

  const visibleShops: VisibleShop[] = shops.map((shop) => {
    if (!currentCoords) {
      return { ...shop, distanceKm: null };
    }

    const targetCoords = parseGpsLocation(shop.gpsLocation);

    if (!targetCoords) {
      return { ...shop, distanceKm: null };
    }

    const distanceKm = calculateDistanceKm(currentCoords, targetCoords);

    return {
      ...shop,
      distanceKm,
      distance: `${distanceKm.toFixed(1)} km`,
    };
  });

  const searchedShops = visibleShops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchText.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchText.toLowerCase()) ||
      shop.locationLabel.toLowerCase().includes(searchText.toLowerCase());

    return matchesSearch;
  });

  const filtered =
    activeCategory === "Near Me"
      ? locationState === "granted"
        ? searchedShops
            .filter((shop) => shop.distanceKm !== null)
            .sort((left, right) => (left.distanceKm ?? 999) - (right.distanceKm ?? 999))
        : []
      : activeCategory === "Trending"
        ? [...searchedShops]
            .sort((left, right) => getTrendingScore(right) - getTrendingScore(left))
            .slice(0, 6)
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
              Trending shops are ranked using live bookings and customer reviews from this app.
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
            {activeCategory === "Trending" ? "Live Ranking" : "Live Availability"}
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
                : shops.length === 0
                  ? "No live shops yet"
                  : "No shops found"}
            </p>
            <p className="mt-1 text-xs">
              {activeCategory === "Near Me" && locationState === "denied"
                ? "Please allow location to find nearby shops"
                : shops.length === 0
                  ? "A shop will appear here once an owner finishes setup and publishes services."
                  : "Try a different search or filter"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
