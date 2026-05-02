# Native WebRTC integration roadmap

This document marks the next implementation step after the current signaling and diagnostics scaffold.

## Current state
- Native Messenger screens are in place.
- Call sessions are created in Supabase.
- Call events are logged.
- Broadcast signaling exists for invite, accept, reject, end, offer, answer, and ICE.
- TURN credentials loader exists.
- Media lifecycle scaffold exists.
- Native WebRTC adapter is still placeholder-only.

## Next implementation target
Replace the placeholder adapter in `lib/calls/webrtcNativeAdapter.ts` with a real native WebRTC stack.

## Planned package layer
Suggested native stack for the next phase:
- react-native-webrtc
- expo-dev-client

## Implementation order
1. Install the real native WebRTC dependency.
2. Move the app from Expo Go to a dev build.
3. Replace `createNativeOffer()` and `createNativeAnswer()` with real SDP generation.
4. Replace placeholder ICE logic with real peer connection candidates.
5. Attach microphone and camera streams to the peer connection.
6. Expose local and remote stream state to the call overlay.
7. Add audio/video preview components in the overlay.
8. Stabilize reconnect and hangup cleanup.

## File targets for real implementation
- `lib/calls/webrtcNativeAdapter.ts`
- `lib/calls/media.ts`
- `hooks/useCallMedia.ts`
- `app/chat/[id].tsx`

## Important constraint
The real native WebRTC step should be done against a dev build, not only Expo Go.

## Immediate code goal
When the adapter becomes real, the overlay should show:
- local preview ready
- remote preview ready
- connection state
- mute / speaker / camera controls
