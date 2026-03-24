# Trimo Booking Hub

A premium, modern barber booking platform built for both customers and shop owners. This project is a hybrid web and mobile application (Android) providing a seamless booking experience.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Shadcn/UI
- **Animations**: Framer Motion for premium, smooth transitions
- **State Management**: React Hooks (useState, useEffect) and Convex Queries

### Backend & Database
- **Platform**: [Convex](https://www.convex.dev/) (Real-time backend)
- **Functions**: Type-safe Mutations and Queries
- **Schema**: Structured tables for `users`, `shops`, `bookings`, `reviews`, and `slotBookings`.

### Authentication
- **Provider**: Firebase Authentication
- **Native Implementation**: `@capacitor-firebase/authentication` for native Google Sign-In on Android (No browser redirects).
- **Web Implementation**: Firebase JS SDK for seamless web-based login.

### Mobile Wrapper
- **Platform**: [Capacitor](https://capacitorjs.com/)
- **Native Features**: Google Sign-In, Geolocation for shop discovery.

---

## 📱 User Flows

### 1. Customer Journey
- **Splash & Onboarding**: Premium animated introduction.
- **Home**: Real-time listing of barber shops with distance and ratings.
- **Discovery**: Search and filter shops based on location and services.
- **Booking Flow**:
  1. **Select Services**: Multi-select services with real-time price calculation.
  2. **Select Time**: Interactive calendar and time slot picker (prevents double-booking).
  3. **Confirmation**: OTP-secured booking confirmation.
- **Activity**: Track active, completed, and cancelled bookings. Submit reviews for past visits.
- **Profile**: Manage personal details and saved shops.

### 2. Shop Owner (Partner) Journey
- **Enrollment**: Comprehensive setup flow including shop name, location, working hours, and service catalog.
- **Dashboard**: Real-time view of daily bookings and customer details.
- **Shop Management**: 
  - Toggle shop status (Open/Closed).
  - Manage services and pricing.
  - View and respond to customer reviews.
- **Authentication**: Secure login via username/password or Google Auth.

---

## 🛠 Project Structure

### `/src`
- **`/components/trimo`**: Core UI components for the customer-facing app.
- **`/components/vendor`**: Dashboard and management components for shop owners.
- **`/pages`**: Main page entries (Index, NotFound).
- **`/lib`**: Firebase and utility configurations.

### `/convex`
- **`schema.ts`**: Definitive database structure.
- **`bookings.ts` / `shops.ts` / `users.ts`**: Backend logic for core features.
- **`slotBookings.ts`**: Real-time availability management logic.

### `/android`
- Android Studio project files for the Capacitor mobile application.

---

## 🛠 Development & Build

### Setup
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up `.env` with your `VITE_CONVEX_URL` and Firebase credentials.

### Run Locally
`npm run dev`

### Run on Android
`npm run android`
*(Builds web assets, copies to Android project, and launches the app on your device)*

---

## 🔒 Security & Performance
- **IDOR Protection**: All Convex mutations verify user ownership before modification.
- **Native Auth**: Uses native Firebase SDK to prevent insecure web-based redirects.
- **Optimized Assets**: Image compression and lazy-loading for a fast mobile experience.
