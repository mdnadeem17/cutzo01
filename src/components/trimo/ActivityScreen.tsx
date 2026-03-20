import { format, parseISO } from "date-fns";
import { Calendar, Clock, Eye, MapPin, RotateCcw, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Booking, Review } from "./types";

interface Props {
  bookings: Booking[];
  onGoHome: () => void;
  reviews: Review[];
  onSubmitReview: (review: Omit<Review, "reviewId" | "createdAt">) => void;
}

const REVIEW_TAGS = ["Clean", "Fast Service", "Good Staff", "Affordable"];

function formatBookingDate(value: string) {
  try {
    return format(parseISO(value), "EEE, MMM d");
  } catch {
    return value;
  }
}

function StatusChip({ status }: { status: Booking["status"] }) {
  const styles: Record<Booking["status"], { bg: string; text: string; label: string }> = {
    pending: { bg: "hsl(43,96%,95%)", text: "hsl(31,92%,45%)", label: "Pending" },
    confirmed: { bg: "hsl(189,93%,97%)", text: "hsl(189,93%,35%)", label: "Confirmed" },
    cancelled: { bg: "hsl(0,84%,97%)", text: "hsl(0,84%,50%)", label: "Cancelled" },
    completed: { bg: "hsl(142,76%,97%)", text: "hsl(142,76%,36%)", label: "Completed" },
  };
  const style = styles[status];

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function ReviewModal({
  booking,
  onClose,
  onSubmit,
}: {
  booking: Booking;
  onClose: () => void;
  onSubmit: (rating: number, reviewText: string, tags: string[]) => void;
}) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      setError("Select a star rating before submitting.");
      return;
    }

    onSubmit(rating, reviewText.trim(), selectedTags);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 fade-in" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[28px] bg-background px-5 pb-8 pt-6 slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rate your experience</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">{booking.shopName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{booking.service}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const active = index < rating;

            return (
              <button
                key={index}
                onClick={() => {
                  setRating(index + 1);
                  setError("");
                }}
                className="scale-tap transition-transform"
              >
                <Star
                  className="h-7 w-7"
                  style={{
                    fill: active ? "#facc15" : "transparent",
                    color: active ? "#facc15" : "hsl(var(--border))",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REVIEW_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);

              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-3.5 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    color: isSelected ? "#ffffff" : "hsl(var(--foreground))",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-6 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Review
          </span>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            className="min-h-[120px] rounded-[16px] border border-border bg-card px-4 py-3 text-sm font-medium outline-none"
            placeholder="Tell others how the service felt. This is optional."
          />
        </label>

        {error && (
          <div className="mt-4 rounded-[12px] bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="gradient-btn mt-6 h-[50px] w-full rounded-[14px] text-base font-semibold text-white"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  reviewed,
  onOpenReview,
}: {
  booking: Booking;
  reviewed: boolean;
  onOpenReview: (booking: Booking) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-[16px] bg-card card-shadow">
      <div className="flex gap-3 p-4">
        <img src={booking.shopImage} alt={booking.shopName} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-tight text-foreground">{booking.shopName}</p>
            <StatusChip status={booking.status} />
          </div>
          <p className="mb-1.5 text-xs font-medium text-accent">{booking.service}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatBookingDate(booking.date)}</span>
              <Clock className="ml-1 h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{booking.time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">{booking.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 pb-4 pt-3">
        <p className="text-xs font-bold text-foreground">Rs {booking.price}</p>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground scale-tap transition-transform">
            <Eye className="h-3 w-3" />
            Details
          </button>

          {(booking.status === "pending" || booking.status === "confirmed") && (
            <button className="flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive scale-tap transition-transform">
              <RotateCcw className="h-3 w-3" />
              Reschedule
            </button>
          )}

          {booking.status === "completed" && !reviewed && (
            <button
              onClick={() => onOpenReview(booking)}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white scale-tap transition-transform"
            >
              Rate Experience
            </button>
          )}

          {booking.status === "completed" && reviewed && (
            <div className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              Review Submitted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivityScreen({ bookings, onGoHome, reviews, onSubmitReview }: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [dismissedReviewIds, setDismissedReviewIds] = useState<string[]>([]);

  const upcoming = bookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const past = bookings.filter((booking) => booking.status === "completed" || booking.status === "cancelled");
  const list = activeTab === "upcoming" ? upcoming : past;

  const reviewedBookingIds = useMemo(
    () => new Set(reviews.map((review) => review.bookingId).filter(Boolean)),
    [reviews]
  );

  useEffect(() => {
    if (activeTab !== "past" || reviewTarget) {
      return;
    }

    const firstPendingReview = past.find(
      (booking) =>
        booking.status === "completed" &&
        !reviewedBookingIds.has(booking.id) &&
        !dismissedReviewIds.includes(booking.id)
    );

    if (firstPendingReview) {
      setReviewTarget(firstPendingReview);
    }
  }, [activeTab, dismissedReviewIds, past, reviewTarget, reviewedBookingIds]);

  const handleOpenReview = (booking: Booking) => {
    setReviewTarget(booking);
  };

  const handleCloseReview = () => {
    if (reviewTarget) {
      setDismissedReviewIds((current) =>
        current.includes(reviewTarget.id) ? current : [...current, reviewTarget.id]
      );
    }
    setReviewTarget(null);
  };

  const handleSubmitReview = (rating: number, reviewText: string, tags: string[]) => {
    if (!reviewTarget) {
      return;
    }

    setDismissedReviewIds((current) =>
      current.includes(reviewTarget.id) ? current : [...current, reviewTarget.id]
    );
    onSubmitReview({
      userId: reviewTarget.customerName || reviewTarget.userId,
      shopId: reviewTarget.shopId,
      bookingId: reviewTarget.id,
      rating,
      reviewText,
      tags,
    });
    setReviewTarget(null);
  };

  return (
    <>
      <div className="flex min-h-screen flex-col bg-muted pb-24">
        <div className="brand-gradient px-4 pb-6 pt-12">
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <p className="mt-1 text-sm text-light-text">Manage your appointments</p>
        </div>

        <div className="px-4 pt-4">
          <div className="mb-4 flex rounded-[12px] bg-card p-1 card-shadow">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="h-9 flex-1 rounded-[10px] text-sm font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "hsl(var(--primary))" : "transparent",
                  color: activeTab === tab ? "#ffffff" : "hsl(var(--muted-foreground))",
                }}
              >
                {tab} {tab === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No {activeTab} bookings</p>
              <p className="mb-4 mt-1 text-xs">Your real appointments will appear here</p>
              <button
                onClick={onGoHome}
                className="gradient-btn h-10 rounded-[10px] px-6 text-sm font-semibold text-white"
              >
                Browse Shops
              </button>
            </div>
          ) : (
            list.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                reviewed={reviewedBookingIds.has(booking.id)}
                onOpenReview={handleOpenReview}
              />
            ))
          )}
        </div>
      </div>

      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={handleCloseReview} onSubmit={handleSubmitReview} />
      )}
    </>
  );
}
