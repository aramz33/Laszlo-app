# Laszlo Mobile

Expo React Native frontend for the Laszlo museum guide.

## Stack

- Expo React Native in TypeScript.
- ViroReact as the first `ArtworkIdentifier` adapter.
- ViroReact uses ARKit on iOS and ARCore on Android.
- Supabase is read directly from the app with the publishable key.

Expo Go is not enough for this app because ViroReact includes native AR code.
Use an Expo development build.

The scaffold is pinned to Expo SDK 55 / React Native 0.83 because the current
ViroReact package peers with Expo `>=54 <56` and React Native `>=0.81 <0.84`.

## Setup

```bash
cd app-mobile
npm install
cp .env.example .env
npm run ios
npm run android
```

If dependency versions drift, prefer Expo's installer to realign native package
versions:

```bash
npx expo install @reactvision/react-viro expo-dev-client @supabase/supabase-js
```

## First Acceptance Check

Before building the full visitor flow, prove this path on physical devices:

- one Rijks reference image is detected on iPhone;
- the same reference image is detected on Android;
- the blue marker is tappable;
- tapping opens the same detail screen as manual selection;
- manual selection still works if AR fails or permissions are denied.
