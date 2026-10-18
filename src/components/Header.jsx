
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CircleHelp,
  Search,
  CheckCheck,
  Check,
  ClipboardList,
  Clock,
} from 'lucide-react'

function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Baru saja'

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp)

  if (Number.isNaN(date.getTime())) return 'Baru saja'

  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Header({
  activeNav,
  search,
  onSearchChange,
  notifications = [],
  unreadCount = 0,
  notificationsLoading = false,
  notificationsError = '',
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenNotification,
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  async function handleMarkAll() {
    try {
      await onMarkAllAsRead?.()
    } catch (error) {
      console.error('Gagal menandai notifikasi:', error)
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
      console.error('Gagal membuka notifikasi:', error)
    }
  }

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="crumb-slash">/</span>
        <strong>{activeNav}</strong>
      </div>

      <div className="top-actions">
        <div className="command-search">
          <Search size={16} />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search tasks..."
          />

          <kbd>⌘ K</kbd>
        </div>

        <button
          type="button"
          className="icon-button"
          aria-label="Help"
        >
          <CircleHelp size={18} />
        </button>

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
            onClick={() =>
              setShowNotifications((visible) => !visible)
            }
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
                      ? `${unreadCount} belum dibaca`
                      : 'Semua sudah dibaca'}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notification-mark-all"
                    onClick={handleMarkAll}
                    title="Tandai semua sudah dibaca"
                  >
                    <CheckCheck size={15} />
                    <span>Read all</span>
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notificationsLoading ? (
                  <div className="notification-empty">
                    Memuat notifikasi...
                  </div>
                ) : notificationsError ? (
                  <div className="notification-empty notification-error">
                    Notifikasi gagal dimuat. Periksa koneksi dan
                    Firestore Rules.
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span className="notification-empty-icon">
                      <Bell size={22} />
                    </span>
                    <strong>Belum ada notifikasi</strong>
                    <p>
                      Aktivitas task terbaru akan muncul di sini.
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
                            'Ada aktivitas task terbaru.'}
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

        <div className="top-avatar">Y</div>
      </div>
    </header>
  )
}
