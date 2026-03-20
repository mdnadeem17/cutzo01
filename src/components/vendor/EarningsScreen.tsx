import { ArrowLeft, BarChart3, Calendar, Wallet } from "lucide-react";
import { VendorBooking } from "./types";
import { formatBookingDate, formatCurrency } from "./utils";

interface Props {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  history: VendorBooking[];
  onBack: () => void;
}

function SummaryCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[18px] bg-card p-4 card-shadow">
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ background: "hsl(var(--accent) / 0.12)" }}
      >
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function EarningsScreen({
  todayEarnings,
  weeklyEarnings,
  monthlyEarnings,
  history,
  onBack,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-muted pb-10">
      <div className="brand-gradient px-4 pb-8 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm font-medium text-light-text">Revenue overview</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Earnings</h1>
        <p className="mt-1 text-sm text-light-text">
          Follow settled bookings and understand how the week is trending.
        </p>
      </div>

      <div className="-mt-5 flex flex-col gap-4 px-4">
        <div className="grid grid-cols-1 gap-3">
          <SummaryCard label="Today" value={formatCurrency(todayEarnings)} Icon={Wallet} />
          <SummaryCard label="This week" value={formatCurrency(weeklyEarnings)} Icon={Calendar} />
          <SummaryCard label="This month" value={formatCurrency(monthlyEarnings)} Icon={BarChart3} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Booking history
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {history.length === 0 ? (
              <div className="rounded-[18px] bg-card px-5 py-12 text-center card-shadow">
                <p className="text-sm font-semibold text-foreground">No settled bookings yet</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Completed appointments will automatically appear here.
                </p>
              </div>
            ) : (
              history.map((booking) => (
                <div key={booking.id} className="rounded-[18px] bg-card p-4 card-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{booking.customerName}</p>
                      <p className="mt-1 text-sm font-medium text-accent">{booking.service}</p>
                    </div>
                    <p className="text-base font-bold text-foreground">{formatCurrency(booking.price)}</p>
                  </div>

                  <div className="mt-4 rounded-[14px] bg-muted px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Completed on
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatBookingDate(booking.date)} at {booking.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
