import type { TUserRole } from '../../common/types/user.types'

export type TTokenPayload = {
  id:    string
  login: string
  name:  string
  role:  TUserRole
}
