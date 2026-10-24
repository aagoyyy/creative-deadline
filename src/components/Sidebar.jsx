
import { useEffect, useState } from 'react'
import {
  Archive,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  UserRoundCheck,
  UsersRound,
  X,
  Zap,
} from 'lucide-react'

import './Sidebar.css'

const BASE_NAV_ITEMS = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Calendar', icon: CalendarDays },
  { name: 'Board', icon: FolderKanban },
]

function getNavItems(role) {
  const items = [...BASE_NAV_ITEMS]

  if (role === 'admin' || role === 'strategic') {
    items.push({
      name: 'Organic Calendar',
      icon: CalendarRange,
    })
  }

  if (role === 'admin') {
    items.push(
      { name: 'All Tasks', icon: List },
      { name: 'My Tasks', icon: UserRoundCheck },
      { name: 'Task Archive', icon: Archive },
    )
  }

  if (role === 'strategic') {
    items.push(
      { name: 'All Tasks', icon: List },
      { name: 'My Brief', icon: FileText },
    )
  }

  if (role === 'creative') {
    items.push({
      name: 'My Tasks',
      icon: UserRoundCheck,
    })
  }

  if (role === 'digital_marketing') {
    items.push({
      name: 'All Tasks',
      icon: List,
    })
  }

  return items
}

export default function Sidebar({
  activeNav,
  onNavigate,
  taskCount = 0,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [isMinimized, setIsMinimized] = useState(true)

  const role = String(currentUser?.role || 'member')
    .trim()
    .toLowerCase()

  const navItems = getNavItems(role)

  function closeMobileSidebar() {
    if (typeof onCloseMobile === 'function') {
      onCloseMobile()
    }
  }

  function handleNavigate(name) {
    if (typeof onNavigate === 'function') {
      onNavigate(name)
    }

    closeMobileSidebar()
  }

  // Tutup drawer dengan tombol Escape.
  useEffect(() => {
    if (!isMobileOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMobileSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen])

  // Kunci scroll halaman saat drawer terbuka.
  useEffect(() => {
    if (!isMobileOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileOpen])

  return (
    <>
      {/* Overlay untuk drawer mobile */}
      <button
        type="button"
        className={`sidebar-overlay ${
          isMobileOpen ? 'sidebar-overlay-visible' : ''
        }`}
        onClick={closeMobileSidebar}
        aria-label="Close navigation menu"
        aria-hidden={!isMobileOpen}
        tabIndex={isMobileOpen ? 0 : -1}
      />

      <aside
        id="creative-sidebar"
        className={`sidebar ${
          isMinimized ? 'sidebar-minimized' : ''
        } ${
          isMobileOpen ? 'mobile-sidebar-open' : ''
        }`}
        aria-label="Main sidebar"
      >
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <Zap size={21} fill="currentColor" />
          </div>

          <div className="brand-copy">
            <div className="brand-name">
              CREATIVE<span>.</span>
            </div>

            <div className="brand-caption">
              DEADLINE WORKSPACE
            </div>
          </div>

          {/* Toggle hanya untuk desktop */}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() =>
              setIsMinimized((previous) => !previous)
            }
            title={
              isMinimized
                ? 'Expand sidebar'
                : 'Minimize sidebar'
            }
            aria-label={
              isMinimized
                ? 'Expand sidebar'
                : 'Minimize sidebar'
            }
            aria-expanded={!isMinimized}
          >
            {isMinimized ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>

          {/* Tombol tutup drawer mobile */}
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={closeMobileSidebar}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Label navigasi */}
        <div className="nav-label">
          WORKSPACE
        </div>

        {/* Navigasi utama */}
        <nav
          className="main-nav"
          aria-label="Workspace navigation"
        >
          {navItems.map(({ name, icon: Icon }) => {
            const isActive = activeNav === name

            return (
              <button
                type="button"
                key={name}
                className={`nav-item ${
                  isActive ? 'active' : ''
                }`}
                onClick={() => handleNavigate(name)}
                title={isMinimized ? name : undefined}
                aria-label={isMinimized ? name : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} />

                <span className="nav-item-label">
                  {name}
                </span>

                {name === 'All Tasks' && (
                  <span className="nav-count">
                    {taskCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Navigasi bawah */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className={`nav-item ${
              activeNav === 'Team' ? 'active' : ''
            }`}
            onClick={() => handleNavigate('Team')}
            title={isMinimized ? 'Team' : undefined}
            aria-label={isMinimized ? 'Team' : undefined}
            aria-current={
              activeNav === 'Team' ? 'page' : undefined
            }
          >
            <UsersRound size={18} />

            <span className="nav-item-label">
              Team
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
