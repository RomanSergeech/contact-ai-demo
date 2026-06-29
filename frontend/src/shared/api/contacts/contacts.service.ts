import { $api } from '../../config/api.config'

import type {
  TGetAllContactsResponse,
  TExportDataResponse,
  TGetContactResponse,
  TCreateContactResponse,
  TUpdateContactResponse,
  TDeleteContactResponse,
  TDeleteContactsBulkResponse,
  TUploadPhotoResponse,
  TDeletePhotoResponse,
  TGetContactLogsResponse,
  TResolveContactLogResponse,
} from '../../types/api.types'
import type { TContact } from '../../types/contact.types'


class ContactsService {

  getAll() {
    return $api.get<TGetAllContactsResponse>('/contacts')
  }

  exportData() {
    return $api.get<TExportDataResponse>('/contacts/export')
  }

  getById(id: string) {
    return $api.get<TGetContactResponse>(`/contact/${id}`)
  }

  create(body: Partial<TContact>) {
    return $api.post<TCreateContactResponse>('/contact/create', body)
  }

  update(id: string, updates: Partial<TContact>) {
    return $api.post<TUpdateContactResponse>('/contact/update', { id, ...updates })
  }

  delete(id: string) {
    return $api.post<TDeleteContactResponse>('/contact/delete', { id })
  }

  deleteMany(ids: string[]) {
    return $api.post<TDeleteContactsBulkResponse>('/contact/delete-bulk', { ids })
  }

  uploadPhoto(id: string, file: File) {
    const fd = new FormData()
    fd.append('photo', file)
    fd.append('id', id)
    return $api.post<TUploadPhotoResponse>('/contact/photo', fd)
  }

  deletePhoto(id: string) {
    return $api.post<TDeletePhotoResponse>('/contact/photo/delete', { id })
  }

  getLogs(contactId: string) {
    return $api.get<TGetContactLogsResponse>(`/contact/${contactId}/logs`)
  }

  resolveLog(contactId: string, logId: string, field: string, choice: 'old' | 'new' | 'merge') {
    return $api.post<TResolveContactLogResponse>(`/contact/${contactId}/logs/${logId}/resolve`, { field, choice })
  }

}

export default new ContactsService()
