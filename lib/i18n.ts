import * as Localization from "expo-localization"

type LocaleKey = "ro" | "da" | "en"

type TranslationKey =
  | "messages"
  | "members"
  | "calls"
  | "profile"
  | "searchConversations"
  | "searchMembers"
  | "searchCalls"
  | "loadingConversations"
  | "loadingMembers"
  | "noConversations"
  | "noMembers"
  | "loadingCalls"
  | "noCalls"
  | "connected"
  | "disconnected"
  | "memberFallback"
  | "conversationOpenError"
  | "openingConversation"
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
    members: "Membri",
    calls: "Apeluri",
    profile: "Profil",
    searchConversations: "Caută conversații...",
    searchMembers: "Caută membri...",
    searchCalls: "Caută apeluri...",
    loadingConversations: "Se încarcă conversațiile...",
    loadingMembers: "Se încarcă membrii...",
    noConversations: "Nicio conversație încă.",
    noMembers: "Nu există membri pentru căutarea curentă.",
    loadingCalls: "Se încarcă istoricul apelurilor...",
    noCalls: "Nu există apeluri pentru filtrul selectat.",
    connected: "Conectat",
    disconnected: "Neconectat",
    memberFallback: "Membru",
    conversationOpenError: "Conversația nu a putut fi deschisă.",
    openingConversation: "Se deschide conversația...",
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
    members: "Medlemmer",
    calls: "Opkald",
    profile: "Profil",
    searchConversations: "Søg i samtaler...",
    searchMembers: "Søg medlemmer...",
    searchCalls: "Søg i opkald...",
    loadingConversations: "Indlæser samtaler...",
    loadingMembers: "Indlæser medlemmer...",
    noConversations: "Ingen samtaler endnu.",
    noMembers: "Ingen medlemmer matcher søgningen.",
    loadingCalls: "Indlæser opkaldshistorik...",
    noCalls: "Ingen opkald for det valgte filter.",
    connected: "Forbundet",
    disconnected: "Ikke forbundet",
    memberFallback: "Medlem",
    conversationOpenError: "Samtalen kunne ikke åbnes.",
    openingConversation: "Åbner samtalen...",
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
    members: "Members",
    calls: "Calls",
    profile: "Profile",
    searchConversations: "Search conversations...",
    searchMembers: "Search members...",
    searchCalls: "Search calls...",
    loadingConversations: "Loading conversations...",
    loadingMembers: "Loading members...",
    noConversations: "No conversations yet.",
    noMembers: "No members match the current search.",
    loadingCalls: "Loading call history...",
    noCalls: "No calls for the selected filter.",
    connected: "Connected",
    disconnected: "Disconnected",
    memberFallback: "Member",
    conversationOpenError: "The conversation could not be opened.",
    openingConversation: "Opening conversation...",
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
