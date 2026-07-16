# Help The Hive

Beta meal-planning + grocery-list app for SNAP/military/teacher families. Built with React + Vite, Lovable Cloud (Supabase) backend, and Capacitor for iOS/Android.

## Stack
- React 18 + Vite + TypeScript + Tailwind
- Lovable Cloud (Supabase: Postgres, Auth, Edge Functions, Storage)
- Gemini 2.5 Flash Lite for meal-plan generation
- Capacitor 8 (iOS + Android)
- Instacart Connect for grocery checkout (no cross-retailer price comparison)

## Web development
```bash
bun install
bun run dev
```

## Native simulator startup (iOS / Android)

iOS requires macOS with Xcode and an installed iOS simulator. Android requires
Android Studio with an AVD/emulator.

From a clean checkout:

```bash
npm install
npm run build
```

`npx cap run` runs Capacitor sync before building and deploying the native app.

### iOS simulator

```bash
npx cap run ios --list
npx cap run ios
```

To choose a specific simulator, use a target name from `--list`:

```bash
npx cap run ios --target-name "iPhone 16"
```

### Android emulator

This checkout may not include an `android/` directory yet. If it is missing,
create it once:

```bash
npx cap add android
```

Then run the Android emulator:

```bash
npx cap run android --list
npx cap run android
```

To choose a specific emulator, use a target name from `--list`:

```bash
npx cap run android --target-name "Pixel_8_API_35"
```

### Live reload in a simulator

In one terminal:

```bash
npm run dev -- --host 0.0.0.0
```

In another terminal:

```bash
npx cap run ios -l --host 127.0.0.1 --port 8080
npx cap run android -l --host 127.0.0.1 --port 8080 --forwardPorts 8080:8080
```

### Manual iOS checks (Xcode)
1. Verify pods installed: `Pods/` directory present after `cap sync`.
2. Confirm `Info.plist` contains `UIBackgroundModes → remote-notification`
   (required for push delivery; not auto-added by `cap sync`).
3. Verify usage strings: `NSCameraUsageDescription`,
   `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`.
4. Smoke-test on a physical iPhone: login, generate plan, open grocery list,
   tap **Send to Instacart** (returns to `/dashboard/grocery?from=instacart`).

### Manual Android checks
1. Confirm `android/app/src/main/AndroidManifest.xml` has push +
   notification permissions after `cap sync`.
2. Smoke-test the same flows on a physical Android device.

## Edge functions
Live in `supabase/functions/*`. Deployed automatically by Lovable Cloud.

### Meal-plan regeneration limit

Meal-plan generation is limited by default to protect OpenAI/Kroger spend.
For local or production testing, temporarily disable only the meal-plan
generation limit with this server-side Edge Function env var:

```bash
MEAL_PLAN_REGENERATION_LIMIT_ENABLED=false
```

Unset it or set it back to `true` to restore the limit.

## Compliance notes
- Instacart Connect: single home-store view only — no cross-retailer price
  comparison anywhere in the UI.
- Tools are for planning/information only; a global disclaimer is shown.
- Primary contact: marcos@helpthehive.com.
