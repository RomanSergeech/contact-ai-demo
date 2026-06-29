import { z } from 'zod'

const nonEmpty = (msg: string) => z.string().min(1, msg)

export const loginSchema = z.object({
  login:    nonEmpty('Введите логин'),
  password: nonEmpty('Введите пароль'),
})

export const createContactSchema = z.object({
  full_name: z.string().trim().min(1, 'Введите ФИО'),
})

export const createTaskSchema = z.object({
  title: nonEmpty('Введите название задачи'),
})

export const saveNameSchema = z.object({
  name: nonEmpty('Введите имя'),
})

export const createUserSchema = z.object({
  name:     nonEmpty('Введите имя'),
  login:    z.email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

export type TLoginForm = z.infer<typeof loginSchema>
export type TCreateContactForm = z.infer<typeof createContactSchema>
export type TCreateTaskForm = z.infer<typeof createTaskSchema>
export type TSaveNameForm = z.infer<typeof saveNameSchema>
export type TCreateUserForm = z.infer<typeof createUserSchema>
