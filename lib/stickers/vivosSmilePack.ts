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
  source: ImageSourceProp