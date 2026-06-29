import { test, expect } from '@playwright/test'
import { mockApi, makeUser, setupAuthenticatedSession, setupAdminSession } from './helpers/api-mock'

test.describe('Admin page', () => {

  test('non-admin user is redirected to /main', async ({ page }) => {
    await setupAuthenticatedSession(page)
    // Admin endpoint might still be called — mock it to avoid network errors
    await mockApi.admin.getUsers(page)
    await page.goto('/admin')
    await expect(page).toHaveURL('/main')
  })

  test('admin sees user list', async ({ page }) => {
    await setupAdminSession(page)
    await mockApi.admin.getUsers(page, [
      makeUser({ id: 'u2', name: 'Иван Петров', login: 'ivan@test.com', role: 'user' }),
      makeUser({ id: 'u3', name: 'Мария Сидорова', login: 'maria@test.com', role: 'admin' }),
    ])
    await page.goto('/admin')
    await expect(page.getByText('Иван Петров')).toBeVisible()
    await expect(page.getByText('Мария Сидорова')).toBeVisible()
  })

  test('opens create user modal', async ({ page }) => {
    await setupAdminSession(page)
    await mockApi.admin.getUsers(page)
    await page.goto('/admin')
    await page.getByRole('button', { name: '+ Зарегистрировать' }).click()
    await expect(page.getByText('Новый пользователь')).toBeVisible()
    await expect(page.getByPlaceholder('Иван Иванов')).toBeVisible()
  })

  test('creates user and shows in table', async ({ page }) => {
    const newUser = makeUser({ id: 'u2', name: 'Новый Юзер', login: 'new@test.com', role: 'user' })
    await setupAdminSession(page)
    await mockApi.admin.getUsers(page)
    await mockApi.admin.createUser(page, newUser)
    await page.goto('/admin')

    await page.getByRole('button', { name: '+ Зарегистрировать' }).click()
    await page.getByPlaceholder('Иван Иванов').fill('Новый Юзер')
    await page.getByPlaceholder('user@example.com').fill('new@test.com')
    await page.getByPlaceholder('Минимум 6 символов').fill('password123')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page.getByText('Новый Юзер')).toBeVisible()
    await expect(page.getByText('new@test.com')).toBeVisible()
  })

  test('delete button is disabled for self', async ({ page }) => {
    // Self user id is 'u1' (from setupAdminSession)
    await setupAdminSession(page)
    await mockApi.admin.getUsers(page, [
      makeUser({ id: 'u1', name: 'Тест Пользователь', login: 'test@test.com', role: 'admin' }),
      makeUser({ id: 'u2', name: 'Другой Юзер', login: 'other@test.com', role: 'user' }),
    ])
    await page.goto('/admin')

    const selfRow = page.locator('ul').filter({ hasText: 'Тест Пользователь' })
    await expect(selfRow.getByRole('button', { name: 'Удалить' })).toBeDisabled()
    const otherRow = page.locator('ul').filter({ hasText: 'Другой Юзер' })
    await expect(otherRow.getByRole('button', { name: 'Удалить' })).toBeEnabled()
  })

  test('deletes user and removes from table', async ({ page }) => {
    const targetUser = makeUser({ id: 'u2', name: 'Удаляемый Юзер', login: 'delete@test.com', role: 'user' })
    await setupAdminSession(page)
    await mockApi.admin.getUsers(page, [targetUser])
    await mockApi.admin.deleteUser(page, 'u2')
    await page.goto('/admin')

    await expect(page.getByText('Удаляемый Юзер')).toBeVisible()
    await page.getByRole('button', { name: 'Удалить' }).click()
    await page.getByRole('button', { name: 'Удалить' }).last().click()
    await expect(page.getByText('Удаляемый Юзер')).not.toBeVisible()
  })

})
