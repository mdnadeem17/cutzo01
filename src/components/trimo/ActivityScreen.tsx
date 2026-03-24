import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Booking, Review } from "./types";

interface Props {
  bookings: Booking[];
  bookingsLoading?: boolean;
  onGoHome: () => void;
  reviews: Review[];
  onSubmitReview: (review: Omit<Review, "reviewId" | "createdAt">) => void;
  onCancelBooking: (bookingId: string) => Promise<void>; // Convex mutation
  onRescheduleBooking: (bookingId: string, newDate: string, newTime: string) => Promise<void>; // Convex mutation
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const REVIEW_TAGS = ["Clean", "Fast Service", "Good Staff", "Affordable", "On Time"];

function fmtDate(value: string) {
  try {
    return format(parseISO(value), "EEE, d MMM yyyy");
  } catch {
    return value;
  }
}

// Build a grid of time slots between openTime and closeTime (hourly)
function buildSlots(openTime = "09:00", closeTime = "21:00"): string[] {
  const slots: string[] = [];
  const [startH] = openTime.split(":").map(Number);
  const [endH] = closeTime.split(":").map(Number);
  for (let h = startH; h < endH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h + 0.5 < endH) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  Booking["status"],
  { bg: string; text: string; dot: string; label: string }
> = {
  pending: {
    bg: "hsl(38,95%,94%)",
    text: "hsl(27,90%,42%)",
    dot: "hsl(38,90%,52%)",
    label: "Pending",
  },
  confirmed: {
    bg: "hsl(210,100%,94%)",
    text: "hsl(210,100%,40%)",
    dot: "hsl(210,100%,50%)",
    label: "Confirmed",
  },
  active: {
    bg: "hsl(262,80%,94%)",
    text: "hsl(262,80%,42%)",
    dot: "hsl(262,80%,52%)",
    label: "Active",
  },
  completed: {
    bg: "hsl(142,72%,94%)",
    text: "hsl(142,72%,32%)",
    dot: "hsl(142,72%,40%)",
    label: "Completed",
  },
  cancelled: {
    bg: "hsl(0,86%,95%)",
    text: "hsl(0,86%,48%)",
    dot: "hsl(0,86%,56%)",
    label: "Cancelled",
  },
};

function StatusBadge({ status }: { status: Booking["status"] }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: m.bg, color: m.text }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: m.dot }}
      />
      {m.label}
    </span>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-28 left-0 right-0 z-[200] flex justify-center pointer-events-none px-4">
      <div
        className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl"
        style={{ background: "hsl(142,72%,36%)", maxWidth: 320 }}
      >
        <Check className="h-4 w-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}

// ─── Cancel Confirmation Bottom Sheet ──────────────────────────────────────

function CancelSheet({
  booking,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50"
      style={{ backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[28px] bg-background px-5 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border" />

        {/* Icon */}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "hsl(0,86%,95%)" }}
        >
          <X className="h-7 w-7" style={{ color: "hsl(0,86%,48%)" }} />
        </div>

        <h2 className="text-center text-xl font-bold text-foreground">
          Cancel Booking?
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Are you sure you want to cancel your appointment at{" "}
          <strong>{booking.shopName}</strong>? This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="h-[52px] w-full rounded-[14px] text-base font-bold text-white scale-tap"
            style={{ background: "hsl(0,86%,48%)" }}
          >
            Yes, Cancel Booking
          </button>
          <button
            onClick={onClose}
            className="h-[52px] w-full rounded-[14px] border border-border text-base font-semibold text-foreground scale-tap"
          >
            No, Keep It
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ──────────────────────────────────────────────────────────

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

  const toggleTag = (tag: string) =>
    setSelectedTags((cur) =>
      cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
    );

  const handleSubmit = () => {
    if (rating === 0) { setError("Please select a star rating."); return; }
    onSubmit(rating, reviewText.trim(), selectedTags);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/55" onClick={onClose}>
      <div
        className="fixed inset-x-0 mx-auto max-w-[430px] rounded-t-[25px] bg-background flex flex-col"
        style={{ bottom: "77px", maxHeight: "calc(100dvh - 120px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="shrink-0 pt-4 pb-2 flex justify-center">
          <div className="h-1 w-12 rounded-full bg-border" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rate your experience</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{booking.shopName}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{booking.service}</p>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => { setRating(i + 1); setError(""); }} className="scale-tap">
                <Star
                  className="h-9 w-9"
                  style={{ fill: i < rating ? "#facc15" : "transparent", color: i < rating ? "#facc15" : "hsl(var(--border))" }}
                />
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-3.5 py-2 text-xs font-semibold transition-all scale-tap"
                  style={{
                    background: selectedTags.includes(tag) ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    color: selectedTags.includes(tag) ? "#fff" : "hsl(var(--foreground))",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <label className="mt-5 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Review (optional)</span>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="min-h-[100px] rounded-[16px] border border-border bg-card px-4 py-3 text-sm font-medium outline-none"
              placeholder="Tell others how the service felt…"
            />
          </label>

          {error && (
            <div className="mt-3 rounded-[12px] bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Sticky submit button — always visible at bottom of sheet */}
        <div className="shrink-0 px-5 pt-3 pb-6 border-t border-border/50 bg-background">
          <button
            onClick={handleSubmit}
            className="flex w-full items-center justify-center font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 shadow-lg scale-tap"
            style={{ height: "56px", borderRadius: "16px" }}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Details View ──────────────────────────────────────────────────

function BookingDetailsView({
  booking,
  reviewed,
  onBack,
  onCancel,
  onReschedule,
  onOpenReview,
}: {
  booking: Booking;
  reviewed: boolean;
  onBack: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onOpenReview: () => void;
}) {
  const canAct = booking.status === "pending" || booking.status === "confirmed";
  const m = STATUS_META[booking.status];

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="shrink-0 customer-header px-4 pb-6 pt-4 safe-top">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 scale-tap"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white animate-fade-slide-up">Booking Details</h1>
        <p className="mt-1 text-sm text-white/70 animate-fade-in-delayed">Full appointment information</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-3">

        {/* Status Banner */}
        <div
          className="flex items-center gap-3 rounded-[16px] px-4 py-3"
          style={{ background: m.bg }}
        >
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: m.dot }} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: m.text }}>
              Booking Status
            </p>
            <p className="text-sm font-bold" style={{ color: m.text }}>{m.label}</p>
          </div>
        </div>

        {/* Shop Card */}
        <div className="rounded-[18px] bg-card overflow-hidden card-shadow">
          {booking.shopImage && (
            <img
              src={booking.shopImage}
              alt={booking.shopName}
              className="h-40 w-full object-cover"
            />
          )}
          <div className="p-4">
            <h2 className="text-lg font-bold text-foreground">{booking.shopName}</h2>
            <div className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <p className="text-xs font-medium">{booking.address}</p>
            </div>
          </div>
        </div>

        {/* Date / Time / Price */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Calendar, label: "Date", value: fmtDate(booking.date) },
            { icon: Clock, label: "Time", value: booking.time },
            { icon: CalendarCheck, label: "Total", value: `₹${booking.price}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[14px] bg-card p-3 text-center card-shadow">
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-xs font-bold text-foreground leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="rounded-[18px] bg-card p-4 card-shadow">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Services Booked
          </p>
          {booking.service.split(",").map((svc) => (
            <div
              key={svc}
              className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
            >
              <p className="text-sm font-medium text-foreground">{svc.trim()}</p>
              <Check className="h-4 w-4 text-accent" />
            </div>
          ))}
        </div>

        {/* OTP Collection Box */}
        {booking.otp && (
          <div className="rounded-xl bg-[#F8F0FF] border border-[#8F00FF] p-5 text-center shadow-[0_0_10px_rgba(143,0,255,0.2)]">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#8F00FF]/80 mb-2">Service OTP</p>
            <p className="text-[40px] leading-tight font-black tracking-[0.25em] ml-[0.25em] text-[#8F00FF]">{booking.otp}</p>
            <p className="mt-2 text-xs font-bold text-[#8F00FF]/70">
              {booking.status === "active" || booking.status === "completed"
                ? "OTP verified ✅" 
                : "Share this code with the shop to start your service."}
            </p>
          </div>
        )}

        {/* Booking ID */}
        <div className="rounded-[14px] bg-muted px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Booking ID
          </p>
          <p className="mt-0.5 font-mono text-xs text-foreground">{booking.id}</p>
        </div>
      </div>

      {/* Actions */}
      {canAct && (
        <div
          className="shrink-0 px-4 pt-3 pb-6"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(14px)",
            borderTop: "1px solid hsl(var(--border)/0.5)",
          }}
        >
          <div className="flex gap-2">
            <button
              onClick={onReschedule}
              className="flex-1 h-[48px] rounded-[12px] border-2 text-sm font-bold scale-tap"
              style={{ borderColor: "hsl(210,100%,50%)", color: "hsl(210,100%,40%)" }}
            >
              Reschedule
            </button>
            <button
              onClick={onCancel}
              className="flex-1 h-[48px] rounded-[12px] border-2 text-sm font-bold scale-tap"
              style={{ borderColor: "hsl(0,86%,48%)", color: "hsl(0,86%,48%)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {booking.status === "completed" && !reviewed && (
        <div className="shrink-0 px-4 pt-3 pb-6" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <button
            onClick={onOpenReview}
            className="customer-gradient h-[56px] w-full rounded-2xl text-base font-semibold text-white shadow-[0_0_15px_rgba(143,0,255,0.3)]"
          >
            ⭐ Add Review
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reschedule View ───────────────────────────────────────────────────────

function RescheduleView({
  booking,
  onBack,
  onConfirm,
}: {
  booking: Booking;
  onBack: () => void;
  onConfirm: (newDate: string, newTime: string) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Build next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const slots = buildSlots("09:00", "21:00");

  const canConfirm = selectedTime !== null;

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="shrink-0 customer-header px-4 pb-6 pt-4 safe-top">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 scale-tap"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white animate-fade-slide-up">Reschedule</h1>
        <p className="mt-1 text-sm text-white/70 animate-fade-in-delayed">{booking.shopName}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-[120px]">

        {/* Date Picker */}
        <div className="px-4 pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pick a Date
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {dates.map((d) => {
              const isSelected = d === selectedDate;
              const dateObj = new Date(d + "T00:00:00");
              const dayName = format(dateObj, "EEE");
              const dayNum = format(dateObj, "d");
              const mon = format(dateObj, "MMM");
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                  className="shrink-0 flex flex-col items-center rounded-[14px] px-3 py-2.5 w-14 scale-tap transition-all"
                  style={{
                    background: isSelected ? "hsl(var(--primary))" : "hsl(var(--card))",
                    color: isSelected ? "#fff" : "hsl(var(--foreground))",
                    boxShadow: isSelected ? "0 4px 12px hsl(var(--primary)/0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <span className="text-[10px] font-bold opacity-80">{dayName}</span>
                  <span className="text-lg font-extrabold leading-tight">{dayNum}</span>
                  <span className="text-[10px] font-semibold opacity-80">{mon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="px-4 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pick a Time
          </p>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isSelected = slot === selectedTime;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className="rounded-[12px] py-2.5 text-xs font-bold scale-tap transition-all"
                  style={{
                    background: isSelected ? "hsl(var(--accent))" : "hsl(var(--card))",
                    color: isSelected ? "#fff" : "hsl(var(--foreground))",
                    boxShadow: isSelected ? "0 4px 10px hsl(var(--accent)/0.30)" : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div
        className="shrink-0 fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 pb-6"
        style={{
          maxWidth: 430,
          margin: "0 auto",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid hsl(var(--border)/0.6)",
          borderRadius: "20px 20px 0 0",
        }}
      >
        {selectedTime && (
          <p className="mb-2 text-center text-sm font-semibold text-muted-foreground">
            {fmtDate(selectedDate)} at {selectedTime}
          </p>
        )}
        <button
          onClick={() => canConfirm && onConfirm(selectedDate, selectedTime!)}
          disabled={!canConfirm}
          className="w-full h-[52px] rounded-[14px] text-base font-bold text-white scale-tap disabled:opacity-50"
          style={{
            background: canConfirm
              ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)"
              : "hsl(var(--muted))",
            color: canConfirm ? "#fff" : "hsl(var(--muted-foreground))",
          }}
        >
          {canConfirm ? "Confirm New Time" : "Select a time slot"}
        </button>
      </div>
    </div>
  );
}

// ─── Booking Card ──────────────────────────────────────────────────────────

function BookingCard({
  booking,
  reviewed,
  onViewDetails,
  onReschedule,
  onCancel,
  onOpenReview,
}: {
  booking: Booking;
  reviewed: boolean;
  onViewDetails: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onOpenReview: () => void;
}) {
  const canAct = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="mb-3 overflow-hidden rounded-[18px] bg-card card-shadow">
      {/* Top section */}
      <div className="flex gap-3 p-4">
        <img
          src={booking.shopImage}
          alt={booking.shopName}
          className="h-14 w-14 shrink-0 rounded-[12px] object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=200&q=60";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-tight text-foreground truncate">{booking.shopName}</p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mb-1.5 truncate text-xs font-medium text-accent">{booking.service}</p>
          <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="text-xs">{fmtDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="text-xs">{booking.time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price + Actions */}
      <div
        className="px-4 pt-2.5 pb-3.5"
        style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-foreground">₹{booking.price}</p>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Details button — always visible */}
            <button
              onClick={onViewDetails}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground scale-tap transition-transform active:scale-95"
            >
              Details
            </button>

            {/* Reschedule — pending/confirmed */}
            {canAct && (
              <button
                onClick={onReschedule}
                className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold scale-tap transition-transform active:scale-95"
                style={{ borderColor: "hsl(210,100%,70%)", color: "hsl(210,100%,40%)" }}
              >
                <RotateCcw className="h-3 w-3" />
                Reschedule
              </button>
            )}

            {/* Cancel — pending/confirmed */}
            {canAct && (
              <button
                onClick={onCancel}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold scale-tap transition-transform active:scale-95"
                style={{ borderColor: "hsl(0,86%,68%)", color: "hsl(0,86%,48%)" }}
              >
                Cancel
              </button>
            )}

            {/* Rate Experience — completed + not reviewed */}
            {booking.status === "completed" && !reviewed && (
              <button
                onClick={onOpenReview}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white scale-tap"
              >
                <Star className="h-3 w-3 fill-white" />
                Rate
              </button>
            )}

            {/* Already reviewed */}
            {booking.status === "completed" && reviewed && (
              <div
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "hsl(142,72%,94%)", color: "hsl(142,72%,32%)" }}
              >
                ✓ Reviewed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ActivityScreen ───────────────────────────────────────────────────

type ActiveView = "list" | "details" | "reschedule";

export default function ActivityScreen({
  bookings,
  bookingsLoading = false,
  onGoHome,
  reviews,
  onSubmitReview,
  onCancelBooking,
  onRescheduleBooking,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [view, setView] = useState<ActiveView>("list");
  const [focusedBooking, setFocusedBooking] = useState<Booking | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const upcoming = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "active"
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );
  const list = activeTab === "upcoming" ? upcoming : past;

  const reviewedIds = useMemo(
    () => new Set(reviews.map((r) => r.bookingId).filter(Boolean)),
    [reviews]
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const openDetails = (booking: Booking) => {
    setFocusedBooking(booking);
    setView("details");
  };

  const openReschedule = (booking: Booking) => {
    setFocusedBooking(booking);
    setView("reschedule");
  };

  const openCancelSheet = (booking: Booking) => {
    setFocusedBooking(booking);
    setShowCancelSheet(true);
  };

  const handleConfirmCancel = async () => {
    if (!focusedBooking) return;
    try {
      await onCancelBooking(focusedBooking.id);
    } catch (err) {
      // error already shown by parent
    }
    setShowCancelSheet(false);
    setView("list");
    setFocusedBooking(null);
    setActiveTab("past");
    setToast("Booking cancelled successfully");
  };

  const handleConfirmReschedule = async (newDate: string, newTime: string) => {
    if (!focusedBooking) return;
    try {
      await onRescheduleBooking(focusedBooking.id, newDate, newTime);
    } catch (err) {
      // error already shown by parent
    }
    setView("list");
    setFocusedBooking(null);
    setToast("Booking rescheduled successfully");
  };

  const handleOpenReview = (booking: Booking) => {
    setReviewTarget(booking);
  };

  const handleSubmitReview = (rating: number, reviewText: string, tags: string[]) => {
    if (!reviewTarget) return;
    onSubmitReview({
      userId: reviewTarget.userId,
      shopId: reviewTarget.shopId,
      bookingId: reviewTarget.id,
      rating,
      reviewText,
      tags,
    });
    setReviewTarget(null);
    setToast("Review submitted, thank you!");
  };

  const backToList = () => {
    setView("list");
    setFocusedBooking(null);
  };

  // ── Sub-view routing ──────────────────────────────────────────────────────

  if (view === "details" && focusedBooking) {
    return (
      <>
        <BookingDetailsView
          booking={focusedBooking}
          reviewed={reviewedIds.has(focusedBooking.id)}
          onBack={backToList}
          onCancel={() => openCancelSheet(focusedBooking)}
          onReschedule={() => openReschedule(focusedBooking)}
          onOpenReview={() => handleOpenReview(focusedBooking)}
        />
        {showCancelSheet && focusedBooking && (
          <CancelSheet
            booking={focusedBooking}
            onClose={() => setShowCancelSheet(false)}
            onConfirm={handleConfirmCancel}
          />
        )}
        {reviewTarget && (
          <ReviewModal
            booking={reviewTarget}
            onClose={() => setReviewTarget(null)}
            onSubmit={handleSubmitReview}
          />
        )}
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  if (view === "reschedule" && focusedBooking) {
    return (
      <>
        <RescheduleView
          booking={focusedBooking}
          onBack={backToList}
          onConfirm={handleConfirmReschedule}
        />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  // ── Booking List ──────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex min-h-screen flex-col bg-muted pb-24">
        {/* Header */}
        <div className="customer-header px-4 pb-6 pt-4 safe-top">
          <h1 className="text-2xl font-bold text-white animate-fade-slide-up">My Bookings</h1>
          <p className="mt-1 text-sm text-white/70 animate-fade-in-delayed">Manage your appointments</p>
        </div>

        <div className="px-4 pt-4">
          {/* Tab Toggle */}
          <div className="mb-4 flex rounded-[14px] bg-card p-1 card-shadow">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="h-10 flex-1 rounded-[12px] text-sm font-bold capitalize transition-all scale-tap"
                style={{
                  background: activeTab === tab ? "hsl(var(--primary))" : "transparent",
                  color: activeTab === tab ? "#fff" : "hsl(var(--muted-foreground))",
                }}
              >
                {tab === "upcoming" ? "Upcoming" : "Past"}{" "}
                <span
                  className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold"
                  style={{
                    background:
                      activeTab === tab ? "rgba(255,255,255,0.25)" : "hsl(var(--muted))",
                    color: activeTab === tab ? "#fff" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {tab === "upcoming" ? upcoming.length : past.length}
                </span>
              </button>
            ))}
          </div>

          {/* Booking List */}
          {bookingsLoading ? (
            <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex gap-2">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
              <p className="text-sm font-medium">Loading your bookings...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-semibold">No {activeTab} bookings</p>
              <p className="mt-1 mb-5 text-xs">Your appointments will appear here</p>
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
                reviewed={reviewedIds.has(booking.id)}
                onViewDetails={() => openDetails(booking)}
                onReschedule={() => openReschedule(booking)}
                onCancel={() => openCancelSheet(booking)}
                onOpenReview={() => handleOpenReview(booking)}
              />
            ))
          )}

        </div>
      </div>

      {/* Cancel Confirmation Sheet */}
      {showCancelSheet && focusedBooking && (
        <CancelSheet
          booking={focusedBooking}
          onClose={() => setShowCancelSheet(false)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleSubmitReview}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
