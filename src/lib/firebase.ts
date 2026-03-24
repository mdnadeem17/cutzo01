import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUkT3h3owQ0eUTdfNR13-GBIb9pCbKGBg",
  authDomain: "trimo-e4f93.firebaseapp.com",
  projectId: "trimo-e4f93",
  storageBucket: "trimo-e4f93.firebasestorage.app",
  messagingSenderId: "648252665759",
  appId: "1:648252665759:web:ea123456789" // Placeholder if real one is unknown, or just omit if only using auth
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
