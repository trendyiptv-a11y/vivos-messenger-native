# Dev build setup for VIVOS Messenger Native

This guide prepares the project for the real native WebRTC step.

## Why this step exists
The current repository already has:
- native call session flow
- signaling scaffold
- TURN loader
- WebRTC diagnostics scaffold

The next real audio/video phase should run in a development build.

## Current repo changes already made
- `expo-dev-client` dependency added in `package.json`
- `expo-dev-client` plugin added in `app.json`
- `eas.json` already contains `development`, `preview`, and `production`

## Local setup
1. Install dependencies.
2. Copy `.env.example` to `.env`.
3. Fill in Supabase public values.
4. Start the project locally.

## Development build path
Recommended next commands:
```bash
npm install
npx expo install expo-dev-client
npx expo prebuild
npx eas build --profile development --platform android
```

## After the dev build exists
Replace placeholder logic in:
- `lib/calls/webrtcNativeAdapter.ts`
- `lib/calls/media.ts`
- `hooks/useCallMedia.ts`
- `app/chat/[id].tsx`

## Real native dependency target
The next dependency to integrate is the real React Native WebRTC layer.

## Success condition for this phase
When complete, the call overlay should move from diagnostics-only to:
- local stream preview
- remote stream preview
- real SDP exchange
- real ICE flow
- real audio/video transport
