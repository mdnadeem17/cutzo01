import { ArrowLeft, Scissors, Hand, Droplets, Sparkles, Smile, Flame, Wind, Star } from "lucide-react";
import { Service } from "./types";
import { SERVICES } from "./data";

interface Props {
  shopName: string;
  selected: Service[];
  onToggle: (s: Service) => void;
  onBack: () => void;
  onContinue: () => void;
}

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Scissors, Smile, Hand, Droplets, Sparkles, Star, Wind, Flame
};

function ServiceCard({ service, isSelected, onToggle }: {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const IconComp = SERVICE_ICONS[service.icon] || Scissors;
  return (
    <div
      onClick={onToggle}
      className="bg-card rounded-[16px] p-4 cursor-pointer scale-tap transition-all card-shadow"
      style={{
        border: isSelected ? "2px solid hsl(var(--accent))" : "2px solid transparent",
        background: isSelected ? "hsl(189,93%,97%)" : "hsl(var(--card))",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isSelected ? "hsl(var(--accent)/0.15)" : "hsl(var(--muted))" }}
        >
          <IconComp
            className="w-5 h-5"
            style={{ color: isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-semibold text-foreground">{service.name}</p>
            {service.popular && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "hsl(var(--accent)/0.15)", color: "hsl(var(--accent))" }}
              >
                POPULAR
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{service.duration}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-accent font-bold text-sm">₹{service.price}</p>
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: isSelected ? "hsl(var(--accent))" : "hsl(var(--border))",
              background: isSelected ? "hsl(var(--accent))" : "transparent",
            }}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceSelectionScreen({ shopName, selected, onToggle, onBack, onContinue }: Props) {
  const total = selected.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = selected.reduce((acc, s) => acc + parseInt(s.duration), 0);

  return (
    <div className="flex flex-col min-h-screen bg-muted pb-32">
      {/* Header */}
      <div className="brand-gradient px-4 pt-12 pb-6">
        <button onClick={onBack} className="mb-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Choose Services</h1>
        <p className="text-light-text text-sm mt-1">{shopName}</p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Select one or more services
        </p>
        {SERVICES.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={selected.some((s) => s.id === service.id)}
            onToggle={() => onToggle(service)}
          />
        ))}
      </div>

      {/* Bottom Summary */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        {selected.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">{selected.length} service{selected.length > 1 ? "s" : ""} · {totalDuration} min</p>
              <p className="text-sm font-bold text-foreground">Total: <span className="text-accent">₹{total}</span></p>
            </div>
            <div className="flex gap-1">
              {selected.slice(0, 3).map((s) => {
                const IconComp = SERVICE_ICONS[s.icon] || Scissors;
                return (
                  <div key={s.id} className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <IconComp className="w-3.5 h-3.5 text-accent" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button
          onClick={onContinue}
          disabled={selected.length === 0}
          className="gradient-btn w-full h-[50px] rounded-[12px] text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed scale-tap transition-all"
          style={selected.length === 0 ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" } : {}}
        >
          Continue {selected.length > 0 ? `· ₹${total}` : ""}
        </button>
      </div>
    </div>
  );
}
