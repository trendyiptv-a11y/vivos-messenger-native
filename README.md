# VIVOS Messenger Native

Native mobile Messenger app for VIVOS, built with Expo, React Native, TypeScript, and Supabase.

## Current scope
- Authentication
- Inbox
- Conversations
- Call history
- Profile
- Push notifications later
- Audio and video calls in later phase

## Stack
- Expo
- React Native
- TypeScript
- Expo Router
- Supabase

## Getting started
1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create a `.env` file.
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

## Next milestones
- Real unread badges in native inbox
- Message notifications
- Native audio call flow
- Native video call flow
- Media upload support
- Avatar photo and video support
