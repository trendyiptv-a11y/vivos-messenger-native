import { Redirect } from "expo-router"
import { useAuthSession } from "@/hooks/useAuthSession"

export default function IndexScreen() {
  const { isAuthenticated } = useAuthSession()
  return <Redirect href={isAuthenticated ? "/inbox" : "/login"} />
}
