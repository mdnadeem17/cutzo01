// Uses the Convex Deployment Platform API directly to update env var
import { readFileSync } from "fs";

const keyPath = "C:\\Users\\lenovo\\Downloads\\cutzo-72b9e-firebase-adminsdk-fbsvc-f2307fd691.json";
const keyJson = readFileSync(keyPath, "utf-8").trim();

const DEPLOY_KEY = "dev:successful-dalmatian-815|eyJ2MiI6ImJiYzljMjE0ZmZhZTRjNzNhYzJmYmQ4NWZlYmU4M2I3In0=";
const CONVEX_URL = "https://successful-dalmatian-815.convex.cloud";

// Correct Convex Platform API endpoint
const url = `${CONVEX_URL}/api/update_environment_variables`;

console.log("Setting FIREBASE_SERVICE_ACCOUNT_KEY...");
console.log("Key length:", keyJson.length, "chars");

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Convex ${DEPLOY_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    changes: [
      {
        name: "FIREBASE_SERVICE_ACCOUNT_KEY",
        value: keyJson,
      }
    ]
  }),
});

const text = await response.text();
console.log("Status:", response.status);

if (response.ok) {
  console.log("✅ Successfully set FIREBASE_SERVICE_ACCOUNT_KEY!");
} else {
  console.log("Response:", text.substring(0, 500));
}
