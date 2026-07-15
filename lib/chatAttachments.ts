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
  kind