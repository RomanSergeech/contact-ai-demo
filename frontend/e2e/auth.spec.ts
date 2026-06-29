import { test, expect } from '@playwright/test'
import { mockApi, setupAuthenticatedSession } from './helpers/api-mock'

test.describe('Auth flow', () => {

  test.beforeEach(async ({ page }) => {
    await mockApi.auth.checkAuthFail(page)
  })

  test('shows login page at root for unauthenticated user', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder('Введите логин')).toBeVisible()
    await expect(page.getByPlaceholder('Введите пароль')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  })

  test('redirects to / when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/main')
    await expect(page).toHaveURL('/')
  })

  test('shows "Вход..." while submitting', async ({ page }) => {
    await page.route('http://localhost:5000/api/auth/login', route => new Promise(() => {}))
    await page.goto('/')
    await page.getByPlaceholder('Введите логин').fill('test@test.com')
    await page.getByPlaceholder('Введите пароль').fill('secret')
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page.getByRole('button', { name: 'Вход...' })).toBeDisabled()
  })

  test('redirects to /main after successful login', async ({ page }) => {
    await mockApi.auth.loginSuccess(page)
    await mockApi.contacts.getAll(page)
    await mockApi.tasks.getAll(page)

    await page.goto('/')
    await page.getByPlaceholder('Введите логин').fill('test@test.com')
    await page.getByPlaceholder('Введите пароль').fill('secret')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page).toHaveURL('/main')
  })

  test('stays on login page after failed login', async ({ page }) => {
    await mockApi.auth.loginFail(page)
    await page.goto('/')
    await page.getByPlaceholder('Введите логин').fill('wrong@test.com')
    await page.getByPlaceholder('Введите пароль').fill('wrongpassword')
    await page.getByRole('button', { name: 'Войти' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByPlaceholder('Введите логин')).toBeVisible()
  })

  test('password toggle shows/hides password', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('Введите пароль')
    await expect(input).toHaveAttribute('type', 'password')
    await page.locator('.show_hide_password').click()
    await expect(input).toHaveAttribute('type', 'text')
    await page.locator('.show_hide_password').click()
    await expect(input).toHaveAttribute('type', 'password')
  })

})

test.describe('Authenticated session', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page)
  })

  test('stays on /main when already authenticated', async ({ page }) => {
    await page.goto('/main')
    await expect(page).toHaveURL('/main')
    await expect(page.getByText('Contact AI')).toBeVisible()
  })

  test('redirects / to /main when already authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/main')
  })

  test('logout returns to login page', async ({ page }) => {
    await mockApi.auth.logout(page)
    await page.goto('/main')
    await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
    await page.getByRole('button', { name: 'Выйти' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByPlaceholder('Введите логин')).toBeVisible()
  })

})
