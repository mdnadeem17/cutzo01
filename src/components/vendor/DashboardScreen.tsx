import { ArrowRight, BarChart3, Calendar, Check, Clock, Settings, Wallet, X } from "lucide-react";
import { VendorBooking } from "./types";
import { bookingStatusStyles, formatCurrency } from "./utils";

interface Props {
  shopName: string;
  dateLabel: string;
  todayBookings: VendorBooking[];
  pendingCount: number;
  earningsToday: number;
  onAcceptBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onOpenAvailability: () => void;
  onOpenEarnings: () => void;
  onOpenBookings: () => void;
}

function StatusChip({ status }: { status: VendorBooking["status"] }) {
  const meta = bookingStatusStyles[status];

  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
      style={{
        background: meta.background,
        color: meta.color,
        borderColor: meta.border,
      }}
    >
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[16px] bg-card p-3 card-shadow">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{ background: "hsl(var(--primary) / 0.08)" }}
      >
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function DashboardScreen({
  shopName,
  dateLabel,
  todayBookings,
  pendingCount,
  earningsToday,
  onAcceptBooking,
  onRejectBooking,
  onOpenAvailability,
  onOpenEarnings,
  onOpenBookings,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-muted pb-24">
      <div className="brand-gradient px-4 pb-8 pt-12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-light-text">TRIMO Partner</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{shopName}</h1>
            <p className="mt-1 text-sm text-light-text">{dateLabel}</p>
          </div>
          <button
            onClick={onOpenBookings}
            className="rounded-full border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm"
          >
            View queue
          </button>
        </div>
      </div>

      <div className="-mt-5 flex flex-col gap-4 px-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Today" value={`${todayBookings.length}`} Icon={Calendar} />
          <StatCard label="Earnings" value={formatCurrency(earningsToday)} Icon={Wallet} />
          <StatCard label="Pending" value={`${pendingCount}`} Icon={Clock} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenAvailability}
            className="rounded-[18px] bg-card p-4 text-left card-shadow"
          >
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--accent) / 0.12)" }}
            >
              <Settings className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm font-bold text-foreground">Availability</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Update working hours and block dates quickly.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent">
              Manage now
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>

          <button
            onClick={onOpenEarnings}
            className="rounded-[18px] bg-card p-4 text-left card-shadow"
          >
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--primary) / 0.08)" }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">Earnings</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Track daily, weekly, and monthly revenue in one view.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
              View report
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today&apos;s bookings
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Live appointment queue</h2>
          </div>
          <button
            onClick={onOpenBookings}
            className="text-xs font-semibold text-primary"
          >
            Open bookings
          </button>
        </div>

        {todayBookings.length === 0 ? (
          <div className="rounded-[18px] bg-card px-5 py-12 text-center card-shadow">
            <p className="text-sm font-semibold text-foreground">No bookings scheduled today</p>
            <p className="mt-2 text-xs text-muted-foreground">
              New requests will appear here as customers book slots.
            </p>
          </div>
        ) : (
          todayBookings.map((booking) => (
            <div key={booking.id} className="rounded-[18px] bg-card p-4 card-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{booking.customerName}</p>
                  <p className="mt-1 text-sm font-medium text-accent">{booking.service}</p>
                </div>
                <StatusChip status={booking.status} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-muted px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Time
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">{booking.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Value
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(booking.price)}</p>
                </div>
              </div>

              {booking.status === "pending" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onAcceptBooking(booking.id)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
                    style={{ background: "hsl(var(--accent))" }}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => onRejectBooking(booking.id)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white shadow-lg shadow-red-500/15"
                    style={{ background: "hsl(var(--destructive))" }}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-[12px] border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  {booking.status === "confirmed" && "Booking accepted and ready for service."}
                  {booking.status === "completed" && "Service completed and added to earnings."}
                  {booking.status === "cancelled" && "Request declined or cancelled."}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
