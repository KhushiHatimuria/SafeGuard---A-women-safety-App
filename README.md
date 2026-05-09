<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=14&pause=1000&color=C8394A&center=true&vCenter=true&width=500&lines=🛡️+Because+every+woman+deserves+to+feel+safe.;AI-powered+distress+detection.;One+tap+away+from+help." alt="Typing SVG" />

# 🛡️ SafeGuard
### *Women's Safety SOS Mobile App*

<p align="center">
  <img src="https://img.shields.io/badge/Hackathon-Submission-C8394A?style=for-the-badge&logo=devpost&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Native-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_2.5_Flash-AI_Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Express_5-API_Server-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Built_on-Replit-F26207?style=for-the-badge&logo=replit&logoColor=white" />
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" />
</p>

---

> **"Safety is not a privilege — it's a right. SafeGuard puts it in your pocket."**

</div>

---

## 🌸 What is SafeGuard?

**SafeGuard** is a full-featured, AI-powered women's safety mobile app built with **Expo React Native**. It combines multi-signal threat detection — Gemini 2.5 Flash audio analysis, keyword spotting, and motion anomaly detection — with real-time GPS tracking and instant SMS alerts to emergency contacts.

The app features a **sleek dark UI** (`#0D0D0D` background, crimson `#C8394A` accents), smooth `react-native-reanimated` animations, and is designed to work silently in the background without drawing attention when it matters most.

---

## ✨ Features

### 🆘 SOS & Emergency Response
- **One-tap SOS button** with haptic feedback — instantly triggers the emergency flow
- **Verification modal** with multiple confirmation methods: shake pattern, voice codeword, or auto-escalation after timeout
- **SOS Active screen** with live GPS tracking, elapsed timer, and real-time contact notification status
- **SMS alerts** sent automatically to all registered emergency contacts with live location

### 🤖 AI-Powered Multi-Signal Detection
- **Gemini 2.5 Flash** audio analysis — records 5-second clips every 8 seconds when monitoring is ON
- **Multilingual distress keyword detection**: English (`help`, `stop`, `save me`), Hindi (`bachao`, `chhodo`, `madad`), Spanish, French, German, and more
- **Custom codeword detection** — user sets a secret word/phrase; if spoken, SOS triggers immediately
- **Confidence thresholds** — `triggerSOS = true` only if `confidence > 0.65 AND isDistress`, or codeword detected — minimising false positives
- **Text classification** endpoint for live codeword testing from the Monitor tab

### 📡 Motion Detection
- **Accelerometer-based anomaly detection** via `expo-sensors` — rolling 10-sample window at 300ms intervals
- **Adjustable sensitivity** — Low (3.5 m/s²), Medium (2.8 m/s²), High (2.0 m/s²)
- Motion alert banner with haptic feedback; user can dismiss or escalate to SOS

### 📞 Fake Call
- Schedule a convincing fake incoming call — **Now, 1 min, 2 min, or 5 min** delay
- Simulates a realistic call from "Dad" with pre-scripted conversation audio via `expo-speech`
- Vibration, ringing animation, and full call UI to help escape uncomfortable situations discreetly

### 🎙️ Audio & Video Recording
- Silent **audio recording** (5s clips) for AI classification — skips gracefully on web
- **Video evidence recording** screen with `expo-camera`
- Cloud upload via **Cloudinary** for recorded media

### 📍 Real-Time GPS
- Continuous location tracking with `expo-location`
- Location coordinates sent with every SOS alert and continuously updated during active emergencies
- Location history stored per alert in `alert_locations` table

### 👥 Emergency Contacts Management
- Add/edit/remove contacts with name, phone, and relationship
- Designate a **primary contact** — they get priority escalation
- Async save with loading states and validation

### 📋 Alert History
- Full log of all SOS alerts from the database
- Shows trigger type (`manual`, `auto`, `keyword`, `motion`), timestamp, status (`active`, `resolved`, `cancelled`), and contacts notified count

### 👤 Profile & Medical Notes
- Store personal info and **medical notes** (blood group, conditions) — sent along with SOS alerts so responders have critical context

### ⚙️ Monitor Settings
- Toggle: keyword spotting, motion detection, vibration, auto-escalate
- **Monitoring schedule** — set active hours (e.g. only monitor 9 PM – 7 AM) for battery/privacy control
- Permission grants from the Settings tab
- **"Test Codeword Detection"** card — type any phrase to verify detection works via live API call

---

## 🏗️ Architecture

```
SafeGuard (Monorepo — pnpm workspaces)
│
├── artifacts/
│   ├── safe-guard/              # Expo React Native mobile app
│   │   ├── app/(tabs)/          # Guardian, Contacts, Monitor, History, Profile tabs
│   │   ├── app/sos-active.tsx   # Active SOS screen with live GPS
│   │   ├── app/fake-call.tsx    # Fake call screen
│   │   ├── app/permissions.tsx  # Onboarding permissions flow
│   │   ├── app/video-recorder.tsx
│   │   ├── components/
│   │   │   ├── SOSButton.tsx        # Animated hold-to-trigger SOS button
│   │   │   └── VerificationModal.tsx # Multi-mode SOS confirmation
│   │   ├── context/SafeGuardContext.tsx  # Global state + voice loop + motion detection
│   │   └── server/proxy.mjs     # Dev proxy: routes /api-server/* → Express, rest → Expo
│   │
│   └── api-server/src/routes/   # Express 5 + TypeScript REST API
│       ├── classify.ts          # POST /classify/audio + /classify/text (Gemini AI)
│       ├── alerts.ts            # SOS alert CRUD + location updates
│       ├── contacts.ts          # Emergency contacts CRUD
│       ├── profile.ts           # User profile upsert
│       └── audio-ws.ts          # WebSocket audio streaming
│
├── lib/
│   ├── db/src/schema/safeguard.ts   # Drizzle ORM schema (PostgreSQL)
│   ├── integrations-gemini-ai/      # Gemini 2.5 Flash client wrapper
│   ├── api-spec/openapi.yaml        # OpenAPI spec
│   └── api-client-react/            # Auto-generated typed API client (Orval)
```

---

## 🗄️ Database Schema

```
profiles          → id, name, phone, bloodGroup, medicalNotes
emergency_contacts → id, name, phone, relationship, isPrimary
sos_alerts        → id, status, triggerType, lat/lng, contactsNotified,
                    audioRecorded, videoRecorded, notes, createdAt, resolvedAt
alert_locations   → id, alertId (FK), lat, lng, accuracy, timestamp
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 📱 Mobile | Expo SDK 54 / React Native + Expo Router (file-based routing) |
| 🎨 UI/Animations | react-native-reanimated, expo-linear-gradient, Feather + MaterialCommunityIcons |
| 🤖 AI | Gemini 2.5 Flash — audio & text distress/codeword classification |
| 🌐 API | Express 5 + TypeScript, esbuild bundled |
| 🗄️ Database | PostgreSQL + Drizzle ORM |
| 📡 Sensors | expo-sensors (Accelerometer), expo-av (Audio), expo-location (GPS) |
| 🎥 Media | expo-camera, Cloudinary (cloud upload) |
| 📱 Native | expo-haptics, expo-speech, expo-file-system |
| 🔧 Tooling | pnpm workspaces monorepo, Orval (API codegen), Zod validation |
| ☁️ Platform | Replit (dev + deployment) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (auto-provided on Replit)
- Google Gemini API key

### Environment Variables

```env
DATABASE_URL=your_postgres_connection_string
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN
```

### Installation & Run

```bash
# Clone the repo
git clone https://github.com/KhushiHatimuria/SafeGuard---A-women-safety-App.git
cd SafeGuard---A-women-safety-App

# Install all workspace dependencies
pnpm install

# Apply database schema
pnpm --filter @workspace/db run push

# Start the API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start the Expo mobile app (in a new terminal)
pnpm --filter @workspace/safe-guard run dev
```

> 💡 The dev proxy (`server/proxy.mjs`) routes all `/api-server/api/*` requests to `localhost:8080` and everything else to the Expo bundler — making API calls same-origin and eliminating CORS issues in the browser preview.

---

## 📱 App Flow

```
Launch App
    │
    ▼
Permissions Screen
(Microphone · Location · Camera · Motion Sensors · Background Activity)
    │
    ▼
Guardian Tab (Home)
┌─────────────────────────────────────┐
│  ● Monitoring: ON/OFF toggle         │
│  ● Voice listening pulse indicator   │
│  ● Motion alert banner               │
│  ● [  SOS BUTTON  ] — hold to arm   │
│  ● Last detection · Alert count      │
└─────────────────────────────────────┘
    │
    ▼ (SOS triggered — manual / voice / motion)
    │
Verification Modal
(Shake pattern · Codeword · Auto-escalate after timeout)
    │
    ▼
SOS Active Screen
  → GPS tracked continuously
  → SMS sent to all emergency contacts
  → Audio/video recording begins
  → Location streamed to alert_locations table
    │
    ▼
[Deactivate] → Alert status → "resolved"
```

---

## 🔬 AI Detection Pipeline

```
Every 8 seconds (when monitoring ON):
┌──────────────────────────────────────────────────────┐
│  Record 5s audio clip (expo-av)                      │
│        ↓                                             │
│  POST /classify/audio with base64 audio + codeword   │
│        ↓                                             │
│  Gemini 2.5 Flash analyzes:                          │
│    • Distress keywords (multilingual)                │
│    • Screaming / panic / struggle sounds             │
│    • Secret codeword match                           │
│        ↓                                             │
│  Returns: { isDistress, confidence, codeword,        │
│             detectedKeywords, triggerSOS }            │
│        ↓                                             │
│  triggerSOS = true?                                  │
│    YES → Verification Modal → SOS Active             │
│    NO  → Continue monitoring                         │
└──────────────────────────────────────────────────────┘
```

---

## 🏆 Hackathon Details

<div align="center">

| | |
|--|--|
| 🎯 **Theme** | Women Safety & Empowerment |
| 👩‍💻 **Built by** | [@KhushiHatimuria](https://github.com/KhushiHatimuria) |
| ⚡ **AI Model** | Google Gemini 2.5 Flash |
| 🌍 **Impact** | Multi-signal, low-false-positive safety for real-world scenarios |
| 🌐 **Languages supported** | English, Hindi, Spanish, French, German (distress keywords) |

</div>

---

## 🤝 Contributing

```bash
# Fork → branch → code → PR
git checkout -b feature/your-feature
git commit -m "Add: your feature description"
git push origin feature/your-feature
# Open a Pull Request 🎉
```

---

## 🙏 Acknowledgements

- 💙 **Google Gemini 2.5 Flash** — for intelligent, multilingual audio distress classification
- 🧡 **Expo & React Native** — for a smooth cross-platform mobile experience
- 🐘 **Drizzle ORM** — for type-safe PostgreSQL access
- 🔧 **Replit** — for seamless development and deployment
- 💜 Every woman who inspired this project — **you deserve to feel safe, always**

---

<div align="center">

### 💗 Built with code, care, and a purpose

<img src="https://img.shields.io/badge/If_this_helped_you-⭐_Star_the_repo-C8394A?style=for-the-badge" />

**SafeGuard** · *Because safety is not a privilege — it's a right.*

---

*© 2025 KhushiHatimuria · Hackathon Submission · Open Source ❤️*

</div>
