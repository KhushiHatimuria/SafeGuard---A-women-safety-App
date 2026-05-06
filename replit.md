# SafeGuard — Women's Safety SOS Mobile App

A full-featured women's safety mobile app built with Expo React Native. Features a dark UI, prominent SOS button, Gemini AI voice/codeword detection, motion anomaly detection, emergency contacts, alert history, and a PostgreSQL backend.

## Run & Operate

| Command | Purpose |
|---------|---------|
| `pnpm --filter @workspace/api-server run dev` | API server (port 8080) |
| `pnpm --filter @workspace/safe-guard run dev` | Expo mobile app |
| `pnpm --filter @workspace/db run push` | Apply DB schema to Postgres |
| `pnpm --filter @workspace/db run push-force` | Force push schema (destructive) |

Required env vars: `DATABASE_URL` (auto-provided by Replit), `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`, `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`

## Stack

- **Mobile**: Expo SDK 54 / React Native + Expo Router (file-based routing)
- **API**: Express 5 + TypeScript, esbuild bundle
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: Gemini 2.5 Flash via `@workspace/integrations-gemini-ai` (audio + text distress/codeword classification)
- **Sensors**: expo-sensors (Accelerometer), expo-av (Audio recording), expo-file-system
- **Monorepo**: pnpm workspaces

## Where things live

```
artifacts/
  api-server/src/routes/    # classify.ts, profile.ts, contacts.ts, alerts.ts
  safe-guard/
    app/(tabs)/             # index.tsx, settings.tsx, contacts.tsx, history.tsx, profile.tsx
    app/sos-active.tsx      # Active SOS screen
    context/SafeGuardContext.tsx  # All state + voice loop + motion detection
    lib/api.ts              # Typed API client
lib/db/src/schema/safeguard.ts   # DB schema (profiles, emergency_contacts, sos_alerts, alert_locations)
lib/integrations-gemini-ai/      # Gemini AI integration template
```

## Architecture decisions

- **Voice monitoring loop**: Records 5s audio clips every 8s when monitoring is ON; sends base64 to `/classify/audio` (Gemini 2.5 Flash). Codeword + distress keyword detection runs in the same request.
- **Codeword stored in AsyncStorage** via `MonitoringSchedule.codeword`; passed to backend with every classify request.
- **Dev proxy** (`artifacts/safe-guard/server/proxy.mjs`): Runs on `$PORT`, routes `/api-server/api/*` → `localhost:8080` and everything else → Expo bundler on `$PORT+1`. This makes API calls same-origin on web, eliminating CORS issues in the browser preview.
- **Motion detection**: Accelerometer data in 300ms intervals, rolling 10-sample window, threshold varies by sensitivity setting (low=3.5, medium=2.8, high=2.0 m/s²).
- **Alert lifecycle**: `sos_alerts` row is created on confirmSOS, updated to "resolved" on deactivateSOS. Status shown in history tab.

## Product

- **Guardian tab**: SOS button, monitoring toggle, motion alert banner, codeword status, stats
- **Contacts tab**: Add/edit/remove emergency contacts with primary designation; async save with loading states
- **Monitor tab**: Wired toggles for keyword spotting, motion detection, vibrate, auto-escalate; codeword text input; sensitivity selector; permission grants; **"Test Codeword Detection"** card lets user type a phrase to verify codeword/distress detection via API (works on web and native)
- **History tab**: List of all SOS alerts from DB with timestamps and trigger type
- **Profile tab**: Personal info + medical notes stored in DB
- **SOS Active screen**: GPS tracking, live status, deactivate option

## Gotchas

- `lib/db/src/schema/` contains `conversations.ts` and `messages.ts` from Gemini template — these are NOT exported from `index.ts` and create no tables
- expo-av@15.1.7 shows SDK deprecation warning but works fine
- Audio recording only works on native (iOS/Android); voice monitoring skips gracefully on web (`Platform.OS !== "web"` guards)
- Always run `pnpm --filter @workspace/db run push` after schema changes before testing API routes

## User preferences

- Dark UI (bg: #0D0D0D, primary: #C8394A crimson red)
- No emojis in UI except where contextually appropriate (codeword hint)
- Smooth animations via react-native-reanimated
