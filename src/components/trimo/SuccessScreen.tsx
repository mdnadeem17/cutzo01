import { format, parseISO } from "date-fns";
import { ArrowRight, Calendar, CheckCircle, Clock, MapPin, Scissors, Share2 } from "lucide-react";
import { Service, Shop } from "./types";

interface Props {
  shop: Shop;
  services: Service[];
  date: string;
  time: string;
  onGoHome: () => void;
  onViewBookings: () => void;
}

const formatBookingDate = (value: string) => {
  try {
    return format(parseISO(value), "EEE, MMM d");
  } catch {
    return value;
  }
};

export default function SuccessScreen({ shop, services, date, time, onGoHome, onViewBookings }: Props) {
  const total = services.reduce((acc, service) => acc + service.price, 0);
  const bookingId = `TR${Math.floor(Math.random() * 900000 + 100000)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-muted px-4 pb-10 pt-10">
      <div className="mb-6 flex flex-col items-center slide-up">
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "hsl(189,93%,43%/0.12)" }}
        >
          <CheckCircle className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-center text-2xl font-bold text-foreground">Booking Request Sent</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          The shop owner will review your request and update the status in My Bookings.
        </p>
      </div>

      <div
        className="w-full max-w-sm overflow-hidden rounded-[20px] bg-card card-shadow slide-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="brand-gradient p-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-lg font-bold text-white">{shop.name}</p>
            <div className="rounded-full bg-white/20 px-2.5 py-1">
              <p className="text-xs font-semibold text-white">#{bookingId}</p>
            </div>
          </div>
          <p className="text-xs text-light-text">{shop.address}</p>
        </div>

        <div className="relative mx-0 h-0 border-t-2 border-dashed border-muted">
          <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-muted" />
          <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-muted" />
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </p>
                <p className="text-sm font-semibold text-foreground">{formatBookingDate(date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Time
                </p>
                <p className="text-sm font-semibold text-foreground">{time}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Services
              </p>
              <p className="text-sm font-semibold text-foreground">
                {services.map((service) => service.name).join(", ")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Location
              </p>
              <p className="text-sm font-semibold text-foreground">{shop.address.split(",")[0]}</p>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-dashed border-border pt-3">
            <p className="text-sm font-medium text-muted-foreground">Amount Payable</p>
            <p className="text-base font-bold text-accent">Rs {total}</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border text-sm font-medium text-foreground">
            <Share2 className="h-4 w-4" />
            Share Booking
          </button>
        </div>
      </div>

      <div
        className="mt-5 flex w-full max-w-sm flex-col gap-3 slide-up"
        style={{ animationDelay: "200ms" }}
      >
        <button
          onClick={onViewBookings}
          className="gradient-btn flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] text-base font-semibold text-white scale-tap transition-transform"
        >
          View My Bookings
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onGoHome}
          className="h-[44px] w-full rounded-[12px] border border-border text-sm font-medium text-foreground scale-tap transition-transform"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
