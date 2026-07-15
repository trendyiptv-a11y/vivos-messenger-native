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
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  const nowIso = new Date().toISOString()

  const { data: expiredMessages, error: selectError } = await supabase
    .from("messages")
    .select("id, attachment_path")
    .not("attachment_path", "is", null)
    .is("attachment_deleted_at", null)
    .not("attachment_expires_at", "is", null)
    .lte("attachment_expires_at", nowIso)
    .limit(batchSize)

  if (selectError) throw selectError

  const rows = (expiredMessages || []).filter((row) => row.attachment_path)
  if (!rows.length) {
    console.log("No expired chat attachments to clean.")
    return
  }

  const paths = rows.map((row) => row.attachment_path)
  const ids = rows.map((row) => row.id)

  const { error: removeError } = await supabase.storage.from(bucketName).remove(paths)
  if (removeError) throw removeError

  const { error: updateError } = await supabase
    .from("messages")
    .update({
      attachment_url: null,
      attachment_deleted_at: new Date().toISOString(),
    })
    .in("id", ids)

  if (updateError) throw updateError

  console.log(`Cleaned ${ids.length} expired chat attachment(s).`)
}

main().catch((error) => {
  console.error("Expired chat attachment cleanup failed:", error)
  process.exit(1)
})
