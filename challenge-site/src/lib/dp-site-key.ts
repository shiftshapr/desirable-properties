/** Map pathname to site-modals API site key. */
export function siteKeyFromPathname(pathname: string | null | undefined): string {
  const path = String(pathname || '/').toLowerCase();
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/challenge')) return 'challenge';
  if (path.startsWith('/participate')) return 'participate';
  if (path.startsWith('/workgroups')) return 'workgroups';
  if (path.startsWith('/support')) return 'support';
  if (path.startsWith('/about')) return 'about';
  if (path === '/') return 'home';
  return 'all';
}
