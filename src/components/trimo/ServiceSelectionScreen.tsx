import {
  ArrowLeft,
  Droplets,
  Flame,
  Hand,
  Scissors,
  Smile,
  Sparkles,
  Star,
  Wind,
} from "lucide-react";
import { Service } from "./types";

interface Props {
  shopName: string;
  services: Service[];
  selected: Service[];
  onToggle: (service: Service) => void;
  onBack: () => void;
  onContinue: () => void;
}

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Scissors,
  Smile,
  Hand,
  Droplets,
  Sparkles,
  Star,
  Wind,
  Flame,
};

function ServiceCard({
  service,
  isSelected,
  onToggle,
}: {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const IconComp = SERVICE_ICONS[service.icon] || Scissors;

  return (
    <div
      onClick={onToggle}
      className="cursor-pointer rounded-[16px] bg-card p-4 card-shadow scale-tap transition-all"
      style={{
        border: isSelected ? "2px solid hsl(var(--accent))" : "2px solid transparent",
        background: isSelected ? "hsl(189,93%,97%)" : "hsl(var(--card))",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: isSelected ? "hsl(var(--accent)/0.15)" : "hsl(var(--muted))" }}
        >
          <IconComp
            className="h-5 w-5"
            style={{ color: isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{service.name}</p>
            {service.popular && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: "hsl(var(--accent)/0.15)", color: "hsl(var(--accent))" }}
              >
                POPULAR
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{service.duration}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm font-bold text-accent">Rs {service.price}</p>
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full border-2"
            style={{
              borderColor: isSelected ? "hsl(var(--accent))" : "hsl(var(--border))",
              background: isSelected ? "hsl(var(--accent))" : "transparent",
            }}
          >
            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceSelectionScreen({
  shopName,
  services,
  selected,
  onToggle,
  onBack,
  onContinue,
}: Props) {
  const total = selected.reduce((acc, service) => acc + service.price, 0);
  const totalDuration = selected.reduce((acc, service) => acc + Number.parseInt(service.duration, 10), 0);

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-32">
      <div className="brand-gradient px-4 pb-6 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Choose Services</h1>
        <p className="mt-1 text-sm text-light-text">{shopName}</p>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select one or more services
        </p>

        {services.length === 0 ? (
          <div className="rounded-[16px] bg-card px-5 py-12 text-center card-shadow">
            <p className="text-sm font-semibold text-foreground">No services published yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This shop needs to add services before customers can book.
            </p>
          </div>
        ) : (
          services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selected.some((selectedService) => selectedService.id === service.id)}
              onToggle={() => onToggle(service)}
            />
          ))
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        {selected.length > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {selected.length} service{selected.length > 1 ? "s" : ""} / {totalDuration} min
              </p>
              <p className="text-sm font-bold text-foreground">
                Total: <span className="text-accent">Rs {total}</span>
              </p>
            </div>
            <div className="flex gap-1">
              {selected.slice(0, 3).map((service) => {
                const IconComp = SERVICE_ICONS[service.icon] || Scissors;

                return (
                  <div
                    key={service.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10"
                  >
                    <IconComp className="h-3.5 w-3.5 text-accent" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button
          onClick={onContinue}
          disabled={selected.length === 0 || services.length === 0}
          className="gradient-btn h-[50px] w-full rounded-[12px] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 scale-tap transition-all"
          style={
            selected.length === 0 || services.length === 0
              ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              : {}
          }
        >
          Continue {selected.length > 0 ? `/ Rs ${total}` : ""}
        </button>
      </div>
    </div>
  );
}
