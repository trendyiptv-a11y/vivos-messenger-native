import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import * as ImagePicker from "expo-image-picker"
import { decode } from "base64-arraybuffer"
import { supabase } from "@/lib/supabase"

export type ChatAttachmentKind = "image" | "video" | "file"

export type PickedChatAttachment = {
  uri: string
  name: string
  mimeType: string
  size: number | null
  kind: ChatAttachmentKind
}

export type UploadedChatAttachment = PickedChatAttachment & {
  storagePath: string
  publicUrl: string
}

const BUCKET_NAME = "chat-attachments"

function safeFileName(value: string) {
  return (value || "attachment")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "attachment"
}

function extensionFromMime(mimeType: string, fallback: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  }
  return map[mimeType] || fallback
}

function nameFromUri(uri: string, kind: ChatAttachmentKind, mimeType: string) {
  const raw = decodeURIComponent(uri.split("/").pop() || "")
  if (raw && raw.includes(".")) return safeFileName(raw)

  const fallbackExt = kind === "image" ? "jpg" : kind === "video" ? "mp4" : "bin"
  const ext = extensionFromMime(mimeType, fallbackExt)
  return `${kind}-${Date.now()}.${ext}`
}

async function getUploadData(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  return decode(base64)
}

export async function pickChatPhoto(): Promise<PickedChatAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.86,
  })

  if (result.canceled || !result.assets?.[0]?.uri) return null

  const asset = result.assets[0]
  const mimeType = asset.mimeType || "image/jpeg"
  return {
    uri: asset.uri,
    name: safeFileName(asset.fileName || nameFromUri(asset.uri, "image", mimeType)),
    mimeType,
    size: asset.fileSize ?? null,
    kind: "image",
  }
}

export async function pickChatVideo(): Promise<PickedChatAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 0.8,
  })

  if (result.canceled || !result.assets?.[0]?.uri) return null

  const asset = result.assets[0]
  const mimeType = asset.mimeType || "video/mp4"
  return {
    uri: asset.uri,
    name: safeFileName(asset.fileName || nameFromUri(asset.uri, "video", mimeType)),
    mimeType,
    size: asset.fileSize ?? null,
    kind: "video",
  }
}

export async function pickChatFile(): Promise<PickedChatAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: true,
  })

  if (result.canceled || !result.assets?.[0]?.uri) return null

  const asset = result.assets[0]
  const mimeType = asset.mimeType || "application/octet-stream"
  return {
    uri: asset.uri,
    name: safeFileName(asset.name || nameFromUri(asset.uri, "file", mimeType)),
    mimeType,
    size: asset.size ?? null,
    kind: "file",
  }
}

export async function uploadChatAttachment(conversationId: string, userId: string, attachment: PickedChatAttachment): Promise<UploadedChatAttachment> {
  const fileData = await getUploadData(attachment.uri)
  const random = Math.random().toString(36).slice(2, 10)
  const path = `${conversationId}/${userId}/${Date.now()}-${random}-${safeFileName(attachment.name)}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, fileData, {
      contentType: attachment.mimeType,
      upsert: false,
    })

  if (error) throw error

  const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

  return {
    ...attachment,
    storagePath: data.path,
    publicUrl: publicData.publicUrl,
  }
}

export function attachmentBodyLabel(kind: ChatAttachmentKind, name: string) {
  if (kind === "image") return `📷 ${name || "Fotografie"}`
  if (kind === "video") return `🎥 ${name || "Video"}`
  return `📎 ${name || "Fișier"}`
}
