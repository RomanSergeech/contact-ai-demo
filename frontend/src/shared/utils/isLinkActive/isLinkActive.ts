export const isLinkActive = (pathname: string, href: string): boolean =>
  pathname === href || (href !== '/main' && pathname.startsWith(href))
