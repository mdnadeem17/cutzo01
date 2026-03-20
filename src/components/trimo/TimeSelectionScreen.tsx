import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TimeSlot } from "./types";
import { TIME_SLOTS_TODAY, TIME_SLOTS_TOMORROW } from "./data";

interface Props {
  shopName: string;
  totalPrice: number;
  onBack: () => void;
  onContinue: (date: string, time: string) => void;
}

const DATE_TABS = ["Today", "Tomorrow", "Thu, 20", "Fri, 21", "Sat, 22"];

function TimeSlotGrid({ slots, selected, onSelect }: {
  slots: TimeSlot[];
  selected: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = selected === slot.time;
        const isUnavailable = !slot.available;
        return (
          <button
            key={slot.time}
            disabled={isUnavailable}
            onClick={() => onSelect(slot.time)}
            className="h-11 rounded-[10px] text-sm font-medium transition-all scale-tap"
            style={{
              background: isUnavailable
                ? "hsl(var(--muted))"
                : isSelected
                ? "hsl(var(--primary))"
                : "#FFFFFF",
              color: isUnavailable
                ? "hsl(var(--muted-foreground))"
                : isSelected
                ? "#FFFFFF"
                : "hsl(var(--primary))",
              border: isSelected
                ? "none"
                : isUnavailable
                ? "none"
                : "1px solid hsl(var(--border))",
              opacity: isUnavailable ? 0.5 : 1,
              cursor: isUnavailable ? "not-allowed" : "pointer",
              boxShadow: isSelected ? "0 4px 12px hsl(var(--primary)/0.3)" : isUnavailable ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}

export default function TimeSelectionScreen({ shopName, totalPrice, onBack, onContinue }: Props) {
  const [activeDate, setActiveDate] = useState("Today");
  const [selectedTime, setSelectedTime] = useState("");

  const slots = activeDate === "Today" ? TIME_SLOTS_TODAY : TIME_SLOTS_TOMORROW;
  const slotsToShow = activeDate === "Today" || activeDate === "Tomorrow" ? slots : TIME_SLOTS_TOMORROW;
  const available = slotsToShow.filter((s) => s.available).length;

  return (
    <div className="flex flex-col min-h-screen bg-muted pb-32">
      {/* Header */}
      <div className="brand-gradient px-4 pt-12 pb-6">
        <button onClick={onBack} className="mb-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Pick a Time</h1>
        <p className="text-light-text text-sm mt-1">{shopName}</p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Date Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {DATE_TABS.map((date) => (
            <button
              key={date}
              onClick={() => { setActiveDate(date); setSelectedTime(""); }}
              className="shrink-0 px-4 h-9 rounded-[20px] text-xs font-semibold transition-all scale-tap"
              style={{
                background: activeDate === date ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: activeDate === date ? "#ffffff" : "hsl(var(--foreground))",
                boxShadow: activeDate === date ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                border: activeDate === date ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              {date}
            </button>
          ))}
        </div>

        {/* Availability summary */}
        <div className="bg-card rounded-[16px] px-4 py-3 flex items-center justify-between card-shadow">
          <div>
            <p className="text-sm font-semibold text-foreground">{activeDate}</p>
            <p className="text-xs text-muted-foreground">{available} slots available</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
              <span className="text-muted-foreground">Unavailable</span>
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div className="bg-card rounded-[16px] p-4 card-shadow">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Available Slots
          </p>
          <TimeSlotGrid slots={slotsToShow} selected={selectedTime} onSelect={setSelectedTime} />
        </div>

        {selectedTime && (
          <div className="bg-accent/10 rounded-[16px] px-4 py-3 flex items-center justify-between slide-up">
            <div>
              <p className="text-xs text-accent font-medium">Selected</p>
              <p className="text-sm font-bold text-foreground">{activeDate}, {selectedTime}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-accent" />
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <button
          onClick={() => onContinue(activeDate, selectedTime)}
          disabled={!selectedTime}
          className="gradient-btn w-full h-[50px] rounded-[12px] text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed scale-tap transition-all"
          style={!selectedTime ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" } : {}}
        >
          Confirm Time {selectedTime ? `· ${selectedTime}` : ""}
        </button>
      </div>
    </div>
  );
}
