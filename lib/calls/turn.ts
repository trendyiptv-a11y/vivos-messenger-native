export type IceServerConfig = {
  urls: string | string[]
  username?: string
  credential?: string
}

export async function loadTurnCredentials() {
  const response = await fetch("https://vivos-api.vercel.app/api/turn-credentials")

  if (!response.ok) {
    throw new Error("Nu am putut obține credențialele TURN pentru apelurile native.")
  }

  const data = await response.json()
  return {
    iceServers: (data?.iceServers ?? []) as IceServerConfig[],
  }
}
