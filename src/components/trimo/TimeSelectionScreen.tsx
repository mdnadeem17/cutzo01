import { useQuery } from "convex/react";
import { addDays, format, startOfToday } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function parseTime(t: string): { h24: number; min: number } {
  // Support "HH:MM" or "H:MM AM/PM"
  const ampm = /(\d+):(\d+)\s*(AM|PM)/i.exec(t);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return { h24: h, min: m };
  }
  const plain = /(\d+):(\d+)/.exec(t);
  if (plain) return { h24: parseInt(plain[1], 10), min: parseInt(plain[2], 10) };
  return { h24: 9, min: 0 };
}

function to24h(hour: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour;
  if (ampm === "AM" && hour === 12) h = 0;
  if (ampm === "PM" && hour !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function to12h(h24: number): { hour: number; ampm: "AM" | "PM" } {
  if (h24 === 0) return { hour: 12, ampm: "AM" };
  if (h24 < 12) return { hour: h24, ampm: "AM" };
  if (h24 === 12) return { hour: 12, ampm: "PM" };
  return { hour: h24 - 12, ampm: "PM" };
}

// ──────────────────────────────────────────────────────────────────────────────
// WheelPicker – single vertical scroll column
// ──────────────────────────────────────────────────────────────────────────────

const ITEM_H = 52;

function WheelPicker<T extends string | number>({
  items,
  selected,
  onSelect,
  label,
  renderItem,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  label: string;
  renderItem?: (item: T) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected item
  const scrollToIndex = useCallback(
    (idx: number, smooth = true) => {
      containerRef.current?.scrollTo({
        top: idx * ITEM_H,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    []
  );

  // Initial position
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx !== -1) scrollToIndex(idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when items / selected changes (e.g. filter changes)
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx !== -1) scrollToIndex(idx, true);
  }, [selected, items, scrollToIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isScrolling.current = true;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
      const el = containerRef.current;
      if (!el) return;
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const idx = Math.max(0, Math.min(rawIdx, items.length - 1));
      scrollToIndex(idx, true);
      onSelect(items[idx]);
    }, 120);
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 truncate w-full text-center">
        {label}
      </span>
      <div className="relative w-full" style={{ height: ITEM_H * 3 }}>
        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_H,
            background: "linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))",
          }}
        />
        {/* Highlight bar */}
        <div
          className="absolute left-0 right-0 z-0"
          style={{
            top: ITEM_H,
            height: ITEM_H,
            background: "rgba(143,0,255,0.08)",
            borderTop: "1.5px solid rgba(143,0,255,0.2)",
            borderBottom: "1.5px solid rgba(143,0,255,0.2)",
            borderRadius: 10,
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_H,
            background: "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))",
          }}
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-y-scroll h-full"
          style={{
            scrollSnapType: "y mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {/* Leading spacer */}
          <div style={{ height: ITEM_H }} />
          {items.map((item) => {
            const isSel = item === selected;
            return (
              <div
                key={String(item)}
                style={{
                  height: ITEM_H,
                  scrollSnapAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  transform: isSel ? "scale(1.18)" : "scale(0.88)",
                  fontWeight: isSel ? 800 : 500,
                  fontSize: isSel ? 22 : 18,
                  color: isSel ? "#8F00FF" : "#94a3b8",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  const idx = items.indexOf(item);
                  scrollToIndex(idx, true);
                  onSelect(item);
                }}
              >
                {renderItem ? renderItem(item) : String(item).padStart(2, "0")}
              </div>
            );
          })}
          {/* Trailing spacer */}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────

interface Props {
  shopId: string;
  shopName: string;
  totalPrice: number;
  onBack: () => void;
  onContinue: (date: string, time: string) => void;
}

export default function TimeSelectionScreen({
  shopId,
  shopName,
  totalPrice,
  onBack,
  onContinue,
}: Props) {
  const today = startOfToday();

  // ── Date options
  const dateOptions = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      return {
        value: format(d, "yyyy-MM-dd"),
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d"),
      };
    });
  }, [today]);

  // ── Convex queries
  const availability = useQuery(
    api.shops.getShopAvailability,
    { shopId: shopId as Id<"shops"> }
  );

  // ── Wheel state
  const [dateIdx, setDateIdx] = useState(0);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinuteTick, setSelectedMinuteTick] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  const slotDuration = availability?.slotDuration ?? 30;

  const minuteTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 0; m < 60; m += slotDuration) ticks.push(m);
    return ticks;
  }, [slotDuration]);

  const selectedDate = dateOptions[dateIdx]?.value ?? dateOptions[0].value;
  const selectedDateLabel = dateOptions[dateIdx]?.label ?? "Today";
  const selectedMinute = minuteTicks[selectedMinuteTick] ?? 0;
  const time24 = to24h(selectedHour, selectedMinute, ampm);

  // ── Live time filter for "Today"
  const nowH24 = useMemo(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }, []);

  // Build available hour list
  const openParsed = parseTime(availability?.openTime ?? "09:00");
  const closeParsed = parseTime(availability?.closeTime ?? "21:00");

  const hourList = useMemo(() => {
    const hours: number[] = [];
    for (let h = 1; h <= 12; h++) hours.push(h);
    return hours;
  }, []);

  // ── Convex slot check (reactive)
  const slotAvail = useQuery(
    api.shops.checkSlotAvailable,
    { shopId: shopId as Id<"shops">, date: selectedDate, time: time24 }
  );

  // ── Determine if selected time is in the past (for Today)
  const isPastTime = useMemo(() => {
    if (dateIdx !== 0) return false;
    let h = selectedHour;
    if (ampm === "AM" && selectedHour === 12) h = 0;
    if (ampm === "PM" && selectedHour !== 12) h += 12;
    return h * 60 + selectedMinute <= nowH24;
  }, [dateIdx, selectedHour, selectedMinute, ampm, nowH24]);

  // Is within shop hours?
  const isWithinHours = useMemo(() => {
    const tMin = (() => {
      let h = selectedHour;
      if (ampm === "AM" && h === 12) h = 0;
      if (ampm === "PM" && h !== 12) h += 12;
      return h * 60 + selectedMinute;
    })();
    const openMin = openParsed.h24 * 60 + openParsed.min;
    const closeMin = closeParsed.h24 * 60 + closeParsed.min;
    return tMin >= openMin && tMin < closeMin;
  }, [selectedHour, selectedMinute, ampm, openParsed, closeParsed]);

  const isSlotValid =
    !isPastTime &&
    isWithinHours &&
    slotAvail?.available === true;

  // ── Display label for selected time
  const formattedTime = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")} ${ampm}`;

  const statusMessage = (() => {
    if (isPastTime) return "This time has already passed.";
    if (!isWithinHours) return `Shop opens ${availability?.openTime ?? "09:00"} – ${availability?.closeTime ?? "21:00"}.`;
    if (slotAvail === undefined) return "Checking availability…";
    if (!slotAvail.available) return slotAvail.reason ?? "Slot not available.";
    return null;
  })();

  return (
    <div className="flex flex-col bg-muted" style={{ height: "100dvh" }}>
      {/* ── Header */}
      <div className="shrink-0 customer-header px-4 pb-6 pt-4 safe-top">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white animate-fade-slide-up">Pick a Time</h1>
        <p className="mt-1 text-sm text-light-text animate-fade-in-delayed">{shopName}</p>
      </div>

      {/* ── Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 space-y-4">
        {/* Selected time display */}
        <div
          className="flex items-center justify-between rounded-[16px] bg-card px-4 py-3 card-shadow"
          style={{ border: isSlotValid ? "1.5px solid rgba(143,0,255,0.25)" : undefined }}
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">Selected</p>
            <p className="text-base font-bold" style={{ color: isSlotValid ? "#8F00FF" : "#374151" }}>
              {selectedDateLabel}, {formattedTime}
            </p>
          </div>
          <p className="text-sm font-bold text-accent">₹{totalPrice}</p>
        </div>

        {/* Wheel Picker Card */}
        <div className="rounded-[20px] bg-white px-4 py-5 card-shadow">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">
            Scroll to select time
          </p>

          {availability === undefined ? (
            <div className="py-10 text-center text-muted-foreground animate-pulse text-sm">
              Loading shop schedule…
            </div>
          ) : (
            <div className="flex gap-1 items-stretch">
              {/* Date wheel */}
              <WheelPicker
                items={dateOptions.map((_, i) => i)}
                selected={dateIdx}
                onSelect={(v) => setDateIdx(v as number)}
                label="Date"
                renderItem={(idx) => (
                  <div className="text-center">
                    <div className="text-[15px] leading-tight">
                      {dateOptions[idx].label.split(",")[0]}
                    </div>
                    {dateOptions[idx].label.includes(",") && (
                      <div className="text-[10px] opacity-60">
                        {dateOptions[idx].label.split(",")[1]}
                      </div>
                    )}
                  </div>
                )}
              />

              {/* Hour wheel */}
              <WheelPicker
                items={hourList}
                selected={selectedHour}
                onSelect={(v) => setSelectedHour(v as number)}
                label="Hour"
              />

              <div className="flex items-center justify-center text-2xl font-black text-muted-foreground mb-1">
                :
              </div>

              {/* Minute wheel */}
              <WheelPicker
                items={minuteTicks}
                selected={selectedMinute}
                onSelect={(m) => {
                  const idx = minuteTicks.indexOf(m as number);
                  setSelectedMinuteTick(idx >= 0 ? idx : 0);
                }}
                label="Min"
              />

              {/* AM/PM wheel */}
              <WheelPicker
                items={["AM", "PM"] as ("AM" | "PM")[]}
                selected={ampm}
                onSelect={(v) => setAmpm(v as "AM" | "PM")}
                label="Period"
              />
            </div>
          )}
        </div>

        {/* Status message */}
        {statusMessage && (
          <div
            className="rounded-[14px] px-4 py-3 text-sm font-semibold text-center slide-up"
            style={{
              background: isPastTime ? "rgba(239,68,68,0.08)" : "rgba(143,0,255,0.07)",
              color: isPastTime ? "#ef4444" : "#8F00FF",
            }}
          >
            {statusMessage}
          </div>
        )}

        {isSlotValid && (
          <div
            className="rounded-[14px] px-4 py-3 text-sm font-semibold text-center slide-up"
            style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}
          >
            ✓ Slot available — tap Confirm to book!
          </div>
        )}
      </div>

      {/* ── Fixed bottom button */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4 safe-bottom"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <button
          onClick={() => onContinue(selectedDate, time24)}
          disabled={!isSlotValid}
          className="h-[56px] w-full rounded-2xl text-base font-semibold text-white transition-all scale-tap"
          style={{
            background: isSlotValid
              ? "linear-gradient(135deg, #8F00FF 0%, #5F00CC 100%)"
              : "hsl(var(--muted))",
            color: isSlotValid ? "#fff" : "hsl(var(--muted-foreground))",
            boxShadow: isSlotValid ? "0 0 20px rgba(143,0,255,0.35)" : "none",
            cursor: isSlotValid ? "pointer" : "not-allowed",
          }}
        >
          {isSlotValid ? "Confirm Time" : "Select a Valid Slot"}
        </button>
      </div>
    </div>
  );
}
