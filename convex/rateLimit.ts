import { GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

export async function checkRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  userId: string,
  endpoint: string,
  maxCalls: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // 1. Count concurrent requests in this window.
  // Convex tracks the read of this index range, so concurrent inserts will trigger OCC retries.
  const recentLogs = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_endpoint_time", (q) =>
      q.eq("userId", userId).eq("endpoint", endpoint).gt("timestamp", windowStart)
    )
    .collect();

  if (recentLogs.length >= maxCalls) {
    throw new Error(`Rate limit exceeded for ${endpoint}. Please try again later.`);
  }

  // 2. Clear old logs (older than 2x window) to keep the table size small.
  // We do this in-line to ensure we don't accumulate millions of rows over time.
  const oldLogs = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_endpoint_time", (q) =>
      q.eq("userId", userId).eq("endpoint", endpoint).lt("timestamp", now - windowMs * 2)
    )
    .collect();
  
  for (const log of oldLogs) {
    await ctx.db.delete(log._id);
  }

  // 3. Record this request
  await ctx.db.insert("rateLimits", {
    userId,
    endpoint,
    timestamp: now,
  });
}
