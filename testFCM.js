import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
dotenv.config();

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function testPush() {
    try {
        console.log("Triggering Push on Convex Backend...");
        const result = await client.action("pushNotifications:sendPushNotification", {
            fcmToken: "FAKE_TOKEN",
            title: "Test",
            body: "Test"
        });
        console.log("Action result:", JSON.stringify(result, null, 2));
    } catch(e) {
        console.error("error", e);
    }
}
testPush();
