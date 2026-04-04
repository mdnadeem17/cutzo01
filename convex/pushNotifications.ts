"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { GoogleAuth } from "google-auth-library";

// Keep instance cached across Action container invocations
let accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const serviceAccountJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJsonStr) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
  }

  const credentials = JSON.parse(serviceAccountJsonStr);

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (token.token) {
    // Cache for 50 minutes (expires in ~60)
    accessTokenCache = {
      token: token.token,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return token.token;
  }
  
  throw new Error("Failed to get Google Access Token");
}

export const sendPushNotification = action({
  args: {
    fcmToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()), // custom payload data
  },
  handler: async (ctx, args) => {
    try {
      const accessToken = await getAccessToken();

      const serviceAccountJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountJsonStr) return;
      const projectId = JSON.parse(serviceAccountJsonStr).project_id;

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      const payload = {
        message: {
          token: args.fcmToken,
          notification: {
            title: args.title,
            body: args.body,
          },
          android: {
            notification: {
              sound: "default",
              click_action: "FCM_PLUGIN_ACTIVITY",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
          data: args.data || {},
        },
      };

      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("FCM Send Error:", errData);
        return { success: false, error: errData };
      }
      return { success: true };
    } catch (e: any) {
      console.error("Failed to send push notification:", e);
      return { success: false, error: e.message };
    }
  },
});
