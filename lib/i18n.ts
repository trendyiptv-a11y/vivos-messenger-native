import * as Localization from "expo-localization"

type LocaleKey = "ro" | "da" | "en"

type TranslationKey =
  | "messages"
  | "calls"
  | "profile"
  | "searchConversations"
  | "searchCalls"
  | "loadingConversations"
  | "noConversations"
  | "loadingCalls"
  | "noCalls"
  | "all"
  | "audio"
  | "video"
  | "missed"
  | "incomingCallTitle"
  | "incomingAudioCall"
  | "incomingVideoCall"
  | "messageNotificationTitle"
  | "callNotificationTitle"
  | "callNotificationBody"
  | "acceptCall"
  | "rejectCall"

const translations: Record<LocaleKey, Record<TranslationKey, string>> = {
  ro: {
    messages: "Mesaje",
    calls: "Apeluri",
    profile: "Profil",
    searchConversations: "Caută conversații...",
    searchCalls: "Caută apeluri...",
    loadingConversations: "Se încarcă conversațiile...",
    noConversations: "Nicio conversație încă.",
    loadingCalls: "Se încarcă istoricul apelurilor...",
    noCalls: "Nu există apeluri pentru filtrul selectat.",
    all: "Toate",
    audio: "Audio",
    video: "Video",
    missed: "Ratate",
    incomingCallTitle: "Apel VIVOS",
    incomingAudioCall: "Apel audio primit",
    incomingVideoCall: "Apel video primit",
    messageNotificationTitle: "Mesaj VIVOS",
    callNotificationTitle: "Apel VIVOS",
    callNotificationBody: "te sună în VIVOS Messenger",
    acceptCall: "Acceptă",
    rejectCall: "Respinge",
  },
  da: {
    messages: "Beskeder",
    calls: "Opkald",
    profile: "Profil",
    searchConversations: "Søg i samtaler...",
    searchCalls: "Søg i opkald...",
    loadingConversations: "Indlæser samtaler...",
    noConversations: "Ingen samtaler endnu.",
    loadingCalls: "Indlæser opkaldshistorik...",
    noCalls: "Ingen opkald for det valgte filter.",
    all: "Alle",
    audio: "Lyd",
    video: "Video",
    missed: "Ubesvarede",
    incomingCallTitle: "VIVOS-opkald",
    incomingAudioCall: "Indgående lydopkald",
    incomingVideoCall: "Indgående videoopkald",
    messageNotificationTitle: "VIVOS-besked",
    callNotificationTitle: "VIVOS-opkald",
    callNotificationBody: "ringer til dig i VIVOS Messenger",
    acceptCall: "Accepter",
    rejectCall: "Afvis",
  },
  en: {
    messages: "Messages",
    calls: "Calls",
    profile: "Profile",
    searchConversations: "Search conversations...",
    searchCalls: "Search calls...",
    loadingConversations: "Loading conversations...",
    noConversations: "No conversations yet.",
    loadingCalls: "Loading call history...",
    noCalls: "No calls for the selected filter.",
    all: "All",
    audio: "Audio",
    video: "Video",
    missed: "Missed",
    incomingCallTitle: "VIVOS Call",
    incomingAudioCall: "Incoming audio call",
    incomingVideoCall: "Incoming video call",
    messageNotificationTitle: "VIVOS message",
    callNotificationTitle: "VIVOS call",
    callNotificationBody: "is calling you in VIVOS Messenger",
    acceptCall: "Accept",
    rejectCall: "Decline",
  },
}

const LOCALE: LocaleKey = (() => {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase()
  if (code === "da") return "da"
  if (code === "ro") return "ro"
  return "en"
})()

export function getSystemLanguage(): LocaleKey {
  return LOCALE
}

export function t(key: TranslationKey) {
  return translations[LOCALE][key] ?? translations.en[key] ?? key
}
