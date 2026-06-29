import { test, expect } from '@playwright/test'
import { mockApi, makeContact, setupAuthenticatedSession } from './helpers/api-mock'

const selectCheckbox = (page: Parameters<typeof setupAuthenticatedSession>[0], index: number) =>
  page.evaluate((i: number) => {
    const inputs = document.querySelectorAll('input[type="checkbox"]')
    ;(inputs[i] as HTMLInputElement).click()
  }, index)


test.describe('Contacts page', () => {

  test('shows contact list', async ({ page }) => {
    await setupAuthenticatedSession(page, [
      makeContact({ id: 'c1', full_name: 'Иван Иванов' }),
      makeContact({ id: 'c2', full_name: 'Мария Петрова' }),
    ])
    await page.goto('/main')
    await expect(page.getByText('Иван Иванов')).toBeVisible()
    await expect(page.getByText('Мария Петрова')).toBeVisible()
  })

  test('shows empty state text when list is empty', async ({ page }) => {
    await setupAuthenticatedSession(page, [])
    await page.goto('/main')
    await expect(page.getByText('Контактов ещё нет. Добавьте первый!')).toBeVisible()
  })

  test('opens create contact modal', async ({ page }) => {
    await setupAuthenticatedSession(page)
    await page.goto('/main')
    await page.getByRole('button', { name: '+ Добавить контакт' }).click()
    await expect(page.getByPlaceholder('Имя Фамилия')).toBeVisible()
  })

  test('creates contact and shows it in list', async ({ page }) => {
    await setupAuthenticatedSession(page)
    const newContact = makeContact({ id: 'c3', full_name: 'Новый Контакт' })
    await mockApi.contacts.create(page, newContact)

    await page.goto('/main')
    await page.getByRole('button', { name: '+ Добавить контакт' }).click()
    await page.getByPlaceholder('Имя Фамилия').fill('Новый Контакт')
    await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 3000 }).catch(() => {})
    await page.getByRole('button', { name: 'Создать контакт', exact: true }).click()

    await expect(page.getByText('Новый Контакт')).toBeVisible()
  })

  test('bulk delete removes selected contacts from list', async ({ page }) => {
    const c1 = makeContact({ id: 'c1', full_name: 'Иван Иванов' })
    const c2 = makeContact({ id: 'c2', full_name: 'Мария Петрова' })
    await setupAuthenticatedSession(page, [c1, c2])
    await mockApi.contacts.deleteBulk(page, ['c1'])
    await page.goto('/main')
    await expect(page.getByText('Иван Иванов')).toBeVisible()

    await selectCheckbox(page, 0)
    await page.getByRole('button', { name: /Удалить/ }).first().click()
    await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()

    await expect(page.getByText('Иван Иванов')).not.toBeVisible()
    await expect(page.getByText('Мария Петрова')).toBeVisible()
  })

  test('partial bulk delete keeps failed contacts in list', async ({ page }) => {
    const c1 = makeContact({ id: 'c1', full_name: 'Удалится' })
    const c2 = makeContact({ id: 'c2', full_name: 'Не удалится' })
    await setupAuthenticatedSession(page, [c1, c2])
    await mockApi.contacts.deleteBulk(page, ['c1'], ['c2'])
    await page.goto('/main')
    await expect(page.getByText('Удалится', { exact: true })).toBeVisible()

    await selectCheckbox(page, 0)
    await selectCheckbox(page, 1)
    await page.getByRole('button', { name: /Удалить/ }).first().click()
    await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()

    await expect(page.getByText('Удалится', { exact: true })).not.toBeVisible()
    await expect(page.getByText('Не удалится')).toBeVisible()
  })

  test('selects contacts with checkboxes and shows delete button', async ({ page }) => {
    await setupAuthenticatedSession(page, [
      makeContact({ id: 'c1', full_name: 'Иван Иванов' }),
    ])
    await page.goto('/main')
    await expect(page.getByText('Иван Иванов')).toBeVisible()
    // Native click via evaluate bypasses pointer-event interception from the <li> wrapper
    await page.evaluate(() => {
      const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement
      input.click()
    })
    await expect(page.getByRole('button', { name: /Удалить/ })).toBeVisible()
  })

  test('opens contact page on row click', async ({ page }) => {
    await setupAuthenticatedSession(page, [
      makeContact({ id: 'c1', full_name: 'Иван Иванов' }),
    ])
    await page.route('**/contact/c1', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeContact({ id: 'c1', full_name: 'Иван Иванов' })),
      })
    )
    await page.goto('/main')
    await page.getByText('Иван Иванов').click()
    await expect(page).toHaveURL('/contacts/c1')
  })

})
