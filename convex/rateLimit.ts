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
  const limitRecord = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_endpoint", (q) => q.eq("userId", userId).eq("endpoint", endpoint))
    .first();

  if (limitRecord) {
    if (now - limitRecord.windowStart > windowMs) {
      await ctx.db.patch(limitRecord._id, { count: 1, windowStart: now });
    } else if (limitRecord.count >= maxCalls) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Please try again later.`);
    } else {
      await ctx.db.patch(limitRecord._id, { count: limitRecord.count + 1 });
    }
  } else {
    await ctx.db.insert("rateLimits", {
      userId,
      endpoint,
      count: 1,
      windowStart: now,
    });
  }
}
