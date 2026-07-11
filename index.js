import "event-target-shim"
import { registerVivosCallV2NotifeeBackgroundHandler } from "./lib/calls-v2/notifeeCallV2"
import { registerVivosCallV2FcmBackgroundHandler } from "./lib/calls-v2/fcmCallHandler"
import { registerVivosCallForegroundService } from "./lib/calls-v2/callForegroundService"

registerVivosCallForegroundService()
registerVivosCallV2NotifeeBackgroundHandler()
registerVivosCallV2FcmBackgroundHandler()

import "expo-router/entry"
