import "event-target-shim"
import {
  registerVivosCallV2ForegroundService,
  registerVivosCallV2NotifeeBackgroundHandler,
} from "./lib/calls-v2/notifeeCallV2"
import { registerVivosCallV2FcmBackgroundHandler } from "./lib/calls-v2/fcmCallHandler"

registerVivosCallV2ForegroundService()
registerVivosCallV2NotifeeBackgroundHandler()
registerVivosCallV2FcmBackgroundHandler()

import "expo-router/entry"
