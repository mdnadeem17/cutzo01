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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

function ServicePill({ service }: { service: Service }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Scissors className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{service.name}</p>
            {service.popular && (
              <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                Popular
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{service.duration}</p>
        </div>
      </div>
      <p className="text-sm font-bold text-accent">Rs {service.price}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const displayName = review.userId;

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

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-24">
      <div className="relative h-60 overflow-hidden">
        <img src={shop.image} alt={shop.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
        <button
          onClick={onBack}
          className="absolute left-4 top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="absolute right-4 top-12 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold text-foreground">{ratingLabel}</span>
          <span className="text-xs text-muted-foreground">({totalReviewCount})</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <div className="mb-2 flex items-start justify-between">
            <h1 className="text-xl font-bold text-card-foreground">{shop.name}</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {shop.category}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{shop.address}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {shop.openTime} - {shop.closeTime}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{locationText}</span>
            </div>
          </div>
          {shop.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {shop.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {TAG_ICONS[tag] ?? <CheckCircle className="h-3 w-3" />}
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <h2 className="mb-2 text-sm font-semibold text-foreground">About</h2>
          {shop.about ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{shop.about}</p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              This shop has not added an about section yet.
            </p>
          )}
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Services</h2>
            <span className="text-xs font-medium text-accent">Starting Rs {shop.startingPrice}</span>
          </div>
          {shop.services.length === 0 ? (
            <div className="rounded-[14px] bg-muted px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">No services live yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This shop needs to publish services before customers can book.
              </p>
            </div>
          ) : (
            shop.services.map((service) => <ServicePill key={service.id} service={service} />)
          )}
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
              <p className="mt-1 text-xs text-muted-foreground">Recent customer feedback builds trust.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{ratingLabel}</p>
              <p className="text-[11px] text-muted-foreground">{totalReviewCount} reviews</p>
            </div>
          </div>

          {shopReviews.length === 0 ? (
            <div className="rounded-[14px] bg-muted px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">No reviews yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reviews will appear here once customers complete their appointments.
              </p>
            </div>
          ) : (
            shopReviews.slice(0, 4).map((review) => <ReviewCard key={review.reviewId} review={review} />)
          )}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Next available</p>
            <p className="text-sm font-semibold text-foreground">{shop.nextSlot}</p>
          </div>
          <p className="font-bold text-accent">From Rs {shop.startingPrice}</p>
        </div>
        <button
          onClick={onBookNow}
          disabled={shop.services.length === 0}
          className="gradient-btn h-[50px] w-full rounded-[12px] text-base font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 scale-tap transition-transform"
          style={
            shop.services.length === 0
              ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              : {}
          }
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
}
