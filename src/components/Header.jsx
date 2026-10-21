
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Search,
  CheckCheck,
  Check,
  ClipboardList,
  Clock,
  LogOut,
  ChevronDown,
} from 'lucide-react'

function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Just now'

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp)

  if (Number.isNaN(date.getTime())) return 'Just now'

  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRole(role) {
  const roles = {
    admin: 'Admin',
    strategic: 'Strategic',
    creative: 'Creative',
    digital_marketing: 'Digital Marketing',
  }

  return roles[String(role || '').toLowerCase()] || role || 'Member'
}

const PAGE_INFO = {
  Overview: {
    title: 'Overview',
    description: 'A summary of creative team activity and performance.',
  },
  Calendar: {
    title: 'Creative Calendar',
    description: 'Track production schedules and task deadlines.',
  },
  Board: {
    title: 'Creative Board',
    description: 'Track tasks across the creative workflow.',
  },
  'All Tasks': {
    title: 'All Tasks',
    description: 'Manage all tasks, assignees, statuses, and deadlines.',
  },
  'My Tasks': {
    title: 'My Tasks',
    description: 'Track tasks assigned to you.',
  },
  'My Brief': {
    title: 'My Brief',
    description: 'Manage briefs before they enter the creative workflow.',
  },
  Team: {
    title: 'Team Management',
    description: 'Manage team members and workspace access.',
  },
}

export default function Header({
  activeNav,
  search,
  onSearchChange,
  currentUser,
  onLogout,
  notifications = [],
  unreadCount = 0,
  notificationsLoading = false,
  notificationsError = '',
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenNotification,
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  const notificationRef = useRef(null)
  const accountRef = useRef(null)

  const displayName =
    currentUser?.name || currentUser?.email || 'User'

  const displayEmail = currentUser?.email || ''
  const displayRole = formatRole(currentUser?.role)
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'U'

  const pageInfo = PAGE_INFO[activeNav] || {
    title: activeNav || 'Creative Deadline',
    description: 'Manage your creative team workflow and deadlines.',
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }

      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setShowAccountMenu(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowNotifications(false)
        setShowAccountMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleMarkAll() {
    try {
      await onMarkAllAsRead?.()
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification.read) {
        await onMarkAsRead?.(notification.id)
      }

      setShowNotifications(false)
      onOpenNotification?.(notification)
    } catch (error) {
      console.error('Failed to open notification:', error)
    }
  }

  function toggleNotifications() {
    setShowNotifications((visible) => !visible)
    setShowAccountMenu(false)
  }

  function toggleAccountMenu() {
    setShowAccountMenu((visible) => !visible)
    setShowNotifications(false)
  }

  return (
    <header className="topbar">
      <div className="header-page-info">
        <h1>{pageInfo.title}</h1>
        <p>{pageInfo.description}</p>
      </div>

      <div className="top-actions">
        <div className="command-search">
          <Search size={16} />

          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />
        </div>

        {/* Notifications */}
        <div
          className="notification-wrapper"
          ref={notificationRef}
        >
          <button
            type="button"
            className={`icon-button notification-button ${
              showNotifications ? 'is-active' : ''
            }`}
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-expanded={showNotifications}
            onClick={toggleNotifications}
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <section
              className="notification-panel"
              aria-label="Notifications"
            >
              <div className="notification-panel-header">
                <div>
                  <h3>Notifications</h3>
                  <p>
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : 'All caught up'}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notification-mark-all"
                    onClick={handleMarkAll}
                    title="Mark all as read"
                  >
                    <CheckCheck size={15} />
                    <span>Read all</span>
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notificationsLoading ? (
                  <div className="notification-empty">
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <div className="notification-empty notification-error">
                    Failed to load notifications. Check your connection
                    and Firestore Rules.
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span className="notification-empty-icon">
                      <Bell size={22} />
                    </span>
                    <strong>No notifications yet</strong>
                    <p>
                      Recent task activity will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={`notification-item ${
                        notification.read ? '' : 'unread'
                      }`}
                      onClick={() =>
                        handleNotificationClick(notification)
                      }
                    >
                      <span className="notification-item-icon">
                        <ClipboardList size={17} />
                      </span>

                      <span className="notification-item-content">
                        <strong>
                          {notification.taskTitle || 'Task'}
                        </strong>

                        <span className="notification-message">
                          {notification.message ||
                            'There is new task activity.'}
                        </span>

                        <span className="notification-time">
                          <Clock size={12} />
                          {formatNotificationTime(
                            notification.createdAt
                          )}
                        </span>
                      </span>

                      <span className="notification-item-indicator">
                        {notification.read ? (
                          <Check size={14} />
                        ) : (
                          <i />
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="notification-panel-footer">
                <span>Creative Deadline</span>
                <span>In-app notifications</span>
              </div>
            </section>
          )}
        </div>

        {/* Account menu */}
        <div className="account-wrapper" ref={accountRef}>
          <button
            type="button"
            className={`account-trigger ${
              showAccountMenu ? 'is-active' : ''
            }`}
            onClick={toggleAccountMenu}
            aria-label="Account menu"
            aria-expanded={showAccountMenu}
          >
            <span className="top-avatar">{avatarLetter}</span>

            <span className="account-trigger-copy">
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </span>

            <ChevronDown
              size={15}
              className={`account-chevron ${
                showAccountMenu ? 'rotated' : ''
              }`}
            />
          </button>

          {showAccountMenu && (
            <section className="account-menu">
              <div className="account-menu-header">
                <span className="account-menu-avatar">
                  {avatarLetter}
                </span>

                <div className="account-menu-identity">
                  <strong>{displayName}</strong>
                  {displayEmail && <span>{displayEmail}</span>}
                  <span className="account-role">
                    {displayRole}
                  </span>
                </div>
              </div>

              <div className="account-menu-divider" />

              <button
                type="button"
                className="account-menu-item"
                onClick={() => {
                  setShowAccountMenu(false)
                  onLogout?.()
                }}
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </section>
          )}
        </div>
      </div>
    </header>
  )
}
