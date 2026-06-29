'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from '@/shared/UI'
import { useAuthStore } from '@/shared/store'
import { showAlert } from '@/shared/utils'
import { loginSchema, type TLoginForm } from '@/shared/schemas'
import { useShowHidePassword } from '@/shared/hooks'
import { STATIC_URL } from '@/shared/config/api.config'

import c from './page.module.scss'


const AuthPage = () => {
  const router = useRouter()

  const { inputType, ShowHidePasswordSvgElement } = useShowHidePassword()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TLoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: TLoginForm) => {
    await useAuthStore.getState().login(data)
      .then(() => router.push('/main'))
      .catch((err: { message?: string }) => {
        showAlert({
          text: [err?.message ?? 'Что-то пошло не так'],
          btnText: 'Закрыть',
        }, 5000)
      })
  }

  return (
    <div className={c.auth_screen}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2>Contact AI</h2>

        <div className={c.loader_wrapper}>
          {/* слот спиннера */}
        </div>

        <Input
          label="Логин"
          placeholder="Введите логин"
          error={errors.login?.message}
          {...register('login')}
        />

        <div className={c.password_wrapper}>
          <Input
            type={inputType}
            label="Пароль"
            autoComplete="off"
            placeholder="Введите пароль"
            error={errors.password?.message}
            {...register('password')}
          />
          <ShowHidePasswordSvgElement />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Вход...' : 'Войти'}
        </Button>

        <p className={c.terms_note}>
          Входя в систему, вы принимаете{' '}
          <a
            href={`${STATIC_URL}/terms.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            пользовательское соглашение
          </a>
        </p>
      </form>
    </div>
  )
}

export { AuthPage }
