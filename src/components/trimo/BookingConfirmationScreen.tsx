import { ArrowLeft, ChevronRight, Clock, MapPin, Shield } from "lucide-react";
import { Service, Shop } from "./types";

interface Props {
  shop: Shop;
  services: Service[];
  date: string;
  time: string;
  customerPhone: string;
  onBack: () => void;
  onSuccess: (booking: { shop: Shop; services: Service[]; date: string; time: string }) => void;
}

export default function BookingConfirmationScreen({
  shop,
  services,
  date,
  time,
  customerPhone,
  onBack,
  onSuccess,
}: Props) {
  const total = services.reduce((acc, service) => acc + service.price, 0);
  const totalDuration = services.reduce(
    (acc, service) => acc + Number.parseInt(service.duration, 10),
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-32">
      <div className="brand-gradient px-4 pb-6 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Review Booking</h1>
        <p className="mt-1 text-sm text-light-text">Check details before sending your request</p>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="overflow-hidden rounded-[16px] bg-card card-shadow">
          <div className="flex gap-3 p-4">
            <img src={shop.image} alt={shop.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{shop.name}</p>
              <div className="mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="truncate text-xs text-muted-foreground">{shop.address}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-semibold text-foreground">
                  {date}, {time}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{totalDuration} min total</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Services
          </p>
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.duration}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">Rs {service.price}</p>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between pt-3">
            <p className="text-sm font-bold text-foreground">Total</p>
            <p className="text-base font-bold text-accent">Rs {total}</p>
          </div>
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mobile Number</p>
              <p className="text-xs text-muted-foreground">{customerPhone}</p>
            </div>
            <div className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent">
              Verified session
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-start gap-2.5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your booking will be sent to the shop as a real request. They can accept or reject it from the vendor dashboard.
            </p>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-lg font-bold text-accent">Rs {total}</p>
        </div>
        <button
          onClick={() => onSuccess({ shop, services, date, time })}
          className="gradient-btn h-[50px] w-full rounded-[12px] text-base font-semibold text-white shadow-lg scale-tap transition-transform"
        >
          Send Booking Request
        </button>
      </div>
    </div>
  );
}
