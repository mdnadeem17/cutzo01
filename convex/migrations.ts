import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time migration to link legacy `owner-` shop owners to their real Firebase UIDs.
 * Matches by phone number for shops with role "shop_owner".
 * 
 * This is an internal mutation that can only be called from the Convex dashboard
 * or other internal functions. It is NOT accessible from the client.
 */
export const migrateLegacyOwners = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const shops = await ctx.db.query("shops").collect();
    let migratedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const shop of shops) {
      const needsMigration = !shop.firebaseUid || shop.firebaseUid.startsWith("owner-");
      
      if (!needsMigration) {
        skippedCount++;
        continue;
      }

      // Try to find a matching user by phone
      if (!shop.phone) {
        notFoundCount++;
        continue;
      }

      const matchingUser = await ctx.db
        .query("users")
        .withIndex("by_uid") // We can't query by phone easily without an index, so we'll filter
        .filter((q) => q.and(
          q.eq(q.field("phone"), shop.phone),
          q.eq(q.field("role"), "shop_owner")
        ))
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

    return {
      status: args.dryRun ? "DRY RUN COMPLETE" : "MIGRATION COMPLETE",
      migrated: migratedCount,
      skipped: skippedCount,
      notFoundInUsers: notFoundCount,
    };
  },
});
