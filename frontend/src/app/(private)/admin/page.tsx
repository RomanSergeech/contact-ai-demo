import dynamic from 'next/dynamic'
import { Loader } from '@/shared/UI'

const UsersPage = dynamic(
  () => import('@/components/admin/UsersPage'),
  { loading: () => <Loader fullScreen /> }
)

export default function AdminRoute() {
  return <UsersPage />
}
