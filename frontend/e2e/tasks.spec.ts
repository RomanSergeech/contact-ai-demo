import { test, expect } from '@playwright/test'
import { mockApi, makeTask, makeContact, setupAuthenticatedSession } from './helpers/api-mock'

test.describe('Tasks page', () => {

  test('shows all 5 columns', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [])
    await page.goto('/tasks')
    await expect(page.getByText('Просрочены')).toBeVisible()
    await expect(page.getByText('На сегодня')).toBeVisible()
    await expect(page.getByText('На этой неделе')).toBeVisible()
    await expect(page.getByText('Без срока')).toBeVisible()
    await expect(page.getByText('Выполнены')).toBeVisible()
  })

  test('shows tasks in correct columns', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [
      makeTask({ id: 't1', title: 'Задача без срока',  status: 'no_deadline' }),
      makeTask({ id: 't2', title: 'Задача на сегодня', status: 'today'       }),
    ])
    await page.goto('/tasks')
    await expect(page.getByText('Задача без срока')).toBeVisible()
    await expect(page.getByText('Задача на сегодня')).toBeVisible()
  })

  test('shows "Нет задач" in empty columns', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [
      makeTask({ id: 't1', title: 'Единственная задача', status: 'no_deadline' }),
    ])
    await page.goto('/tasks')
    // 4 columns should show "Нет задач" (all except no_deadline)
    await expect(page.getByText('Единственная задача')).toBeVisible()
    const noDl = page.getByText('Нет задач')
    await expect(noDl.first()).toBeVisible()
  })

  test('opens create task modal', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [])
    await page.goto('/tasks')
    await page.getByRole('button', { name: '+ Создать задачу' }).click()
    await expect(page.getByPlaceholder('Введите название задачи')).toBeVisible()
  })

  test('creates task via modal', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [])
    const newTask = makeTask({ id: 't3', title: 'Новая задача', status: 'no_deadline' })
    await page.route('**/task/create', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newTask),
      })
    )

    await page.goto('/tasks')
    await page.getByRole('button', { name: '+ Создать задачу' }).click()
    await page.getByPlaceholder('Введите название задачи').fill('Новая задача')
    await page.getByRole('button', { name: 'Создать', exact: true }).click()

    await expect(page.getByText('Новая задача').first()).toBeVisible()
  })

  test('"Контакты" breadcrumb navigates to /main', async ({ page }) => {
    await setupAuthenticatedSession(page, [], [])
    await page.goto('/tasks')
    await page.getByRole('button', { name: 'Контакты', exact: true }).click()
    await expect(page).toHaveURL('/main')
  })

  test('drag task to another column moves it there', async ({ page }) => {
    const task  = makeTask({ id: 't1', title: 'Перетащи меня', status: 'no_deadline' })
    const moved = makeTask({ id: 't1', title: 'Перетащи меня', status: 'done' })
    await setupAuthenticatedSession(page, [], [task])
    await mockApi.tasks.update(page, moved)
    await page.goto('/tasks')

    await expect(page.getByText('Перетащи меня')).toBeVisible()

    // Playwright dragTo uses mouse events, not HTML5 drag events, so dataTransfer.getData() wouldn't work.
    // Use dispatchEvent with a shared DataTransfer handle so the React dragstart handler sets the taskId
    // and the drop handler can read it from the same object.
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer())

    const card = page.getByText('Перетащи меня')
    // CSS modules mangle class names; navigate from the column label span up to the column div
    const doneColumn = page.locator('span', { hasText: 'Выполнены' }).first().locator('xpath=../..')

    await card.dispatchEvent('dragstart', { dataTransfer })
    await doneColumn.dispatchEvent('dragenter', { dataTransfer })
    await doneColumn.dispatchEvent('drop', { dataTransfer })

    // After drop the task should appear inside the "Выполнены" column
    await expect(doneColumn.getByText('Перетащи меня')).toBeVisible()
  })

})

test.describe('TaskPanel', () => {

  test('clicking a card opens the task panel', async ({ page }) => {
    const task = makeTask({ id: 't1', title: 'Открой меня', status: 'no_deadline' })
    await setupAuthenticatedSession(page, [], [task])
    await page.goto('/tasks')

    await page.getByText('Открой меня').click()

    await expect(page.getByPlaceholder('Название задачи')).toBeVisible()
  })

  test('closing the panel hides it', async ({ page }) => {
    const task = makeTask({ id: 't1', title: 'Задача панели', status: 'no_deadline' })
    await setupAuthenticatedSession(page, [], [task])
    await page.goto('/tasks')
    await page.getByText('Задача панели').click()
    await expect(page.getByPlaceholder('Название задачи')).toBeVisible()

    await page.getByLabel('Закрыть').first().click()

    await expect(page.getByPlaceholder('Название задачи')).not.toBeVisible()
  })

  test('editing title in panel saves on blur', async ({ page }) => {
    const task    = makeTask({ id: 't1', title: 'Старое название', status: 'no_deadline' })
    const updated = makeTask({ id: 't1', title: 'Новое название',  status: 'no_deadline' })
    await setupAuthenticatedSession(page, [], [task])
    await mockApi.tasks.update(page, updated)
    await page.goto('/tasks')

    await page.getByText('Старое название').click()
    const input = page.getByPlaceholder('Название задачи')
    await input.fill('Новое название')
    await input.blur()

    await expect(page.getByText('Новое название').first()).toBeVisible()
  })

  test('"✓ Задача выполнена" moves task to "Выполнены" column', async ({ page }) => {
    const task = makeTask({ id: 't1', title: 'Выполни меня', status: 'no_deadline' })
    const done = makeTask({ id: 't1', title: 'Выполни меня', status: 'done' })
    await setupAuthenticatedSession(page, [], [task])
    await mockApi.tasks.update(page, done)
    await page.goto('/tasks')

    await page.getByText('Выполни меня').click()
    await page.getByRole('button', { name: '✓ Задача выполнена' }).click()

    const doneColumn = page.locator('span', { hasText: 'Выполнены' }).first().locator('xpath=../..')
    await expect(doneColumn.getByText('Выполни меня')).toBeVisible()
  })

  test('"Удалить" removes the task and closes the panel', async ({ page }) => {
    const task = makeTask({ id: 't1', title: 'Удали меня', status: 'no_deadline' })
    await setupAuthenticatedSession(page, [], [task])
    await page.route('**/task/delete', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )
    await page.goto('/tasks')

    await page.getByText('Удали меня').click()
    await page.getByRole('button', { name: 'Удалить' }).first().click()
    await page.getByRole('button', { name: 'Удалить' }).last().click()

    await expect(page.getByText('Удали меня').first()).not.toBeVisible()
    await expect(page.getByPlaceholder('Название задачи')).not.toBeVisible()
  })

})

test.describe('Contact filter', () => {

  test('shows only tasks for selected contact', async ({ page }) => {
    const contact = makeContact({ id: 'c1', full_name: 'Иван Иванов' })
    const task1   = makeTask({ id: 't1', title: 'Задача Иванова',      status: 'no_deadline', contact_id: 'c1'  })
    const task2   = makeTask({ id: 't2', title: 'Задача без контакта', status: 'no_deadline', contact_id: null })
    await setupAuthenticatedSession(page, [contact], [task1, task2])
    await page.goto('/tasks')

    await expect(page.getByText('Задача Иванова')).toBeVisible()
    await expect(page.getByText('Задача без контакта')).toBeVisible()

    await page.getByText('Все контакты').click()
    await page.getByText('Иван Иванов').last().click()

    await expect(page.getByText('Задача Иванова')).toBeVisible()
    await expect(page.getByText('Задача без контакта')).not.toBeVisible()
  })

  test('resetting filter back to "Все контакты" shows all tasks', async ({ page }) => {
    const contact = makeContact({ id: 'c1', full_name: 'Мария Петрова' })
    const task1   = makeTask({ id: 't1', title: 'Задача Петровой',     status: 'no_deadline', contact_id: 'c1'  })
    const task2   = makeTask({ id: 't2', title: 'Задача без контакта', status: 'no_deadline', contact_id: null })
    await setupAuthenticatedSession(page, [contact], [task1, task2])
    await page.goto('/tasks')

    await page.getByText('Все контакты').click()
    await page.getByText('Мария Петрова').last().click()
    await expect(page.getByText('Задача без контакта')).not.toBeVisible()

    await page.getByRole('button', { name: 'Задачи', exact: true }).click()

    await expect(page.getByText('Задача Петровой')).toBeVisible()
    await expect(page.getByText('Задача без контакта')).toBeVisible()
  })

})
