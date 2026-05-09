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
  <img src="https://img.shields.io/badge/Open_Source-❤️-C8394A?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge" />
</p>

<br/>

### 🌐 [**Try the Live App →**](https://newapp--1ep23cs077khush.replit.app)

---

> **"Safety is not a privilege — it's a right. SafeGuard puts it in your pocket."**

</div>

---

## 🌸 Project Overview

**SafeGuard** is a full-featured, AI-powered women's safety mobile app. It combines multi-signal threat detection — **Gemini 2.5 Flash** audio analysis, multilingual keyword spotting, and accelerometer-based motion anomaly detection — with real-time GPS tracking and instant SMS alerts to emergency contacts.

The app features a sleek **dark UI** with smooth animations, designed to operate silently in the background without drawing attention when it matters most.

Built with ❤️ by **Team Trivera.**

---

## ✨ Features

### 🆘 SOS & Emergency Response
- **One-tap SOS button** with haptic feedback — instantly triggers the emergency flow
- **Verification modal** with multiple confirmation methods: shake pattern, voice codeword, or auto-escalation after timeout
- **SOS Active screen** with live GPS tracking, elapsed timer, and real-time contact notification status
- **SMS alerts** sent automatically to all registered emergency contacts with live location

### 🤖 AI-Powered Multi-Signal Detection
- **Gemini 2.5 Flash** audio analysis — records 5-second clips every 8 seconds when monitoring is ON
- **Multilingual distress keyword detection** — English (`help`, `save me`), Hindi (`bachao`, `chhodo`, `madad`), Spanish, French, German and more
- **Custom secret codeword** — user sets a personal word/phrase; if spoken, SOS triggers immediately
- **Smart confidence thresholds** — triggers only if `confidence > 0.65 AND isDistress`, minimising false positives

### 📡 Motion Detection
- **Accelerometer-based anomaly detection** — rolling 10-sample window at 300ms intervals
- **Adjustable sensitivity** — Low (3.5 m/s²), Medium (2.8 m/s²), High (2.0 m/s²)
- Motion alert banner with haptic feedback; user can dismiss or escalate to SOS

### 📞 Fake Call — *Because no one should feel alone*
- Feeling unsafe, uncomfortable, or just alone with no one to call? **SafeGuard has you.**
- Schedule a fake incoming call — **Now, 1 min, 2 min, or 5 min** — and a realistic voice conversation plays out automatically
- Full ringing screen, caller name, and scripted dialogue make it completely convincing to anyone nearby
- Walk out of that date, that meeting, that street — **without saying a word**
- Because sometimes you don't need help. You just need to *not feel alone.*

### 🎙️ Audio & Video Recording
- Silent audio recording (5s clips) for AI classification — skips gracefully on web
- Video evidence recording with camera integration
- Cloud upload via **Cloudinary** for recorded media

### 📍 Real-Time GPS Tracking
- Continuous location tracking streamed during active emergencies
- Location coordinates sent with every SOS alert and stored per-alert in the database

### 👥 Emergency Contacts Management
- Add / edit / remove contacts with name, phone, and relationship
- Designate a **primary contact** for priority escalation
- Async save with loading states and validation

### 📋 Alert History
- Full log of all SOS alerts — trigger type (`manual`, `auto`, `keyword`, `motion`), timestamp, status, and contacts notified

### 👤 Profile & Medical Notes
- Store personal info and medical notes (blood group, conditions) sent alongside SOS alerts so responders have critical context

### ⚙️ Monitor Settings
- Toggle: keyword spotting, motion detection, vibration, auto-escalate
- **Monitoring schedule** — set active hours (e.g. only monitor 9 PM – 7 AM) for battery & privacy control
- **"Test Codeword Detection"** — type any phrase live to verify detection works via API call

---

## 🏗️ Architecture

```
SafeGuard (Monorepo — pnpm workspaces)
│
├── artifacts/
│   ├── safe-guard/                   # Expo React Native mobile app
│   │   ├── app/(tabs)/               # Guardian · Contacts · Monitor · History · Profile
│   │   ├── app/sos-active.tsx        # Active SOS screen with live GPS
│   │   ├── app/fake-call.tsx         # Fake call screen
│   │   ├── app/permissions.tsx       # Onboarding permissions flow
│   │   ├── app/video-recorder.tsx    # Evidence video recording
│   │   ├── components/
│   │   │   ├── SOSButton.tsx         # Animated hold-to-trigger SOS button
│   │   │   └── VerificationModal.tsx # Multi-mode SOS confirmation
│   │   └── context/SafeGuardContext.tsx  # Global state · voice loop · motion detection
│   │
│   └── api-server/src/routes/        # Express 5 + TypeScript REST API
│       ├── classify.ts               # POST /classify/audio + /classify/text (Gemini AI)
│       ├── alerts.ts                 # SOS alert CRUD + location updates
│       ├── contacts.ts               # Emergency contacts CRUD
│       ├── profile.ts                # User profile upsert
│       └── audio-ws.ts               # WebSocket audio streaming
│
└── lib/
    ├── db/src/schema/safeguard.ts    # Drizzle ORM schema (PostgreSQL)
    ├── integrations-gemini-ai/       # Gemini 2.5 Flash client wrapper
    ├── api-spec/openapi.yaml         # OpenAPI specification
    └── api-client-react/             # Auto-generated typed API client (Orval)
```

---

## 🗄️ Database Schema

```
profiles            → id · name · phone · bloodGroup · medicalNotes
emergency_contacts  → id · name · phone · relationship · isPrimary
sos_alerts          → id · status · triggerType · lat/lng · contactsNotified
                       audioRecorded · videoRecorded · notes · createdAt · resolvedAt
alert_locations     → id · alertId (FK) · lat · lng · accuracy · timestamp
```

---

## 🔬 AI Detection Pipeline

```
Every 8 seconds (when monitoring is ON):
┌──────────────────────────────────────────────────────────┐
│  1. Record 5s audio clip                                 │
│             ↓                                            │
│  2. POST /classify/audio  (base64 audio + codeword)      │
│             ↓                                            │
│  3. Gemini 2.5 Flash analyzes:                           │
│       • Distress keywords (multilingual)                 │
│       • Screaming / panic / struggle sounds              │
│       • Secret codeword match                            │
│             ↓                                            │
│  4. Returns: { isDistress, confidence, triggerSOS,       │
│               codewordDetected, detectedKeywords }        │
│             ↓                                            │
│  5. triggerSOS = true?                                   │
│       YES → Verification Modal → SOS Active Screen       │
│       NO  → Continue monitoring quietly                  │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 📱 Mobile | Expo SDK 54 / React Native + Expo Router |
| 🎨 Animations | react-native-reanimated + expo-linear-gradient |
| 🤖 AI | Google Gemini 2.5 Flash (audio & text classification) |
| 🌐 API | Express 5 + TypeScript, esbuild bundled |
| 🗄️ Database | PostgreSQL + Drizzle ORM |
| 📡 Sensors | expo-sensors (Accelerometer) · expo-av (Audio) · expo-location (GPS) |
| 🎥 Media | expo-camera · Cloudinary (cloud upload) |
| 📱 Native | expo-haptics · expo-speech · expo-file-system |
| 🔧 Tooling | pnpm workspaces · Orval (API codegen) · Zod validation |

---

## 🚀 Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/KhushiHatimuria/SafeGuard---A-women-safety-App.git
cd SafeGuard---A-women-safety-App

# 2. Install all workspace dependencies
pnpm install

# 3. Apply database schema
pnpm --filter @workspace/db run push

# 4. Start the API server  (port 8080)
pnpm --filter @workspace/api-server run dev

# 5. Start the Expo mobile app  (open a new terminal)
pnpm --filter @workspace/safe-guard run dev
```

> ✅ **Or just use the live deployed version:** [https://newapp--1ep23cs077khush.replit.app](https://newapp--1ep23cs077khush.replit.app)

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
Guardian Tab — Home Screen
┌──────────────────────────────────────┐
│  ● Monitoring ON/OFF toggle           │
│  ● Voice listening pulse indicator    │
│  ● Motion alert banner                │
│  ●  [ S O S  B U T T O N ]           │
│  ● Last detection · Alert count       │
└──────────────────────────────────────┘
    │
    ▼  (triggered — manual / voice codeword / motion)
    │
Verification Modal
(Shake pattern · Codeword · Auto-escalate after timeout)
    │
    ▼
SOS Active Screen
  → GPS tracked & streamed continuously
  → SMS sent to all emergency contacts
  → Audio / video evidence recording begins
    │
    ▼
[Deactivate] → Alert marked "resolved"
```

---

## 🏆 Built By

<div align="center">

| | |
|--|--|
| 👩‍💻 **Team** | Team Trivera |
| 🎯 **Theme** | Women Safety & Empowerment |
| 🌐 **Live App** | [https://newapp--1ep23cs077khush.replit.app](https://newapp--1ep23cs077khush.replit.app) |
| 🌍 **Languages** | English · Hindi · Spanish · French · German |
| 💡 **Mission** | Multi-signal, low-false-positive safety for real-world scenarios |

</div>

---

## 🙏 Acknowledgements

- 💙 **Google Gemini 2.5 Flash** — for intelligent, multilingual audio distress classification
- 🧡 **Expo & React Native** — for a smooth cross-platform mobile experience
- 🐘 **Drizzle ORM** — for type-safe PostgreSQL database access
- ☁️ **Cloudinary** — for secure media cloud storage
- 💜 Every woman who inspired this project — **you deserve to feel safe, always**

---

<div align="center">

### 💗 Built with code, care, and a purpose — by Team Trivera

<img src="https://img.shields.io/badge/If_this_helped_you-⭐_Star_the_repo-C8394A?style=for-the-badge" />

**SafeGuard** · *Because safety is not a privilege — it's a right.*

</div>
