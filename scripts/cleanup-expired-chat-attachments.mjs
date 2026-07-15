import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketName = process.env.CHAT_ATTACHMENTS_BUCKET || "chat-attachments"
const batchSize = Number(process.env.CHAT_ATTACHMENT_CLEANUP_BATCH_SIZE || 100)

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL")
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)