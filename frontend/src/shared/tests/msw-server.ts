import { setupServer } from 'msw/node'

export { BASE } from './msw-base-url'
import { authHandlers }     from '../api/auth/auth.handlers'
import { contactHandlers }  from '../api/contacts/contacts.handlers'
import { taskHandlers }     from '../api/tasks/tasks.handlers'
import { settingsHandlers } from '../api/settings/settings.handlers'
import { adminHandlers }    from '../api/admin/admin.handlers'
import { aiHandlers }       from '../api/ai/ai.handlers'

export const server = setupServer(
  ...authHandlers,
  ...contactHandlers,
  ...taskHandlers,
  ...settingsHandlers,
  ...adminHandlers,
  ...aiHandlers,
)
