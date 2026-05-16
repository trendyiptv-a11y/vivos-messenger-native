import { supabase } from "@/lib/supabase"

type ConversationMemberRow = {
  conversation_id: string
  member_id: string
}

export async function getOrCreateDirectConversation(currentUserId: string, otherUserId: string) {
  if (!currentUserId || !otherUserId) {
    throw new Error("Lipsesc utilizatorii pentru conversație.")
  }

  if (currentUserId === otherUserId) {
    throw new Error("Nu poți deschide conversație cu tine însuți.")
  }

  const { data: ownMemberships, error: ownError } = await supabase
    .from("conversation_members")
    .select("conversation_id, member_id")
    .eq("member_id", currentUserId)

  if (ownError) throw ownError

  const conversationIds = ((ownMemberships ?? []) as ConversationMemberRow[])
    .map((row) => row.conversation_id)
    .filter(Boolean)

  if (conversationIds.length) {
    const { data: otherMemberships, error: otherError } = await supabase
      .from("conversation_members")
      .select("conversation_id, member_id")
      .eq("member_id", otherUserId)
      .in("conversation_id", conversationIds)

    if (otherError) throw otherError

    const existing = ((otherMemberships ?? []) as ConversationMemberRow[])[0]?.conversation_id
    if (existing) return existing
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single()

  if (conversationError) throw conversationError

  const conversationId = String((conversation as any)?.id || "")
  if (!conversationId) throw new Error("Conversația nu a putut fi creată.")

  const { error: membersError } = await supabase.from("conversation_members").insert([
    {
      conversation_id: conversationId,
      member_id: currentUserId,
    },
    {
      conversation_id: conversationId,
      member_id: otherUserId,
    },
  ])

  if (membersError) throw membersError

  return conversationId
}
