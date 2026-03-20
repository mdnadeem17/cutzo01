import { ArrowLeft, Calendar, Trash2 } from "lucide-react";
import { useState } from "react";
import { AvailabilitySlot, BlockedDate, WorkingHours } from "./types";
import { formatFullDate, formatHourLabel } from "./utils";

interface Props {
  slots: AvailabilitySlot[];
  workingHours: WorkingHours;
  blockedDates: BlockedDate[];
  onBack: () => void;
  onToggleSlot: (id: string) => void;
  onUpdateWorkingHours: (hours: WorkingHours) => void;
  onAddBlockedDate: (blockedDate: Omit<BlockedDate, "id">) => void;
  onRemoveBlockedDate: (id: string) => void;
}

const hourOptions = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export default function AvailabilityScreen({
  slots,
  workingHours,
  blockedDates,
  onBack,
  onToggleSlot,
  onUpdateWorkingHours,
  onAddBlockedDate,
  onRemoveBlockedDate,
}: Props) {
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

  const handleAddBlockedDate = () => {
    if (!blockedDate || !blockedReason.trim()) {
      return;
    }

    onAddBlockedDate({ date: blockedDate, reason: blockedReason.trim() });
    setBlockedDate("");
    setBlockedReason("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-10">
      <div className="brand-gradient px-4 pb-8 pt-12">
        <button
          onClick={onBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm font-medium text-light-text">Control your calendar</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Availability</h1>
        <p className="mt-1 text-sm text-light-text">
          Open time slots, set working hours, and block dates before they fill up.
        </p>
      </div>

      <div className="-mt-5 flex flex-col gap-4 px-4">
        <div className="rounded-[18px] bg-card p-4 card-shadow">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Set working hours
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Start</span>
              <select
                value={workingHours.start}
                onChange={(event) =>
                  onUpdateWorkingHours({ ...workingHours, start: event.target.value })
                }
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none"
              >
                {hourOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatHourLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">End</span>
              <select
                value={workingHours.end}
                onChange={(event) =>
                  onUpdateWorkingHours({ ...workingHours, end: event.target.value })
                }
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none"
              >
                {hourOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatHourLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-[18px] bg-card p-4 card-shadow">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Time slots
              </p>
              <h2 className="mt-1 text-lg font-bold text-foreground">
                {slots.filter((slot) => slot.enabled).length} slots open
              </h2>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-[14px] border border-border bg-muted px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{slot.time}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slot.enabled ? "Open for bookings" : "Hidden from customers"}
                  </p>
                </div>

                <button
                  onClick={() => onToggleSlot(slot.id)}
                  className="relative h-8 w-14 rounded-full transition-colors"
                  style={{
                    background: slot.enabled ? "hsl(var(--accent))" : "hsl(var(--border))",
                  }}
                >
                  <span
                    className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all"
                    style={{ left: slot.enabled ? "calc(100% - 28px)" : "4px" }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] bg-card p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--primary) / 0.08)" }}
            >
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Block a date</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Stop bookings on holidays, training days, or maintenance windows.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <input
              type="date"
              value={blockedDate}
              onChange={(event) => setBlockedDate(event.target.value)}
              className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
            />
            <input
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
              placeholder="Reason for blocking this date"
            />
            <button
              onClick={handleAddBlockedDate}
              disabled={!blockedDate || !blockedReason.trim()}
              className="gradient-btn h-12 rounded-[14px] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add blocked date
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {blockedDates.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-[14px] border border-border bg-muted px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatFullDate(entry.date)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                </div>
                <button
                  onClick={() => onRemoveBlockedDate(entry.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-destructive"
                  style={{ background: "hsl(var(--destructive) / 0.1)" }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
