import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  ParkingSquare,
  Scissors,
  Star,
  Wifi,
  Wind,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Review, Service, Shop } from "./types";

interface Props {
  shop: Shop;
  reviews: Review[];
  onBack: () => void;
  onBookNow: () => void;
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  AC: <Wind className="h-3 w-3" />,
  "Wi-Fi": <Wifi className="h-3 w-3" />,
  Parking: <ParkingSquare className="h-3 w-3" />,
};

const parseGpsLocation = (value?: string) => {
  if (!value) return null;
  const match = value.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
};

function ServicePill({ service, onSelect }: { service: Service; onSelect: () => void }) {
  return (
    <div 
      onClick={onSelect}
      className="flex items-center justify-between border-b border-border py-4 last:border-0 cursor-pointer scale-tap transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Scissors className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{service.name}</p>
            {service.popular && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-amber-600">
                POPULAR
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">{service.duration}</p>
        </div>
      </div>
      <p className="text-[15px] font-bold text-accent">Rs {service.price}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const displayName = review.customerName || review.userId;

  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-xs font-bold text-primary">{displayName[0]}</span>
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">{displayName}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="mb-1.5 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className="h-2.5 w-2.5"
              style={{
                fill: index < Math.round(review.rating) ? "#facc15" : "transparent",
                color: index < Math.round(review.rating) ? "#facc15" : "hsl(var(--border))",
              }}
            />
          ))}
        </div>

        {review.reviewText && (
          <p className="text-xs leading-relaxed text-muted-foreground">{review.reviewText}</p>
        )}

        {review.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShopDetailScreen({ shop, reviews, onBack, onBookNow }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const shopReviews = reviews
    .filter((review) => review.shopId === shop.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const totalReviewCount = shopReviews.length;
  const averageRating =
    totalReviewCount > 0
      ? shopReviews.reduce((total, review) => total + review.rating, 0) / totalReviewCount
      : 0;
  const ratingLabel = totalReviewCount > 0 ? averageRating.toFixed(1) : "New";
  const locationText = shop.distance.includes("km")
    ? `${shop.distance} away / ${shop.locationLabel}`
    : shop.locationLabel;

  const coords = parseGpsLocation(shop.gpsLocation);
  const gmapsApiKey = import.meta.env.VITE_GMAPS_API_KEY;
  const mapUrl =
    coords && gmapsApiKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=16&size=800x400&markers=color:red%7C${coords.lat},${coords.lng}&key=${gmapsApiKey}`
      : null;

  const images = shop.images?.length ? shop.images : [shop.image];

  return (
    <div className="relative flex h-screen flex-col bg-muted/30">
      {/* Overlay header row — sits OUTSIDE the scroll container so it never scrolls.
          Uses absolute (not fixed) so it is not broken by the parent motion.div's will-change:transform */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pointer-events-none"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <button
          onClick={onBack}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/40 shadow-lg backdrop-blur-md scale-tap transition-transform border border-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md shadow-lg border border-white/20">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold text-white">{ratingLabel}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 scroll-smooth">
        {/* Top Image Slider Section */}
        <div className="relative h-72 w-full overflow-hidden bg-white" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {images.map((img, idx) => (
              <div className="relative min-w-0 flex-[0_0_100%] h-full" key={idx}>
                 <img src={img} alt={`${shop.name} ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-6 right-4 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedIndex ? "w-4 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-20 z-10 flex flex-col justify-end">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md leading-tight">{shop.name}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-white/90 drop-shadow">
               <MapPin className="h-3.5 w-3.5 shrink-0" />
               <p className="truncate text-xs font-medium">{shop.locationLabel}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-4 py-4 flex flex-col gap-4">
          
          {shop.isOpen === false && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 p-3 text-center mb-1 shadow-sm">
              <p className="text-sm font-bold text-red-600">Currently Closed</p>
              <p className="text-xs text-red-500 mt-0.5">This shop has temporarily stopped taking bookings.</p>
            </div>
          )}
          
          {/* Shop Header Info Card */}
          <div className="rounded-[16px] bg-white p-4 shadow-sm border border-border/50">
            <div className="mb-4">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                Barber Shop
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                   <Clock className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Open Time</p>
                  <p className="text-xs font-bold text-foreground">{shop.openTime} - {shop.closeTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                   <TrendingUp className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Distance</p>
                  <p className="text-xs font-bold text-foreground">{shop.distance}</p>
                </div>
              </div>

              {shop.tags.length > 0 && shop.tags.slice(0, 2).map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                     {TAG_ICONS[tag] ?? <CheckCircle className="h-4 w-4 text-slate-600" />}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Amenity</p>
                    <p className="text-xs font-bold text-foreground">{tag}</p>
                  </div>
                </div>
              ))}
            </div>

            {mapUrl && (
              <div className="mt-5 overflow-hidden rounded-[14px] shadow-sm">
                <img src={mapUrl} alt="Location Map" className="h-28 w-full object-cover" />
              </div>
            )}
          </div>

          <div className="rounded-[16px] bg-white p-4 shadow-sm border border-border/50">
            <h2 className="mb-2 text-[15px] font-bold text-foreground">About</h2>
            {shop.about ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{shop.about}</p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground italic">
                This shop has not added an about section yet.
              </p>
            )}
          </div>

          <div className="rounded-[16px] bg-white p-4 shadow-sm border border-border/50">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-foreground">Services</h2>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-accent">
                From Rs {shop.startingPrice}
              </span>
            </div>
            
            {shop.services.length === 0 ? (
              <div className="rounded-[14px] bg-muted/50 px-4 py-6 text-center mt-2">
                <p className="text-sm font-semibold text-foreground">No services live yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This shop needs to publish services before customers can book.
                </p>
              </div>
            ) : (
              <div className="mt-1">
                {shop.services.map((service) => <ServicePill key={service.id} service={service} onSelect={onBookNow} />)}
              </div>
            )}
          </div>

          <div className="rounded-[16px] bg-white p-4 shadow-sm border border-border/50">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Reviews</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">What customers are saying</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <p className="text-lg font-bold text-foreground leading-none">{ratingLabel}</p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{totalReviewCount} REVIEWS</p>
              </div>
            </div>

            {shopReviews.length === 0 ? (
              <div className="rounded-[14px] bg-muted/50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">No reviews yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reviews will appear here once customers complete their appointments.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                {shopReviews.slice(0, 4).map((review) => <ReviewCard key={review.reviewId} review={review} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.06)] px-4 py-4 z-50 rounded-t-[24px]">
        <div className="mx-auto flex max-w-[430px] items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Available</p>
            <p className="text-[15px] font-extrabold text-foreground mt-0.5">{shop.nextSlot}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Starting At</p>
            <p className="text-[15px] font-extrabold text-accent mt-0.5">Rs {shop.startingPrice}</p>
          </div>
        </div>
        <button
          onClick={onBookNow}
          disabled={shop.services.length === 0 || shop.isOpen === false}
          className={`w-full h-[56px] rounded-2xl text-base font-bold tracking-wide text-white scale-tap transition-transform disabled:cursor-not-allowed disabled:opacity-50 ${shop.services.length === 0 || shop.isOpen === false ? "bg-muted text-muted-foreground" : "customer-gradient shadow-[0_0_15px_rgba(143,0,255,0.3)]"}`}
        >
          {shop.isOpen === false ? "Shop Closed" : "Book Now"}
        </button>
      </div>
    </div>
  );
}
