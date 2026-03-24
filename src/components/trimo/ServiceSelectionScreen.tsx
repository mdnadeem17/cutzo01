import {
  ArrowLeft,
  Check,
  Clock,
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
      className="cursor-pointer rounded-[18px] scale-tap transition-all active:scale-[0.98]"
      style={{
        background: isSelected
          ? "rgba(143,0,255,0.1)"
          : "hsl(var(--card))",
        border: isSelected
          ? "2px solid #8F00FF"
          : "2px solid transparent",
        boxShadow: isSelected
          ? "0 0 10px rgba(143,0,255,0.15)"
          : "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-3.5 p-4">
        {/* Icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: isSelected
              ? "hsl(var(--accent)/0.18)"
              : "hsl(var(--muted))",
          }}
        >
          <IconComp
            className="h-5 w-5"
            style={{ color: isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-foreground truncate">{service.name}</p>
            {service.popular && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                style={{
                  background: "hsl(var(--accent)/0.15)",
                  color: "hsl(var(--accent))",
                }}
              >
                Popular
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <p className="text-xs font-medium">{service.duration}</p>
          </div>
        </div>

        {/* Price + check */}
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm font-extrabold" style={{ color: "hsl(var(--accent))" }}>
            ₹{service.price}
          </p>
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full transition-all"
            style={{
              background: isSelected ? "#8F00FF" : "transparent",
              border: isSelected
                ? "2px solid #8F00FF"
                : "2px solid hsl(var(--border))",
            }}
          >
            {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
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
  const total = selected.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = selected.reduce(
    (acc, s) => acc + Number.parseInt(s.duration, 10),
    0
  );
  const hasSelection = selected.length > 0;

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>

      {/* ── Sticky Header ── */}
      <div className="shrink-0 customer-header px-4 pb-6 pt-4 safe-top">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 scale-tap"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white animate-fade-slide-up">Choose Services</h1>
        <p className="mt-1 text-sm text-white/70 animate-fade-in-delayed">{shopName}</p>
      </div>

      {/* ── Scrollable Services List ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[140px]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Select one or more services
        </p>

        {services.length === 0 ? (
          <div className="rounded-[18px] bg-card px-5 py-14 text-center card-shadow mt-4">
            <Scissors className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-bold text-foreground">No services published yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This shop needs to add services before customers can book.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selected.some((s) => s.id === service.id)}
                onToggle={() => onToggle(service)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Bar ── */}
      <div
        className="shrink-0 fixed bottom-0 left-0 right-0 z-30"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <div
          className="px-4 pt-3 pb-5"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid hsl(var(--border)/0.6)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.10)",
            borderRadius: "20px 20px 0 0",
          }}
        >
          {/* Summary row — always visible */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              {hasSelection ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {selected.length} service{selected.length > 1 ? "s" : ""} · {totalDuration} min
                  </p>
                  <p className="text-base font-extrabold text-foreground mt-0.5">
                    Total{" "}
                    <span style={{ color: "hsl(var(--accent))" }}>₹{total}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  No services selected
                </p>
              )}
            </div>

            {/* Selected service icons */}
            {hasSelection && (
              <div className="flex items-center gap-1">
                {selected.slice(0, 3).map((s) => {
                  const Icon = SERVICE_ICONS[s.icon] || Scissors;
                  return (
                    <div
                      key={s.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "hsl(var(--accent)/0.12)" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                    </div>
                  );
                })}
                {selected.length > 3 && (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: "hsl(var(--accent)/0.12)",
                      color: "hsl(var(--accent))",
                    }}
                  >
                    +{selected.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            disabled={!hasSelection || services.length === 0}
            className={`w-full h-[56px] rounded-2xl text-base font-bold text-white scale-tap transition-all disabled:opacity-50 disabled:cursor-not-allowed ${hasSelection && services.length > 0 ? "customer-gradient shadow-[0_0_15px_rgba(143,0,255,0.3)]" : "bg-muted text-muted-foreground"}`}
          >
            {hasSelection
              ? `Continue · ₹${total}`
              : "Select a service to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
