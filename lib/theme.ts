export const theme = {
  colors: {
    bgTop: "#173F72",
    bgBottom: "#122E54",
    card: "rgba(255,255,255,0.08)",
    cardStrong: "rgba(255,255,255,0.12)",
    text: "#F8FAFC",
    textSoft: "rgba(248,250,252,0.72)",
    textDim: "rgba(248,250,252,0.48)",
    border: "rgba(255,255,255,0.10)",
    accentStart: "#C96AA1",
    accentMid: "#9A71C1",
    accentEnd: "#63A6E6",
    success: "#34D399",
    danger: "#F87171",
    inputBg: "rgba(255,255,255,0.06)",
    whiteCard: "#F8FAFC",
    darkText: "#0F172A",
    darkSoft: "#475569",
  },
}

export function gradientTextSeed(seed: string) {
  const normalized = (seed || "VI").trim().toUpperCase()
  return normalized.slice(0, 2) || "VI"
}
