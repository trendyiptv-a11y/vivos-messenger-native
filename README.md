# VIVOS Messenger Native

Native mobile Messenger app for VIVOS, built with Expo, React Native, TypeScript, and Supabase.

## Current scope
- Authentication
- Inbox
- Conversations
- Call history
- Profile
- Push notifications scaffold
- Call session flow scaffold
- Native WebRTC diagnostics scaffold

## Stack
- Expo
- React Native
- TypeScript
- Expo Router
- Supabase

## Getting started
1. Clone the repository.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env`.
4. Add the Expo public environment variables below.
5. Start the project with `npm run start`.

## Environment variables
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Current screens
- `app/login.tsx`
- `app/signup.tsx`
- `app/inbox.tsx`
- `app/chat/[id].tsx`
- `app/calls.tsx`
- `app/profile.tsx`

## Build profiles
`eas.json` already includes:
- development
- preview
- production

## Current call architecture
- Supabase call sessions
- Supabase call events
- broadcast signaling for invite / accept / reject / end
- broadcast signaling scaffold for offer / answer / ICE
- TURN credential loader
- media lifecycle scaffold
- native WebRTC adapter scaffold
- diagnostics shown in the call overlay

## Native WebRTC next step
The detailed roadmap for the real native WebRTC step is in:
- `docs/native-webrtc-integration.md`

## Next milestones
- Real native WebRTC dependency
- Real local and remote streams
- Native audio and video preview in overlay
- Message notifications
- Media upload support
- Avatar photo and video support
