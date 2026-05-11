import { Audio } from "expo-av"

let ringbackSound: Audio.Sound | null = null
let ringbackStarting = false

export async function startVivosRingbackTone() {
  if (ringbackSound || ringbackStarting) return

  ringbackStarting = true

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    })

    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/outgoing-call.wav"),
      {
        shouldPlay: true,
        isLooping: true,
        volume: 0.45,
      }
    )

    ringbackSound = sound
  } catch (error) {
    console.warn("VIVOS ringback start failed", error)
  } finally {
    ringbackStarting = false
  }
}

export async function stopVivosRingbackTone() {
  const sound = ringbackSound
  ringbackSound = null
  ringbackStarting = false

  if (!sound) return

  try {
    await sound.stopAsync()
  } catch {}

  try {
    await sound.unloadAsync()
  } catch {}
}
