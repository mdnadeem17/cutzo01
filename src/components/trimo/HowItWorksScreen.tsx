import { ArrowLeft, Calendar, MapPin, Scissors } from "lucide-react";

interface Props {
  onBack: () => void;
}

const steps = [
  {
    icon: MapPin,
    title: "Find a Shop",
    desc: "Browse nearby barber shops with fixed pricing and trusted reviews before you choose.",
  },
  {
    icon: Calendar,
    title: "Book a Slot",
    desc: "Select your service and preferred time instantly without waiting for callbacks.",
  },
  {
    icon: Scissors,
    title: "Get Service",
    desc: "Visit the shop, skip the waiting line, and pay after the service is completed.",
  },
];

export default function HowItWorksScreen({ onBack }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-muted pb-8">
      <div className="brand-gradient px-4 pb-8 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm font-medium text-light-text">TRIMO Guide</p>
        <h1 className="mt-1 text-2xl font-bold text-white">How It Works</h1>
        <p className="mt-1 text-sm text-light-text">
          A simple three-step flow for faster, more reliable barber bookings.
        </p>
      </div>

      <div className="-mt-5 px-4">
        <div className="flex flex-col gap-4">
          {steps.map(({ icon: Icon, title, desc }, index) => (
            <div key={title} className="rounded-[18px] bg-card p-5 card-shadow">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
