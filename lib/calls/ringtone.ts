import { Platform, Vibration } from "react-native"
import { Audio } from "expo-av"

let ringtoneSound: Audio.Sound | null = null
let vibrationActive = false

const VIBRATION_PATTERN = [0, 900, 400, 900, 400, 900]

export async function startIncomingCallFeedback() {
  try {
    vibrationActive = true
    Vibration.vibrate(VIBRATION_PATTERN, true)

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    })

    if (!ringtoneSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/vivos-ring.mp3"),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1,
        }
      )
      ringtoneSound = sound
      return
    }

    await ringtoneSound.setIsLoopingAsync(true)
    await ringtoneSound.setVolumeAsync(1)
    await ringtoneSound.playAsync()
  } catch (error) {
    console.warn("Incoming call feedback failed", error)
    if (Platform.OS === "android" && !vibrationActive) {
      Vibration.vibrate(VIBRATION_PATTERN, true)
    }
  }
}

export async function stopIncomingCallFeedback() {
  vibrationActive = false
  Vibration.cancel()

  try {
    await ringtoneSound?.stopAsync()
    await ringtoneSound?.unloadAsync()
  } catch (error) {
    console.warn("Incoming call feedback stop failed", error)
  } finally {
    ringtoneSound = null
  }
}
