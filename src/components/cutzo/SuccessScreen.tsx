import { format, parseISO } from "date-fns";
import { ArrowRight, Calendar, CheckCircle, Clock, MapPin, Scissors, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Service, Shop } from "./types";

interface Props {
  shop: Shop;
  services: Service[];
  date: string;
  time: string;
  onGoHome: () => void;
  onViewBookings: () => void;
  id?: string;
  otp?: number;
}

const formatBookingDate = (value: string) => {
  try {
    return format(parseISO(value), "EEE, MMM d");
  } catch {
    return value;
  }
};

export default function SuccessScreen({ shop, services, date, time, onGoHome, onViewBookings, id, otp }: Props) {
  const total = services.reduce((acc, service) => acc + service.price, 0);
  const displayId = id || `TR${Math.floor(Math.random() * 900000 + 100000)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-muted px-4 pb-10 pt-10">
      <div className="mb-6 flex flex-col items-center slide-up">
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 18,
            delay: 0.1,
          }}
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "hsl(189,93%,43%/0.12)" }}
        >
          <CheckCircle className="h-10 w-10 text-accent" />
        </motion.div>
        <h1 className="text-center text-2xl font-bold text-foreground">Booking Request Sent</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          The shop owner will review your request and update the status in My Bookings.
        </p>
      </div>

      <div
        className="w-full max-w-sm overflow-hidden rounded-[20px] bg-card card-shadow slide-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="customer-header p-5 rounded-b-none">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-lg font-bold text-white animate-fade-slide-up">{shop.name}</p>
            <div className="rounded-full bg-white/20 px-2.5 py-1">
              <p className="text-xs font-semibold text-white animate-fade-in-delayed">#{displayId.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <p className="text-xs text-light-text animate-fade-in-delayed">{shop.address}</p>
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

        {otp && (
          <div className="mx-5 mb-5 rounded-xl bg-[#F8F0FF] border border-[#8F00FF] p-4 text-center shadow-[0_0_10px_rgba(143,0,255,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8F00FF]/80 mb-1">Service OTP</p>
            <p className="text-3xl font-black tracking-[0.2em] ml-[0.2em] text-[#8F00FF]">{otp}</p>
            <p className="mt-1 text-[11px] font-bold text-[#8F00FF]/70">
              Share this code with the shop to start.
            </p>
          </div>
        )}

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
          className="customer-gradient flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white scale-tap transition-transform shadow-[0_0_15px_rgba(143,0,255,0.3)]"
        >
          View My Bookings
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onGoHome}
          className="h-[56px] w-full rounded-2xl bg-white border border-[#8F00FF] text-sm font-semibold text-[#8F00FF] scale-tap transition-transform"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
