import { Calendar, CalendarX, Trash2 } from "lucide-react";
import { useState } from "react";
import { AvailabilitySlot, BlockedDate, BreakTime, WorkingHours } from "./types";
import { formatFullDate, formatHourLabel } from "./utils";
import CutzoHeader from "./CutzoHeader";




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
  onUpdateSettings: (hours: WorkingHours, slotDuration: number, breakTime: BreakTime | null) => void;
  onUpdateMaxBookings: (max: number) => void;
  onAddBlockedDate: (blockedDate: Omit<BlockedDate, "id">) => void;
  onRemoveBlockedDate: (id: string) => void;
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
  onUpdateSettings,
  onUpdateMaxBookings,
  onAddBlockedDate,
  onRemoveBlockedDate,
}: Props) {
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

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



  // ── Select options ─────────────────────────────────────────────────────────
  const selectCls = "h-12 w-full rounded-[14px] border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24">
      {/* Header */}
      <CutzoHeader
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
                {[10, 15, 20, 25, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
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
            <span className="font-bold text-slate-600">{slots.length} slots</span>
          </p>
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
