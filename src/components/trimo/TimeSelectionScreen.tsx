import { addDays, format, startOfToday } from "date-fns";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { TimeSlot } from "./types";

interface Props {
  shopName: string;
  totalPrice: number;
  slots: TimeSlot[];
  blockedDates: string[];
  reservedSlots: Record<string, string[]>;
  onBack: () => void;
  onContinue: (date: string, time: string) => void;
}

function TimeSlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: TimeSlot[];
  selected: string;
  onSelect: (time: string) => void;
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
              boxShadow: isSelected
                ? "0 4px 12px hsl(var(--primary)/0.3)"
                : isUnavailable
                  ? "none"
                  : "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}

export default function TimeSelectionScreen({
  shopName,
  totalPrice,
  slots,
  blockedDates,
  reservedSlots,
  onBack,
  onContinue,
}: Props) {
  const dateOptions = useMemo(() => {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);

    return [
      { value: format(today, "yyyy-MM-dd"), label: "Today" },
      { value: format(tomorrow, "yyyy-MM-dd"), label: "Tomorrow" },
    ];
  }, []);
  const [activeDate, setActiveDate] = useState(dateOptions[0].value);
  const [selectedTime, setSelectedTime] = useState("");

  const isBlocked = blockedDates.includes(activeDate);
  const reservedTimes = reservedSlots[activeDate] ?? [];
  const slotsToShow = isBlocked
    ? slots.map((slot) => ({ ...slot, available: false }))
    : slots.map((slot) => ({
        ...slot,
        available: slot.available && !reservedTimes.includes(slot.time),
      }));
  const available = slotsToShow.filter((slot) => slot.available).length;
  const activeDateLabel = dateOptions.find((option) => option.value === activeDate)?.label ?? activeDate;

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-32">
      <div className="brand-gradient px-4 pb-6 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Pick a Time</h1>
        <p className="mt-1 text-sm text-light-text">{shopName}</p>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {dateOptions.map((date) => (
            <button
              key={date.value}
              onClick={() => {
                setActiveDate(date.value);
                setSelectedTime("");
              }}
              className="h-9 shrink-0 rounded-[20px] px-4 text-xs font-semibold transition-all scale-tap"
              style={{
                background: activeDate === date.value ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: activeDate === date.value ? "#ffffff" : "hsl(var(--foreground))",
                boxShadow: activeDate === date.value ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                border: activeDate === date.value ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              {date.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-[16px] bg-card px-4 py-3 card-shadow">
          <div>
            <p className="text-sm font-semibold text-foreground">{activeDateLabel}</p>
            <p className="text-xs text-muted-foreground">
              {isBlocked ? "This date is blocked by the shop" : `${available} slots available`}
            </p>
          </div>
          <p className="text-sm font-bold text-accent">Rs {totalPrice}</p>
        </div>

        <div className="rounded-[16px] bg-card p-4 card-shadow">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available Slots
          </p>
          <TimeSlotGrid slots={slotsToShow} selected={selectedTime} onSelect={setSelectedTime} />
        </div>

        {selectedTime && (
          <div className="flex items-center justify-between rounded-[16px] bg-accent/10 px-4 py-3 slide-up">
            <div>
              <p className="text-xs font-medium text-accent">Selected</p>
              <p className="text-sm font-bold text-foreground">
                {activeDateLabel}, {selectedTime}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-accent" />
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <button
          onClick={() => onContinue(activeDate, selectedTime)}
          disabled={!selectedTime}
          className="gradient-btn h-[50px] w-full rounded-[12px] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 scale-tap transition-all"
          style={
            !selectedTime
              ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              : {}
          }
        >
          Confirm Time {selectedTime ? `/ ${selectedTime}` : ""}
        </button>
      </div>
    </div>
  );
}
