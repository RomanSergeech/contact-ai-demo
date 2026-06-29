import { $api } from '../../config/api.config'

import type { TLoginRequest, TLoginResponse, TCheckAuthResponse, TLogoutResponse } from '../../types/api.types'


class AuthService {

  login(reqData: TLoginRequest) {
    return $api.post<TLoginResponse>('/auth/login', reqData)
  }

  checkAuth() {
    return $api.post<TCheckAuthResponse>('/auth/refresh')
  }

  logout() {
    return $api.post<TLogoutResponse>('/auth/logout')
  }

}

export default new AuthService()
