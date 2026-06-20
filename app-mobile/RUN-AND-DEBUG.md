# Running and Debugging Laszlo Mobile

This guide covers running the Expo React Native app on a physical iPhone, the
known Expo CLI install bug, and how to debug the app once it is on the device.

For project intent and acceptance criteria see `README.md`.

## Prerequisites

- Xcode with command line tools.
- A physical iPhone (Expo Go is not enough; ViroReact requires a dev build).
- iPhone setup:
  - unlocked,
  - paired and trusted with the Mac,
  - Developer Mode enabled (Settings -> Privacy & Security -> Developer Mode),
  - signed in with the same Apple ID used by the Xcode signing team.
- Node via nvm at the version pinned by the repo.
- Pods installed (`cd app-mobile/ios && pod install`).

```bash
cd app-mobile
npm install
cp .env.example .env
cd ios && pod install && cd ..
```

## Running on a Physical iPhone

The Expo CLI USB installer is currently broken on this setup. It fails with:

```text
TypeError: Cannot convert object to primitive value
    at LockdowndClient.startSession
```

The native iOS build itself is fine. Install through Xcode instead.

1. Open the workspace:

   ```bash
   open app-mobile/ios/Laszlo.xcworkspace
   ```

2. In Xcode, select the physical iPhone in the run destination dropdown
   (top bar, next to the scheme).
3. Press `Cmd+R` to build, install, and launch.
4. When the app is installed and running on the phone, start Metro from the
   repo:

   ```bash
   cd app-mobile
   export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
   npm run start -- --host lan
   ```

5. In the dev build on the phone, connect to the Metro instance shown by the
   CLI.

Do not rely on `npm run ios -- --device`. It triggers the broken installer
path.

## Running on Simulator

The simulator skips Developer Mode, signing, and the Lockdownd installer
issue. Useful for non-AR work.

```bash
cd app-mobile
npm run ios
```

ViroReact will not function in the simulator. Use the simulator only for
manual hotspot and UI work.

## Manual Fallback Test Path

This is the smoke test for the mobile slice. The app starts in manual mode
by design to avoid Viro native crashes when the dev build is not fully
correct.

1. Do not tap Camera.
2. Pick `The Milkmaid` (`SK-A-2344`) or `The Night Watch` (`SK-C-5`).
3. On the detail screen, wait 3 seconds. The fallback text should appear.
4. Tap the hotspot dots on the image overlay.
5. Switch language between `fr`, `en`, `nl`.
6. Type a question and submit (`/generate mode=ask` delta path).
7. Tap Play (`/speak` returns a fixed audio URL).

Only after this path works should you test Camera/AR.

## Debugging

### Native (Xcode)

- Set breakpoints in Swift / Obj-C in the workspace.
- View native console output in the Xcode debug area.
- For AR or Viro crashes, look at Xcode crash logs first; they fire before
  Metro sees anything.

### JavaScript (Metro and React Native DevTools)

- Metro logs appear in the terminal where `npm run start` is running.
- Press `j` in the Metro terminal to open the JS debugger in Chrome.
- Shake the device or run `xcrun simctl io booted shake` to bring up the
  React Native dev menu in the dev build.
- Reload the JS bundle with `r` in Metro or the dev menu.

### Type and Lint Checks

```bash
cd app-mobile
npm run typecheck
```

This must pass before pushing. It does not catch native or runtime errors.

## Known Issues

### Expo CLI Install Crash

Symptom: `npm run ios -- --device` builds, then fails with
`LockdowndClient.startSession` `TypeError`.
Workaround: install with Xcode (see above). The native build is fine.

### Xcode Cannot See the iPhone

Symptom: device missing from Xcode destination list, or
`devicectl list devices` times out with CoreDeviceService errors.
Fixes, in order:

1. Unlock the iPhone, accept any trust prompt.
2. Confirm Developer Mode is on.
3. Replug the cable, try a different USB port.
4. Bring Xcode to the foreground.
5. Restart the Mac if CoreDeviceService is wedged.

### `SafeAreaView` Deprecation Warning

Harmless at the current checkpoint. Do not chase it.

### Viro Native Module Crash on Launch

The app starts manual-first to avoid this. AR only works when the dev build
is fully reinstalled with the latest native code. If AR crashes, rebuild
through Xcode rather than relying on a stale install.

## Reset Recipes

When the dev build gets into a bad state:

```bash
cd app-mobile
rm -rf ios/build
cd ios && pod install && cd ..
```

Then rebuild from Xcode. If Metro is also misbehaving:

```bash
cd app-mobile
npm run start -- --reset-cache
```
