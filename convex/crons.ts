import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every day to purge data older than threshold
crons.daily(
  "cleanup old notifications",
  { hourUTC: 2, minuteUTC: 0 }, // 2:00 AM UTC
  internal.cleanup.cleanupNotifications
);

crons.daily(
  "cleanup old slot bookings",
  { hourUTC: 2, minuteUTC: 15 },
  internal.cleanup.cleanupSlotBookings
);

crons.daily(
  "cleanup expired otps",
  { hourUTC: 2, minuteUTC: 30 },
  internal.cleanup.cleanupOtps
);

crons.daily(
  "cleanup old rate limits",
  { hourUTC: 2, minuteUTC: 45 },
  internal.cleanup.cleanupRateLimits
);

// FIX #2: Expire stale barberStatus records every 15 minutes
crons.interval(
  "expire stale barber statuses",
  { minutes: 15 },
  internal.walkIns.expireStaleBarberStatuses
);

export default crons;
