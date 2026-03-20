import { Check, Clock, X } from "lucide-react";
import { useState } from "react";
import { VendorBooking } from "./types";
import { bookingStatusStyles, formatBookingDate, formatCurrency } from "./utils";

type FilterTab = VendorBooking["status"];

interface Props {
  bookings: VendorBooking[];
  onAcceptBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onCompleteBooking: (id: string) => void;
}

const tabs: { id: FilterTab; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

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

export default function BookingsScreen({
  bookings,
  onAcceptBooking,
  onRejectBooking,
  onCompleteBooking,
}: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const filtered = bookings.filter((booking) => booking.status === activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-24">
      <div className="brand-gradient px-4 pb-8 pt-12">
        <p className="text-sm font-medium text-light-text">Manage bookings</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Appointment requests</h1>
        <p className="mt-1 text-sm text-light-text">
          Review incoming bookings and close the loop fast.
        </p>
      </div>

      <div className="-mt-5 px-4">
        <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-card p-1.5 card-shadow">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = bookings.filter((booking) => booking.status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="rounded-[14px] px-3 py-3 text-left transition-all"
                style={{
                  background: isActive ? "hsl(var(--primary))" : "transparent",
                  color: isActive ? "#ffffff" : "hsl(var(--foreground))",
                }}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: isActive ? "rgba(255,255,255,0.82)" : "hsl(var(--muted-foreground))" }}
                >
                  {count} bookings
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {filtered.length} booking{filtered.length === 1 ? "" : "s"}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="rounded-[18px] bg-card px-5 py-12 text-center card-shadow">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-sm font-semibold text-foreground">No bookings in this queue</p>
              <p className="mt-2 text-xs text-muted-foreground">
                New appointments will show up here as their status changes.
              </p>
            </div>
          ) : (
            filtered.map((booking) => (
              <div key={booking.id} className="rounded-[18px] bg-card p-4 card-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{booking.customerName}</p>
                    <p className="mt-1 text-sm font-medium text-accent">{booking.service}</p>
                  </div>
                  <StatusChip status={booking.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-[14px] bg-muted p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Date and time
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatBookingDate(booking.date)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{booking.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Price
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(booking.price)}</p>
                  </div>
                </div>

                {booking.status === "pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onAcceptBooking(booking.id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white"
                      style={{ background: "hsl(var(--accent))" }}
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => onRejectBooking(booking.id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white"
                      style={{ background: "hsl(var(--destructive))" }}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}

                {booking.status === "confirmed" && (
                  <button
                    onClick={() => onCompleteBooking(booking.id)}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    <Check className="h-4 w-4" />
                    Mark as completed
                  </button>
                )}

                {(booking.status === "completed" || booking.status === "cancelled") && (
                  <div className="mt-4 rounded-[12px] border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground">
                    {booking.status === "completed"
                      ? "Payment captured and job closed."
                      : "Request removed from the active queue."}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
