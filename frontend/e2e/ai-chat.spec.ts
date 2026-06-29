import { test, expect } from '@playwright/test'
import { mockApi, makeContact, setupAuthenticatedSession } from './helpers/api-mock'

const contact = makeContact({ id: 'c1', full_name: 'Иван Иванов' })

test.describe('AI chat widget', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, [contact])
    await mockApi.ai.getHistory(page, 'c1')
    await page.route('**/contact/c1/logs', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ logs: [] }) })
    )
    // Navigate via client-side routing; noWaitAfter avoids stalling on Turbopack RSC compilation
    await page.goto('/main')
    await page.getByText('Иван Иванов').first().click({ noWaitAfter: true })
    await page.waitForURL('**/contacts/**', { timeout: 15000 })
    await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 3000 }).catch(() => {})
  })

  test('opens chat panel on tab click', async ({ page }) => {
    await page.getByLabel('Открыть чат').click()
    await expect(page.getByLabel('Закрыть чат')).toBeVisible()
    await expect(page.getByPlaceholder('Напишите сообщение...')).toBeVisible()
  })

  test('closes chat panel on second tab click', async ({ page }) => {
    await page.getByLabel('Открыть чат').click()
    await page.getByLabel('Закрыть чат').click()
    await expect(page.getByLabel('Открыть чат')).toBeVisible()
  })

  test('displays history messages when panel opens', async ({ page }) => {
    await mockApi.ai.getHistory(page, 'c1', [
      { role: 'user',      content: 'Как дела?' },
      { role: 'assistant', content: 'Отлично!' },
    ])
    await page.goto('/main')
    await page.getByText('Иван Иванов').first().click({ noWaitAfter: true })
    await page.waitForURL('**/contacts/**', { timeout: 15000 })
    await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 15000 })

    await page.getByLabel('Открыть чат').click()
    await expect(page.getByText('Как дела?')).toBeVisible()
    await expect(page.getByText('Отлично!')).toBeVisible()
  })

  test('send button is disabled when textarea is empty', async ({ page }) => {
    await page.getByLabel('Открыть чат').click()
    await expect(page.getByLabel('Отправить')).toBeDisabled()
  })

  test('send button is enabled when textarea has text', async ({ page }) => {
    await page.getByLabel('Открыть чат').click()
    await page.getByPlaceholder('Напишите сообщение...').fill('Привет')
    await expect(page.getByLabel('Отправить')).toBeEnabled()
  })

  test('sends message and shows user message + AI response', async ({ page }) => {
    await mockApi.ai.sendMessage(page, 'c1', 'Здравствуйте!')
    await page.getByLabel('Открыть чат').click()
    await page.getByPlaceholder('Напишите сообщение...').fill('Привет')
    await page.getByLabel('Отправить').click()

    await expect(page.getByText('Привет')).toBeVisible()
    await expect(page.getByText('Здравствуйте!')).toBeVisible()
  })

  test('clears textarea after send', async ({ page }) => {
    await mockApi.ai.sendMessage(page, 'c1', 'Ответ')
    await page.getByLabel('Открыть чат').click()
    const textarea = page.getByPlaceholder('Напишите сообщение...')
    await textarea.fill('Привет')
    await page.getByLabel('Отправить').click()
    await expect(textarea).toHaveValue('')
  })

  test('shows error message when API fails', async ({ page }) => {
    await mockApi.ai.sendMessageFail(page, 'c1')
    await page.getByLabel('Открыть чат').click()
    await page.getByPlaceholder('Напишите сообщение...').fill('Привет')
    await page.getByLabel('Отправить').click()
    await expect(page.getByText('Не удалось подключиться к серверу.')).toBeVisible()
  })

  test('clear button appears only when messages exist', async ({ page }) => {
    await page.getByLabel('Открыть чат').click()
    await expect(page.getByTitle('Очистить чат')).not.toBeVisible()

    await mockApi.ai.sendMessage(page, 'c1', 'Ответ')
    await page.getByPlaceholder('Напишите сообщение...').fill('Привет')
    await page.getByLabel('Отправить').click()
    await expect(page.getByText('Ответ')).toBeVisible()
    await expect(page.getByTitle('Очистить чат')).toBeVisible()
  })

  test('clear button removes all messages', async ({ page }) => {
    await mockApi.ai.clearHistory(page, 'c1')
    await mockApi.ai.getHistory(page, 'c1', [{ role: 'user', content: 'Старое сообщение' }])
    await page.goto('/main')
    await page.getByText('Иван Иванов').first().click({ noWaitAfter: true })
    await page.waitForURL('**/contacts/**', { timeout: 15000 })
    await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 15000 })

    await page.getByLabel('Открыть чат').click()
    await expect(page.getByText('Старое сообщение')).toBeVisible()

    await page.getByTitle('Очистить чат').click()
    await expect(page.getByText('Старое сообщение')).not.toBeVisible()
  })

})
