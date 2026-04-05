import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="app-layout">
      <nav className="tab-bar">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ 'data-status': 'active' } as React.AnchorHTMLAttributes<HTMLAnchorElement>}
        >
          평면도
        </Link>
        <Link
          to="/birdseye"
          activeProps={{ 'data-status': 'active' } as React.AnchorHTMLAttributes<HTMLAnchorElement>}
        >
          조감도
        </Link>
        <Link
          to="/walkthrough"
          activeProps={{ 'data-status': 'active' } as React.AnchorHTMLAttributes<HTMLAnchorElement>}
        >
          워크스루
        </Link>
      </nav>
      <div className="canvas-container">
        <Outlet />
      </div>
    </div>
  )
}
