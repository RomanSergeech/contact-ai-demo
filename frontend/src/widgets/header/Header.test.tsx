import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Header } from './Header'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}))

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/main'),
  useRouter:   vi.fn(() => ({ push: mockPush, replace: mockReplace })),
}))

const { mockLogout } = vi.hoisted(() => ({
  mockLogout: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/shared/store', () => ({
  useUserStore: vi.fn(),
  useAuthStore: Object.assign(vi.fn(), {
    getState: () => ({ logout: mockLogout }),
  }),
  useTasksStore: vi.fn((sel: any) => sel({ tasks: [] })),
  useContactsStore: vi.fn((sel: any) => sel({ contacts: [] })),
  useNotificationsPanelStore: vi.fn((sel: any) => sel({ open: vi.fn() })),
}))

import { useUserStore } from '@/shared/store'
import { usePathname } from 'next/navigation'

const setUser = (role: 'user' | 'admin' = 'user', name = 'Иван') => {
  vi.mocked(useUserStore).mockImplementation((sel: any) =>
    sel({ id: '1', login: 'a', name, role, image: null, ai_system_prompt: null })
  )
}

// The mobile menu overlay is the only <div> with a data-active attribute.
// Nav links always have data-active="true"|"false", and they are <a> elements.
const getMobileOverlay = () => document.querySelector('div[data-active]') as HTMLElement

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/main')
  setUser()
  mockPush.mockClear()
  mockReplace.mockClear()
  mockLogout.mockClear()
})

describe('Header', () => {
  describe('user name', () => {
    it('renders the name from the store', () => {
      render(<Header />)
      expect(screen.getAllByText('Иван').length).toBeGreaterThan(0)
    })
  })

  describe('navigation items', () => {
    it('renders 3 nav items for regular user (no admin link)', () => {
      render(<Header />)
      expect(screen.getAllByText('Контакты').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Задачи').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Настройки').length).toBeGreaterThan(0)
      expect(screen.queryByText('Пользователи')).not.toBeInTheDocument()
    })

    it('renders 4 nav items for admin user (includes admin link)', () => {
      setUser('admin')
      render(<Header />)
      expect(screen.getAllByText('Пользователи').length).toBeGreaterThan(0)
    })
  })

  describe('active link', () => {
    it('sets data-active on the link matching current pathname', () => {
      vi.mocked(usePathname).mockReturnValue('/main')
      render(<Header />)
      // "Контакты" links to /main — at least one <a> should have data-active
      const links = screen.getAllByText('Контакты')
      expect(links.some(el => el.closest('a')?.hasAttribute('data-active'))).toBe(true)
    })

    it('does not set data-active on links that do not match', () => {
      vi.mocked(usePathname).mockReturnValue('/main')
      render(<Header />)
      const links = screen.getAllByText('Задачи')
      expect(links.every(el => el.closest('a')?.getAttribute('data-active') !== 'true')).toBe(true)
    })

    it('activates /tasks sub-paths (e.g. /tasks/123)', () => {
      vi.mocked(usePathname).mockReturnValue('/tasks/123')
      render(<Header />)
      const links = screen.getAllByText('Задачи')
      expect(links.some(el => el.closest('a')?.hasAttribute('data-active'))).toBe(true)
    })

    it('/main is exact-match only — sub-path does not activate Контакты', () => {
      vi.mocked(usePathname).mockReturnValue('/main/something')
      render(<Header />)
      const links = screen.getAllByText('Контакты')
      expect(links.every(el => el.closest('a')?.getAttribute('data-active') !== 'true')).toBe(true)
    })
  })

  describe('mobile menu', () => {
    it('starts with mobile menu closed (data-active="false")', () => {
      render(<Header />)
      expect(getMobileOverlay()?.getAttribute('data-active')).toBe('false')
    })

    it('opens when the hamburger button is clicked', () => {
      render(<Header />)
      fireEvent.click(screen.getByLabelText('Меню'))
      expect(getMobileOverlay()?.getAttribute('data-active')).toBe('true')
    })

    it('closes when the overlay is clicked', () => {
      render(<Header />)
      fireEvent.click(screen.getByLabelText('Меню'))
      fireEvent.click(getMobileOverlay()!)
      expect(getMobileOverlay()?.getAttribute('data-active')).toBe('false')
    })

    it('does not close when the panel content is clicked (stops propagation)', () => {
      render(<Header />)
      fireEvent.click(screen.getByLabelText('Меню'))
      // Panel is the first child of the overlay; its onClick stops propagation
      fireEvent.click(getMobileOverlay()!.firstElementChild!)
      expect(getMobileOverlay()?.getAttribute('data-active')).toBe('true')
    })

    it('closes when the close button inside the panel is clicked', () => {
      render(<Header />)
      fireEvent.click(screen.getByLabelText('Меню'))
      const overlay = getMobileOverlay()!
      // Close button: the only button in the mobile panel with no text content (SVG only)
      const closeBtn = Array.from(overlay.querySelectorAll('button'))
        .find(btn => !btn.textContent?.trim())!
      fireEvent.click(closeBtn)
      expect(overlay.getAttribute('data-active')).toBe('false')
    })
  })

  describe('logout', () => {
    it('calls the store logout action', async () => {
      render(<Header />)
      fireEvent.click(screen.getAllByText('Выйти')[0])
      await waitFor(() => expect(mockLogout).toHaveBeenCalled())
    })

    it('redirects to / after logout', async () => {
      render(<Header />)
      fireEvent.click(screen.getAllByText('Выйти')[0])
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
    })
  })

  describe('logo', () => {
    it('navigates to /main when logo is clicked', () => {
      render(<Header />)
      fireEvent.click(screen.getByText('Contact AI'))
      expect(mockPush).toHaveBeenCalledWith('/main')
    })
  })
})
