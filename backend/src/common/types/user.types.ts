export type TUserRole = 'admin' | 'user'

export type TUser = {
  id:               string
  login:            string
  password:         string
  name:             string
  role:             TUserRole
  image:            string | null
  refresh_token:    string | null
  ai_system_prompt: string | null
  vk_access_token:     string | null
  vk_refresh_token:    string | null
  vk_token_expires_at: Date | null
  vk_user_id:          string | null
  telegram_session: string | null
}

export type TUserPublic = Omit<TUser, 'password' | 'refresh_token' | 'vk_access_token' | 'vk_refresh_token' | 'vk_token_expires_at' | 'vk_user_id' | 'telegram_session'> & {
  vk_connected:       boolean
  telegram_connected: boolean
}
