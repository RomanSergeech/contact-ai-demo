export type TUserRole = 'admin' | 'user'

export type TUser = {
  id: string
  login: string
  name: string
  role: TUserRole
  image: string | null
  ai_system_prompt: string | null
  vk_connected: boolean
  telegram_connected: boolean
}
