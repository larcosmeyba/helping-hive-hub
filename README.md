# Help The Hive

Beta meal-planning + grocery-list app for SNAP/military/teacher families. Built with React + Vite, Lovable Cloud (Supabase) backend, and Capacitor for iOS/Android.

## Stack
- React 18 + Vite + TypeScript + Tailwind
- Lovable Cloud (Supabase: Postgres, Auth, Edge Functions, Storage)
- Gemini 2.5 Flash Lite for meal-plan generation
- Capacitor 5 (iOS + Android)
- Instacart Connect for grocery checkout (no cross-retailer price comparison)

## Web development
```bash
bun install
bun run dev
```

## Native (iOS / Android) build steps

The `ios/` and `android/` folders are committed but Capacitor regenerates most
plugin wiring on `npx cap sync`. After pulling the repo on a Mac:

```bash
bun install
bun run build
npx cap sync ios       # or: npx cap sync android
npx cap run ios        # opens Xcode / simulator
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

## Compliance notes
- Instacart Connect: single home-store view only — no cross-retailer price
  comparison anywhere in the UI.
- Tools are for planning/information only; a global disclaimer is shown.
- Primary contact: marcos@helpthehive.com.
