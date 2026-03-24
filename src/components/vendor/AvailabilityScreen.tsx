import { Calendar, CalendarX, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { AvailabilitySlot, BlockedDate, BreakTime, WorkingHours } from "./types";
import { formatFullDate, formatHourLabel } from "./utils";
import TrimoHeader from "./TrimoHeader";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "HH:mm" → total minutes since midnight */
const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

/** total minutes → "HH:mm" */
const fromMins = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** "HH:mm" → "hh:mm AM/PM" — never returns NaN */
const to12h = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

/** Is slot in the past (today)? */
const isPast = (time24: string) => {
  const now = new Date();
  const [h, m] = time24.split(":").map(Number);
  const slotMs = new Date();
  slotMs.setHours(h, m, 0, 0);
  return slotMs.getTime() < now.getTime();
};

/** Is slot during break? */
const isDuringBreak = (time24: string, breakTime: BreakTime | null) => {
  if (!breakTime) return false;
  return time24 >= breakTime.start && time24 < breakTime.end;
};

type SlotStatus = "open" | "closed" | "break" | "past" | "full";

interface RichSlot {
  id: string;
  time24: string;    // "HH:mm" internal
  enabled: boolean;
  status: SlotStatus;
}

/** Compute status for a slot */
const getStatus = (slot: AvailabilitySlot, breakTime: BreakTime | null): SlotStatus => {
  const time24 = slot.time.includes("AM") || slot.time.includes("PM")
    ? to24(slot.time)
    : slot.time;
  if (isPast(time24)) return "past";
  if (isDuringBreak(time24, breakTime)) return "break";
  if (!slot.enabled) return "closed";
  return "open";
};

/** "hh:mm AM/PM" → "HH:mm" */
const to24 = (t12: string): string => {
  const parts = t12.split(/:| /);
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const suf = parts[2]?.toUpperCase();
  if (suf === "PM" && h !== 12) h += 12;
  if (suf === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Status styling map
const STATUS_STYLE: Record<SlotStatus, { bg: string; border: string; dot: string; text: string; subtext: string; trackOn: string; trackOff: string; label: string }> = {
  open:   { bg: "bg-white",        border: "border-teal-300",  dot: "bg-teal-500",  text: "text-teal-800",   subtext: "text-teal-500",  trackOn: "bg-teal-600",  trackOff: "bg-slate-300", label: "Open"   },
  closed: { bg: "bg-slate-100",    border: "border-slate-300", dot: "bg-slate-500", text: "text-slate-700",  subtext: "text-slate-500", trackOn: "bg-teal-600",  trackOff: "bg-slate-400", label: "Closed" },
  break:  { bg: "bg-orange-50",    border: "border-orange-300",dot: "bg-orange-500",text: "text-orange-700", subtext: "text-orange-500",trackOn: "bg-orange-500",trackOff: "bg-orange-300",label: "Break"  },
  past:   { bg: "bg-red-50",       border: "border-red-200",   dot: "bg-red-500",   text: "text-red-600",    subtext: "text-red-400",   trackOn: "bg-red-500",   trackOff: "bg-red-200",   label: "Past"   },
  full:   { bg: "bg-rose-50",      border: "border-rose-300",  dot: "bg-rose-600",  text: "text-rose-700",   subtext: "text-rose-500",  trackOn: "bg-rose-600",  trackOff: "bg-rose-300",  label: "Full"   },
};

// ─── Hour-group type ─────────────────────────────────────────────────────────
interface HourGroup {
  hourLabel: string;  // "09:00 AM"
  slots: RichSlot[];
}

// ─── half-hour options for working hours (07:00–23:00) ───────────────────────
const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  slots: AvailabilitySlot[];
  workingHours: WorkingHours;
  slotDuration: number;
  maxBookingsPerSlot: number;
  breakTime: BreakTime | null;
  blockedDates: BlockedDate[];
  onBack: () => void;
  onToggleSlot: (id: string) => void;
  onToggleAllSlots: (enabled: boolean) => void;
  onUpdateSettings: (hours: WorkingHours, slotDuration: number, breakTime: BreakTime | null) => void;
  onUpdateMaxBookings: (max: number) => void;
  onAddBlockedDate: (blockedDate: Omit<BlockedDate, "id">) => void;
  onRemoveBlockedDate: (id: string) => void;
}

// ─── Mini Toggle Component ───────────────────────────────────────────────────
function MiniToggle({ on, trackOn, trackOff }: { on: boolean; trackOn: string; trackOff: string }) {
  return (
    <div className={`relative h-[26px] w-[48px] flex-shrink-0 rounded-full shadow-inner transition-colors duration-300 ${on ? trackOn : trackOff}`}>
      <span
        className="absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300"
        style={{ left: on ? "calc(100% - 23px)" : "3px" }}
      />
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AvailabilityScreen({
  slots,
  workingHours,
  slotDuration,
  maxBookingsPerSlot,
  breakTime,
  blockedDates,
  onBack,
  onToggleSlot,
  onToggleAllSlots,
  onUpdateSettings,
  onUpdateMaxBookings,
  onAddBlockedDate,
  onRemoveBlockedDate,
}: Props) {
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [expandedHours, setExpandedHours] = useState<Record<string, boolean>>({});

  // Derive rich slots with status
  const richSlots = useMemo<RichSlot[]>(() => {
    return slots.map((s) => {
      const time24 = s.time.includes("AM") || s.time.includes("PM") ? to24(s.time) : s.time;
      const status = getStatus(s, breakTime);
      return { id: s.id, time24, enabled: s.enabled, status };
    });
  }, [slots, breakTime]);

  // Counts
  const openCount = richSlots.filter((s) => s.status === "open").length;
  const totalFuture = richSlots.filter((s) => s.status !== "past").length;

  // Bulk action states
  const toggleableSlots = richSlots.filter((s) => s.status !== "past" && s.status !== "break");
  const allOn  = toggleableSlots.length > 0 && toggleableSlots.every((s) => s.enabled);
  const allOff = toggleableSlots.length > 0 && toggleableSlots.every((s) => !s.enabled);

  // Group by hour for large slot counts; flat 2-col grid otherwise
  const useGrouped = richSlots.length > 24;

  const hourGroups = useMemo<HourGroup[]>(() => {
    if (!useGrouped) return [];
    const groups: Record<string, RichSlot[]> = {};
    for (const s of richSlots) {
      const hourKey = s.time24.slice(0, 2) + ":00"; // "09:00"
      if (!groups[hourKey]) groups[hourKey] = [];
      groups[hourKey].push(s);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, slotsInHour]) => ({
        hourLabel: to12h(hour),
        slots: slotsInHour,
      }));
  }, [richSlots, useGrouped]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleWorkingHoursChange = (field: "start" | "end", value: string) =>
    onUpdateSettings({ ...workingHours, [field]: value }, slotDuration, breakTime);

  const handleBreakTimeChange = (field: "start" | "end", value: string) => {
    const next = breakTime ? { ...breakTime, [field]: value } : { start: "13:00", end: "14:00", [field]: value };
    onUpdateSettings(workingHours, slotDuration, next);
  };

  const handleAddBlockedDate = () => {
    if (!blockedDate || !blockedReason.trim()) return;
    onAddBlockedDate({ date: blockedDate, reason: blockedReason.trim() });
    setBlockedDate("");
    setBlockedReason("");
  };

  const toggleHourGroup = (hour: string) =>
    setExpandedHours((prev) => ({ ...prev, [hour]: !prev[hour] }));

  // ── Slot card ──────────────────────────────────────────────────────────────
  const SlotCard = ({ slot }: { slot: RichSlot }) => {
    const s = STATUS_STYLE[slot.status];
    const interactive = slot.status !== "past" && slot.status !== "break";
    return (
      <button
        onClick={() => interactive && onToggleSlot(slot.id)}
        disabled={!interactive}
        className={`flex items-center rounded-[14px] border px-3 py-3 text-left transition-all duration-200 ${s.bg} ${s.border} ${
          interactive ? "active:scale-[0.97] cursor-pointer" : "opacity-60 cursor-not-allowed"
        }`}
      >
        {/* Left: dot + time + status */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} />
            <p className={`text-[13px] font-black leading-none truncate ${s.text}`}>{to12h(slot.time24)}</p>
          </div>
          <span className={`pl-3.5 text-[9px] font-bold uppercase tracking-wider ${s.subtext}`}>{s.label}</span>
        </div>
        {/* Right: toggle */}
        {interactive && (
          <div className="ml-2 mr-[2px] flex-shrink-0">
            <MiniToggle on={slot.enabled} trackOn={s.trackOn} trackOff={s.trackOff} />
          </div>
        )}
      </button>
    );
  };

  // ── Select options ─────────────────────────────────────────────────────────
  const selectCls = "h-12 w-full rounded-[14px] border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24">
      {/* Header */}
      <TrimoHeader
        title="Availability"
        subtitle="Working hours, slots & blocked dates"
        showBackButton
        onBack={onBack}
      />

      <div className="mt-4 flex flex-col gap-4 px-4">

        {/* ── SECTION 1: Working Hours ────────────────────────────────────── */}
        <div className="rounded-[18px] bg-white p-4 shadow-sm border border-slate-100 flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Working Hours</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Opening Time</span>
                <select value={workingHours.start} onChange={(e) => handleWorkingHoursChange("start", e.target.value)} className={selectCls}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatHourLabel(t)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Closing Time</span>
                <select value={workingHours.end} onChange={(e) => handleWorkingHoursChange("end", e.target.value)} className={selectCls}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatHourLabel(t)}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Break Time */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Break Time</p>
              {breakTime && (
                <button
                  onClick={() => onUpdateSettings(workingHours, slotDuration, null)}
                  className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-100"
                >
                  Remove Break
                </button>
              )}
            </div>
            {!breakTime ? (
              <button
                onClick={() => handleBreakTimeChange("start", "13:00")}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400 hover:bg-slate-100 transition-colors"
              >
                + Add Break Time
              </button>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Break Start</span>
                  <select value={breakTime.start} onChange={(e) => handleBreakTimeChange("start", e.target.value)} className={selectCls}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatHourLabel(t)}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Break End</span>
                  <select value={breakTime.end} onChange={(e) => handleBreakTimeChange("end", e.target.value)} className={selectCls}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatHourLabel(t)}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 2: Slot Rules ───────────────────────────────────────── */}
        <div className="rounded-[18px] bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slot Rules</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Slot Duration</span>
              <select value={slotDuration} onChange={(e) => onUpdateSettings(workingHours, Number(e.target.value), breakTime)} className={selectCls}>
                {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Max Chairs / Slot</span>
              <select value={maxBookingsPerSlot} onChange={(e) => onUpdateMaxBookings(Number(e.target.value))} className={selectCls}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "chair" : "chairs"}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2.5 text-[11px] leading-snug text-slate-400">
            Total slots = (Closing − Opening − Break) ÷ {slotDuration} min ={" "}
            <span className="font-bold text-slate-600">{richSlots.length} slots</span>
          </p>
        </div>

        {/* ── SECTION 3: Time Slots ───────────────────────────────────────── */}
        <div className="rounded-[18px] bg-white p-4 shadow-sm border border-slate-100">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Slots</p>
              <h2 className="mt-1 text-xl font-black text-slate-800">
                {openCount}{" "}
                <span className="text-sm font-semibold text-slate-400">/ {totalFuture} open</span>
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleAllSlots(true)}
                disabled={allOn}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  allOn ? "bg-slate-100 text-slate-300" : "bg-teal-50 text-teal-600 hover:bg-teal-100"
                }`}
              >
                ON All
              </button>
              <button
                onClick={() => onToggleAllSlots(false)}
                disabled={allOff}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  allOff ? "bg-slate-100 text-slate-300" : "bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                OFF All
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
            {(["open", "closed", "break", "past"] as SlotStatus[]).map((key) => {
              const s = STATUS_STYLE[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="text-[10px] font-bold text-slate-400">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Slot display */}
          {richSlots.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No slots available with current settings.
            </p>
          )}

          {/* FLAT 2-col grid (≤ 24 slots) */}
          {!useGrouped && richSlots.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {richSlots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
            </div>
          )}

          {/* GROUPED BY HOUR (> 24 slots) */}
          {useGrouped && hourGroups.map((group) => {
            const isOpen = expandedHours[group.hourLabel] !== false; // default: expanded
            return (
              <div key={group.hourLabel} className="mb-3">
                {/* Hour row header */}
                <button
                  onClick={() => toggleHourGroup(group.hourLabel)}
                  className="flex w-full items-center justify-between rounded-[12px] bg-slate-50 border border-slate-100 px-3 py-2 mb-2"
                >
                  <span className="text-[12px] font-black text-slate-600">{group.hourLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">
                      {group.slots.filter((s) => s.status === "open").length}/{group.slots.length} open
                    </span>
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {group.slots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── SECTION 4: Block Date ───────────────────────────────────────── */}
        <div className="rounded-[18px] bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
              <CalendarX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Block a Date</p>
              <p className="text-xs text-slate-400">Holidays, training, or maintenance days</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="date"
              value={blockedDate}
              onChange={(e) => setBlockedDate(e.target.value)}
              className="h-12 rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <input
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              className="h-12 rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400"
              placeholder="Reason (e.g. Holiday, Training)"
            />
            <button
              onClick={handleAddBlockedDate}
              disabled={!blockedDate || !blockedReason.trim()}
              className="h-12 rounded-[14px] bg-gradient-to-r from-red-500 to-rose-500 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-opacity disabled:opacity-40"
            >
              + Add Blocked Date
            </button>
          </div>

          {blockedDates.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {blockedDates.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-[14px] bg-red-50 border border-red-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-black text-red-700">{formatFullDate(entry.date)}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-red-400">{entry.reason}</p>
                  </div>
                  <button
                    onClick={() => onRemoveBlockedDate(entry.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
