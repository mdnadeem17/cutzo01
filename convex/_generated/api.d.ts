/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_actions from "../auth_actions.js";
import type * as bookings from "../bookings.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as profile from "../profile.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reviews from "../reviews.js";
import type * as services from "../services.js";
import type * as shops from "../shops.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth_actions: typeof auth_actions;
  bookings: typeof bookings;
  http: typeof http;
  migrations: typeof migrations;
  profile: typeof profile;
  rateLimit: typeof rateLimit;
  reviews: typeof reviews;
  services: typeof services;
  shops: typeof shops;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
