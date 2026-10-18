
import { useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  UserRoundCheck,
  UsersRound,
  Zap,
} from 'lucide-react'

const BASE_NAV_ITEMS = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Calendar', icon: CalendarDays },
  { name: 'Board', icon: FolderKanban },
]


function getNavItems(role) {
  const items = [...BASE_NAV_ITEMS]

  if (role === 'admin') {
    items.push(
      { name: 'All Tasks', icon: List },
      { name: 'My Tasks', icon: UserRoundCheck },
    )
  }

  if (role === 'strategic') {
    items.push(
      { name: 'All Tasks', icon: List },
      { name: 'My Brief', icon: FileText },
    )
  }

  if (role === 'creative') {
    items.push({ name: 'My Tasks', icon: UserRoundCheck })
  }

  if (role === 'digital_marketing') {
    items.push({ name: 'All Tasks', icon: List })
  }

  return items
}


export default function Sidebar({
  activeNav,
  onNavigate,
  taskCount = 0,
  currentUser,
  onLogout,
}) {
  const [isMinimized, setIsMinimized] = useState(true)

  const displayName =
    currentUser?.name || currentUser?.email || 'User'

  const role = String(currentUser?.role || 'Member').toLowerCase()
  const navItems = getNavItems(role)

  return (
    <aside
      className={`sidebar ${
        isMinimized ? 'sidebar-minimized' : ''
      }`}
    >
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark">
          <Zap size={21} fill="currentColor" />
        </div>

        {!isMinimized && (
          <div className="brand-copy">
            <div className="brand-name">
              CREATIVE<span>.</span>
            </div>

            <div className="brand-caption">
              DEADLINE WORKSPACE
            </div>
          </div>
        )}

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsMinimized((previous) => !previous)}
          title={
            isMinimized ? 'Expand sidebar' : 'Minimize sidebar'
          }
          aria-label={
            isMinimized ? 'Expand sidebar' : 'Minimize sidebar'
          }
        >
          {isMinimized ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Workspace */}
      <button
        type="button"
        className="workspace-switch"
        title="Creative Team Workspace"
        onClick={() => {
          if (isMinimized) setIsMinimized(false)
        }}
      >
        <div className="workspace-avatar">C</div>

        {!isMinimized && (
          <>
            <div className="workspace-copy">
              <strong>Creative Team</strong>
              <span>Workspace</span>
            </div>

            <ChevronDown size={15} />
          </>
        )}
      </button>

      {!isMinimized && (
        <div className="nav-label">WORKSPACE</div>
      )}

      {/* Main navigation */}
      <nav className="main-nav">
        {navItems.map(({ name, icon: Icon }) => (
          <button
            type="button"
            key={name}
            className={`nav-item ${
              activeNav === name ? 'active' : ''
            }`}
            onClick={() => onNavigate(name)}
            title={isMinimized ? name : undefined}
          >
            <Icon size={18} />

            {!isMinimized && <span>{name}</span>}

            {!isMinimized && name === 'All Tasks' && (
              <span className="nav-count">{taskCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom navigation and profile */}
      <div className="sidebar-bottom">
        <button
          type="button"
          className={`nav-item ${
            activeNav === 'Team' ? 'active' : ''
          }`}
          onClick={() => onNavigate('Team')}
          title={isMinimized ? 'Team' : undefined}
        >
          <UsersRound size={18} />

          {!isMinimized && <span>Team</span>}
        </button>

        <div className="profile">
          <div
            className="profile-avatar"
            title={displayName}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          {!isMinimized && (
            <div className="profile-copy">
              <strong>{displayName}</strong>
              <span>{role}</span>
            </div>
          )}

          <button
            type="button"
            className="profile-logout"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
