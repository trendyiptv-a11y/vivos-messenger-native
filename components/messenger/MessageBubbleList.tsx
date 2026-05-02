import { ScrollView, StyleSheet, Text, View } from "react-native"
import { theme } from "@/lib/theme"

type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

type Props = {
  scrollRef: React.RefObject<ScrollView | null>
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

export function MessageBubbleList({ scrollRef, loading, messages, userId }: Props) {
  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesWrap}>
      {loading ? (
        <Text style={styles.helper}>Se încarcă conversația...</Text>
      ) : messages.length === 0 ? (
        <Text style={styles.helper}>Nu există încă mesaje în această conversație.</Text>
      ) : (
        messages.map((msg, index) => {
          const mine = msg.sender_id === userId
          const prev = messages[index - 1]
          const showDate = !prev || formatDay(prev.created_at) !== formatDay(msg.created_at)
          return (
            <View key={msg.id}>
              {showDate ? (
                <View style={styles.dayRow}>
                  <View style={styles.dayLine} />
                  <Text style={styles.dayText}>{formatDay(msg.created_at)}</Text>
                  <View style={styles.dayLine} />
                </View>
              ) : null}
              <View style={[styles.bubbleRow, mine ? styles.bubbleRight : styles.bubbleLeft]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{msg.body}</Text>
                  <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>{formatTime(msg.created_at)}</Text>
                </View>
              </View>
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  messagesWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    maxWidth: "78%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    marginTop: 6,
    fontSize: 11,
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.78)",
  },
  bubbleTimeOther: {
    color: theme.colors.textDim,
  },
})
