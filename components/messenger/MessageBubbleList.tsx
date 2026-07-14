import { useMemo } from "react"
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { theme } from "@/lib/theme"

type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
  attachment_url?: string | null
  attachment_type?: string | null
  attachment