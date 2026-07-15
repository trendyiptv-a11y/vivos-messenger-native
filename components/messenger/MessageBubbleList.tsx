import { useMemo } from "react"
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"

type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
  attachment_path?: string | null
  attachment_expires_at?: string | null
  attachment_deleted_at?: string | null
}

type Props = {
  loading: boolean
  messages: MessageRow[]
  userId: string | null
}

function formatDay(dateString: string) {
  return new Date(dateString).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSize(value?: number | null) {
  if (!value || value < 1) return null
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function iconForAttachment(type?: string | null) {
  if (type === "image") return "image-outline"
  if (type === "video") return "videocam-outline"
  return "document-attach-outline"
}

function isAttachmentExpired(msg: MessageRow) {
  if (msg.attachment_deleted_at) return true
  if (!msg.attachment_expires_at) return false
  return new Date(msg.attachment_expires_at).getTime() <= Date.now()
}

function AttachmentPreview({ msg, mine }: { msg: MessageRow; mine: boolean }) {
  const expired = isAttachmentExpired(msg)
  const url = expired ? null : msg.attachment_url || null

  if (expired) {
    return (
      <View style={[styles.attachmentCard, mine ? styles.attachmentCardMine : styles.attachmentCardOther]}>
        <Ionicons name="time-outline" size={24} color={mine ? "white" : theme.colors.text} />
        <View style={styles.attachmentTextWrap}>
          <Text numberOfLines={1} style={[styles.attachmentName, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
            Atașament expirat
          </Text>
          <Text style={[styles.attachmentMeta, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
            Fișierul a fost șters după 24 ore
          </Text>
        </View>
      </View>
    )
  }

  if (!url) return null

  if (msg.attachment_type === "image") {
    return (
      <Pressable onPress={() => Linking.openURL(url).catch(() => {})}>
        <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
      </Pressable>
    )
  }

  const size = formatSize(msg.attachment_size)
  return (
    <Pressable onPress={() => Linking.openURL(url).catch(() => {})} style={[styles.attachmentCard, mine ? styles.attachmentCardMine : styles.attachmentCardOther]}>
      <Ionicons name={iconForAttachment(msg.attachment_type) as any} size={24} color={mine ? "white" : theme.colors.text} />
      <View style={styles.attachmentTextWrap}>
        <Text numberOfLines={1} style={[styles.attachmentName, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
          {msg.attachment_name || "Atașament"}
        </Text>
        <Text style={[styles.attachmentMeta, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
          {msg.attachment_type === "video" ? "Video" : "Fișier"}{size ? ` · ${size}` : ""}
        </Text>
      </View>
    </Pressable>
  )
}

function MessageItem({ msg, previousChronologicalMessage, userId }: { msg: MessageRow; previousChronologicalMessage: MessageRow | null; userId: string | null }) {
  const mine = msg.sender_id === userId
  const showDate = !previousChronologicalMessage || formatDay(previousChronologicalMessage.created_at) !== formatDay(msg.created_at)

  return (
    <View>
      {showDate ? (
        <View style={styles.dayRow}>
          <View style={styles.dayLine} />
          <Text style={styles.dayText}>{formatDay(msg.created_at)}</Text>
          <View style={styles.dayLine} />
        </View>
      ) : null}
      <View style={[styles.bubbleRow, mine ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <AttachmentPreview msg={msg} mine={mine} />
          {msg.body ? <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{msg.body}</Text> : null}
          <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>{formatTime(msg.created_at)}</Text>
        </View>
      </View>
    </View>
  )
}

export function MessageBubbleList({ loading, messages, userId }: Props) {
  const newestFirst = useMemo(() => [...messages].reverse(), [messages])

  if (loading) {
    return <Text style={styles.helper}>Se încarcă conversația...</Text>
  }

  if (messages.length === 0) {
    return <Text style={styles.helper}>Nu există încă mesaje în această conversație.</Text>
  }

  return (
    <FlatList
      inverted
      data={newestFirst}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.messagesWrap}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      renderItem={({ item }) => {
        const chronologicalIndex = messages.findIndex((msg) => msg.id === item.id)
        const previousChronologicalMessage = chronologicalIndex > 0 ? messages[chronologicalIndex - 1] : null
        return <MessageItem msg={item} previousChronologicalMessage={previousChronologicalMessage} userId={userId} />
      }}
    />
  )
}

const styles = StyleSheet.create({
  messagesWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 8,
  },
  helper: {
    textAlign: "center",
    color: theme.colors.textSoft,
    fontSize: 15,
    paddingVertical: 24,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dayText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleLeft: {
    justifyContent: "flex-start",
  },
  bubbleRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
  },
  bubbleMine: {
    backgroundColor: "rgba(201,106,161,0.88)",
  },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: "white",
  },
  bubbleTextOther: {
    color: theme.colors.text,
  },
  bubbleTime: {
    alignSelf: "flex-end",
    marginTop: 2,
    fontSize: 11,
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.78)",
  },
  bubbleTimeOther: {
    color: theme.colors.textDim,
  },
  attachmentImage: {
    width: 210,
    height: 150,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  attachmentCard: {
    width: 230,
    minHeight: 58,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentCardMine: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  attachmentCardOther: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "800",
  },
  attachmentMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
})
