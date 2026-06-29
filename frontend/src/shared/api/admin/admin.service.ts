import { $api } from '../../config/api.config'

import type { TGetUsersResponse, TCreateUserResponse, TDeleteUserResponse } from '../../types/api.types'


class AdminService {

  getUsers() {
    return $api.get<TGetUsersResponse>('/admin/users')
  }

  createUser(data: { name: string; login: string; password: string; role: string }) {
    return $api.post<TCreateUserResponse>('/admin/users/create', data)
  }

  deleteUser(id: string) {
    return $api.delete<TDeleteUserResponse>(`/admin/users/${id}`)
  }

}

export default new AdminService()
