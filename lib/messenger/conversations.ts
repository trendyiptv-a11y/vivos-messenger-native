import { supabase } from "@/lib/supabase"

export async function getOrCreateDirectConversation(currentUserId: string, otherUserId: string) {
  if (!currentUserId || !otherUserId) {
    throw new Error("Lipsesc utilizatorii pentru conversație.")
  }

  if (currentUserId === otherUserId) {
    throw new Error("Nu poți deschide conversație cu tine însuți.")
  }

  const { data, error } = await supabase.rpc("find_or_create_direct_conversation", {
    other_member_id: otherUserId,
  })

  if (error || !data) {
    throw new Error(error?.message || "Conversația nu a putut fi deschisă.")
  }

  const conversationId = String(data || "")
  if (!conversationId) {
    throw new Error("Conversația nu a putut fi deschisă.")
  }

  await supabase
    .from("conversation_hidden_for_users")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)

  return conversationId
}
