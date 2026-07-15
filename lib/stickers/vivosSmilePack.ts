import { ImageSourcePropType } from "react-native"

export const VIVOS_STICKER_PREFIX = "vivos-sticker:vivos-smile-pack-1:"

export type VivosStickerId =
  | "angry"
  | "dislike"
  | "happy"
  | "heart"
  | "hug"
  | "laugh"
  | "like"
  | "love"
  | "pray"
  | "sad"
  | "sleepy"
  | "smile"
  | "thinking"
  | "wow"

export type VivosSticker = {
  id: VivosStickerId
  label: string
  source: ImageSourcePropType
}

export const VIVOS_SMILE_STICKERS: VivosSticker[] = [
  { id: "happy", label: "Fericit", source: require("@/assets/stickers/vivos-smile-pack-1/happy.png") },
  { id: "smile", label: "Zâmbet", source: require("@/assets/stickers/vivos-smile-pack-1/smile.png") },
  { id: "laugh", label: "Râs", source: require("@/assets/stickers/vivos-smile-pack-1/laugh.png") },
  { id: "wow", label: "Uau", source: require("@/assets/stickers/vivos-smile-pack-1/wow.png") },
  { id: "love", label: "Dragoste", source: require("@/assets/stickers/vivos-smile-pack-1/love.png") },
  { id: "heart", label: "Inimă", source: require("@/assets/stickers/vivos-smile-pack-1/heart.png") },
  { id: "hug", label: "Îmbrățișare", source: require("@/assets/stickers/vivos-smile-pack-1/hug.png") },
  { id: "pray", label: "Mulțumesc", source: require("@/assets/stickers/vivos-smile-pack-1/pray.png") },
  { id: "thinking", label: "Gânditor", source: require("@/assets/stickers/vivos-smile-pack-1/thinking.png") },
  { id: "sad", label: "Trist", source: require("@/assets/stickers/vivos-smile-pack-1/sad.png") },
  { id: "angry", label: "Supărat", source: require("@/assets/stickers/vivos-smile-pack-1/angry.png") },
  { id: "sleepy", label: "Somnoros", source: require("@/assets/stickers/vivos-smile-pack-1/sleepy.png") },
  { id: "like", label: "Like", source: require("@/assets/stickers/vivos-smile-pack-1/like.png") },
  { id: "dislike", label: "Dislike", source: require("@/assets/stickers/vivos-smile-pack-1/dislike.png") },
]

const stickerMap = new Map(VIVOS_SMILE_STICKERS.map((sticker) => [sticker.id, sticker]))

export function createVivosStickerBody(id: VivosStickerId) {
  return `${VIVOS_STICKER_PREFIX}${id}`
}

export function parseVivosStickerBody(body?: string | null) {
  if (!body?.startsWith(VIVOS_STICKER_PREFIX)) return null
  const id = body.slice(VIVOS_STICKER_PREFIX.length) as VivosStickerId
  return stickerMap.get(id) ?? null
}
