import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * One-time migration to link legacy `owner-` shop owners to their real Firebase UIDs.
 * Matches by phone number for shops with role "shop_owner".
 * 
 * Refactored to use batched pagination to avoid timeouts on large datasets.
 */
export const migrateLegacyOwners = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;
    const { page, isDone, continueCursor } = await ctx.db
      .query("shops")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let migratedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const shop of page) {
      const needsMigration = !shop.firebaseUid || shop.firebaseUid.startsWith("owner-");
      
      if (!needsMigration) {
        skippedCount++;
        continue;
      }

      if (!shop.phone) {
        notFoundCount++;
        continue;
      }

      // Efficient lookup via the new by_phone index
      const matchingUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", shop.phone))
        .filter((q) => q.eq(q.field("role"), "shop_owner"))
        .first();

      if (matchingUser) {
        migratedCount++;
        if (!args.dryRun) {
          await ctx.db.patch(shop._id, {
            firebaseUid: matchingUser.uid,
            ownerId: matchingUser.uid,
          });
        }
      } else {
        notFoundCount++;
      }
    }

    console.log(`Batch processed: ${migratedCount} migrated, ${skippedCount} skipped, ${notFoundCount} not found.`);

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.migrateLegacyOwners, {
        cursor: continueCursor,
        batchSize,
        dryRun: args.dryRun,
      });
      return {
        status: "BATCH_COMPLETE_CONTINUING",
        migratedInThisBatch: migratedCount,
        isDone: false,
      };
    }

    return {
      status: args.dryRun ? "DRY RUN COMPLETE" : "MIGRATION COMPLETE",
      migratedInThisBatch: migratedCount,
      isDone: true,
    };
  },
});

export const clearRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("rateLimits").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
  },
});
