import { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandGradientText } from "@/components/ui/BrandGradientText"
import { theme } from "@/lib/theme"

type Props = {
  eyebrow?: string
  title: string
  left?: ReactNode
  right?: ReactNode
}

function HeaderEyebrow({ eyebrow }: { eyebrow?: string }) {
  if (!eyebrow) return null

  const normalized = eyebrow.trim()
  const upper = normalized.toUpperCase()

  if (upper === "VIVOS" || upper === "VIVOS MESSENGER") {
    const suffix = upper === "VIVOS MESSENGER" ? "Messenger" : ""
    return (
      <View style={styles.brandRow}>
        <BrandGradientText text="VIVOS" style={styles.brandText} />
        {suffix ? <Text style={styles.brandSuffix}>{suffix}</Text> : null}
      </View>
    )
  }

  if (upper.startsWith("VIVOS ")) {
    const suffix = normalized.slice(6)
    return (
      <View style={styles.brandRow}>
        <BrandGradientText text="VIVOS" style={styles.brandText} />
        <Text style={styles.brandSuffix}>{suffix}</Text>
      </View>
    )
  }

  return <Text style={styles.eyebrow}>{eyebrow}</Text>
}

export function ScreenHeader({ eyebrow, title, left, right }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>
          <HeaderEyebrow eyebrow={eyebrow} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
    </SafeAreaView>
  )
}

export function HeaderIconButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  side: {
    minWidth: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  right: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 2.8,
    fontWeight: "900",
  },
  brandSuffix: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  eyebrow: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.25,
    marginTop: 3,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
})
