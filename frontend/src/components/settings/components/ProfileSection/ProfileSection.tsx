'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUserStore } from '@/shared/store'
import { Button, Input } from '@/shared/UI'
import { saveNameSchema, type TSaveNameForm } from '@/shared/schemas'

import c from './ProfileSection.module.scss'


const ProfileSection = () => {
  const { name, saveName } = useUserStore()

  const [nameSaved, setNameSaved] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting: nameSaving },
  } = useForm<TSaveNameForm>({
    resolver: zodResolver(saveNameSchema),
    defaultValues: { name: name ?? '' },
  })

  const nameValue = watch('name')

  const handleSaveName = async (data: TSaveNameForm) => {
    await saveName(data.name.trim())
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  return (
    <div className={c.section}>
      <p className={c.section_title}>Профиль</p>

      <form
        className={c.profile_form}
        onSubmit={handleSubmit(handleSaveName)}
      >
        <div className={c.field}>
          <p className={c.field_label}>Имя</p>
          <Input
            placeholder="Ваше имя"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className={c.save_btn}
          disabled={nameSaving || !nameValue}
        >
          {nameSaved ? '✓ Сохранено' : nameSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </form>
    </div>
  )
}

export { ProfileSection }
