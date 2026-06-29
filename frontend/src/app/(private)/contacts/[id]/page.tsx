import { Suspense } from 'react'
import { ContactPage } from '@/components/contact/ContactPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return (
    <Suspense>
      <ContactPage id={id} />
    </Suspense>
  )
}
