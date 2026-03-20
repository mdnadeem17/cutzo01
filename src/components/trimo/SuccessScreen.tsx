import { CheckCircle, Calendar, MapPin, Clock, Scissors, ArrowRight, Share2 } from "lucide-react";
import { Shop, Service } from "./types";

interface Props {
  shop: Shop;
  services: Service[];
  date: string;
  time: string;
  onGoHome: () => void;
  onViewBookings: () => void;
}

export default function SuccessScreen({ shop, services, date, time, onGoHome, onViewBookings }: Props) {
  const total = services.reduce((acc, s) => acc + s.price, 0);
  const bookingId = `TR${Math.floor(Math.random() * 900000 + 100000)}`;

  return (
    <div className="flex flex-col min-h-screen bg-muted items-center justify-start pt-10 pb-10 px-4">
      {/* Success Icon */}
      <div className="flex flex-col items-center mb-6 slide-up">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "hsl(189,93%,43%/0.12)" }}>
          <CheckCircle className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">Booking Confirmed!</h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          We've sent a confirmation to your phone
        </p>
      </div>

      {/* Ticket Card */}
      <div className="w-full max-w-sm bg-card card-shadow rounded-[20px] overflow-hidden slide-up" style={{ animationDelay: "100ms" }}>
        {/* Ticket Header */}
        <div className="brand-gradient p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-bold text-lg">{shop.name}</p>
            <div className="bg-white/20 rounded-full px-2.5 py-1">
              <p className="text-white text-xs font-semibold">#{bookingId}</p>
            </div>
          </div>
          <p className="text-light-text text-xs">{shop.address}</p>
        </div>

        {/* Dashed Divider */}
        <div className="relative h-0 border-t-2 border-dashed border-muted mx-0">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-muted" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-muted" />
        </div>

        {/* Ticket Body */}
        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Date</p>
                <p className="text-sm font-semibold text-foreground">{date}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Time</p>
                <p className="text-sm font-semibold text-foreground">{time}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Scissors className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Services</p>
              <p className="text-sm font-semibold text-foreground">{services.map((s) => s.name).join(", ")}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Location</p>
              <p className="text-sm font-semibold text-foreground">{shop.address.split(",")[0]}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-border pt-3 mt-1">
            <p className="text-sm font-medium text-muted-foreground">Amount Payable</p>
            <p className="text-base font-bold text-accent">₹{total}</p>
          </div>
        </div>

        {/* Share */}
        <div className="px-5 pb-5">
          <button className="w-full h-10 rounded-[10px] border border-border flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <Share2 className="w-4 h-4" />
            Share Booking
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm mt-5 flex flex-col gap-3 slide-up" style={{ animationDelay: "200ms" }}>
        <button
          onClick={onViewBookings}
          className="gradient-btn w-full h-[50px] rounded-[12px] text-white font-semibold text-base flex items-center justify-center gap-2 scale-tap transition-transform"
        >
          View My Bookings
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onGoHome}
          className="w-full h-[44px] rounded-[12px] border border-border text-foreground font-medium text-sm scale-tap transition-transform"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
