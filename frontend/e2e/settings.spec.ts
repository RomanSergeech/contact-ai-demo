import { test, expect } from '@playwright/test'
import { mockApi, setupAuthenticatedSession } from './helpers/api-mock'

test.describe('Settings page', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page)
  })

  test('shows settings page heading', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  })

  test('save name shows confirmation text', async ({ page }) => {
    await mockApi.settings.saveName(page, 'Новое Имя')
    await page.goto('/settings')

    await page.getByPlaceholder('Ваше имя').fill('Новое Имя')
    // Profile section save button (first Сохранить on the page)
    await page.getByRole('button', { name: 'Сохранить' }).first().click()

    await expect(page.getByRole('button', { name: '✓ Сохранено' }).first()).toBeVisible()
  })

  test('save AI prompt shows confirmation text', async ({ page }) => {
    await mockApi.settings.saveAiPrompt(page)
    await page.goto('/settings')

    await page.getByPlaceholder(/Например: Я предприниматель/).fill('Я предприниматель')
    // AI prompt section save button (second Сохранить on the page)
    await page.getByRole('button', { name: 'Сохранить' }).nth(1).click()

    // Only the AI prompt button changes to "✓ Сохранено" — use first() match
    await expect(page.getByRole('button', { name: '✓ Сохранено' }).first()).toBeVisible()
  })

  test('clicking "Удалить аккаунт" shows confirm step', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Удалить аккаунт' }).click()
    await expect(page.getByText('Вы уверены? Это действие нельзя отменить.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Да, удалить' })).toBeVisible()
  })

  test('"Отмена" hides confirm step', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Удалить аккаунт' }).click()
    await expect(page.getByRole('button', { name: 'Да, удалить' })).toBeVisible()

    await page.getByRole('button', { name: 'Отмена' }).click()

    await expect(page.getByRole('button', { name: 'Удалить аккаунт' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Да, удалить' })).not.toBeVisible()
  })

  test('confirm delete redirects to login page', async ({ page }) => {
    await mockApi.settings.deleteAccount(page)
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Удалить аккаунт' }).click()
    await page.getByRole('button', { name: 'Да, удалить' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByPlaceholder('Введите логин')).toBeVisible()
  })

})
