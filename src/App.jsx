
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  ExternalLink,
  Flag,
  Pencil,
  X,
} from 'lucide-react'

import './App.css'
import './index.css'

import Sidebar from './components/Sidebar'
import Header from './components/Header'
import TaskModal from './components/TaskModal'

import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Board from './pages/Board'
import Tasks from './pages/Tasks'
import MyTasks from './pages/MyTasks'
import Team from './pages/Team'
import MyBrief from './pages/MyBrief'

import { useTasks } from './hooks/useTasks'
import { formatDate } from './utils/dateUtils'
import { useNotifications } from './hooks/useNotifications'

import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore'

import { auth, db } from './firebase'
import Login from './components/Login'

const NAV_ITEMS = [
  'Overview',
  'Calendar',
  'Board',
  'All Tasks',
  'My Tasks',
  'My Brief',
  'Team',
]

const STATUS_OPTIONS = [
  'NOT STARTED',
  'START',
  'APPROVAL 1',
  'APPROVAL 2',
  'REVISION',
  'UPLOAD',
  'DONE',
]

const PRIORITY_OPTIONS = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]

const PRIORITY_ORDER = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

function normalizePriority(priority) {
  const value = String(priority || 'MEDIUM').toUpperCase()

  return Object.prototype.hasOwnProperty.call(
    PRIORITY_ORDER,
    value
  )
    ? value
    : 'MEDIUM'
}

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[
      normalizePriority(a.priority)
    ]
    const priorityB = PRIORITY_ORDER[
      normalizePriority(b.priority)
    ]

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const deadlineA = String(a.deadline || '9999-12-31')
    const deadlineB = String(b.deadline || '9999-12-31')

    if (deadlineA !== deadlineB) {
      return deadlineA.localeCompare(deadlineB)
    }

    return String(a.title || '').localeCompare(
      String(b.title || '')
    )
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'START':
      return 'start'
    case 'APPROVAL 1':
    case 'APPROVAL 2':
      return 'approval'
    case 'UPLOAD':
      return 'upload'
    case 'DONE':
      return 'done'
    case 'REVISION':
      return 'revision'
    default:
      return 'not-started'
  }
}

function formatDeadline(deadline, monthDate) {
  if (
    deadline === null ||
    deadline === undefined ||
    deadline === ''
  ) {
    return 'Not set'
  }

  if (typeof deadline === 'number') {
    return `${monthDate.toLocaleDateString('id-ID', {
      month: 'short',
    })} ${deadline}`
  }

  return formatDate(deadline)
}

function LoadingScreen({ message }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#101114',
        color: '#f5f5f5',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {message}
    </main>
  )
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [authError, setAuthError] = useState('')

  const [creatives, setCreatives] = useState([])
  const [creativesLoading, setCreativesLoading] = useState(true)
  const [creativesError, setCreativesError] = useState('')

  const {
    tasks,
    addTask,
    editTask,
    saveDraft,
    assignDraft,
    changeTaskStatus,
    moveTaskDeadline,
    removeTask,
  } = useTasks()

  const {
    notifications,
    notificationsLoading,
    notificationsError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    notifyActiveMembers,
  } = useNotifications(currentUser)

  const [activeNav, setActiveNav] = useState('Calendar')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [search, setSearch] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const [monthDate, setMonthDate] = useState(
    () => new Date(2026, 9, 1)
  )

  // Ambil PIC aktif dari Firestore.
  useEffect(() => {
    if (!currentUser) {
      setCreatives([])
      setCreativesLoading(false)
      return
    }

    setCreativesLoading(true)
    setCreativesError('')

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const activeCreatives = snapshot.docs
          .map((document) => ({
            uid: document.id,
            ...document.data(),
          }))
          .filter((user) => {
            const userRole = String(
              user.role || ''
            ).toLowerCase()

            return (
              ['creative', 'admin'].includes(userRole) &&
              user.active === true
            )
          })
          .sort((a, b) =>
            String(a.name || '').localeCompare(
              String(b.name || '')
            )
          )

        setCreatives(activeCreatives)
        setCreativesLoading(false)
        setCreativesError('')
      },
      (error) => {
        console.error(
          'Gagal mengambil daftar creative:',
          error
        )

        setCreativesError(
          'Daftar PIC gagal dimuat. Periksa koneksi dan Firestore Rules.'
        )

        setCreativesLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser])

  // Autentikasi dan profil user.
  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!active) return

        setAuthLoading(true)
        setAuthError('')
        setCurrentUser(null)

        if (!firebaseUser) {
          setAuthLoading(false)
          return
        }

        try {
          const userRef = doc(
            db,
            'users',
            firebaseUser.uid
          )

          const userSnapshot = await getDoc(userRef)

          if (!active) return

          if (!userSnapshot.exists()) {
            setAuthError(
              'Profil akun belum terdaftar di Firestore. Hubungi admin.'
            )
            setAuthLoading(false)
            return
          }

          const profile = userSnapshot.data()

          if (profile.active === false) {
            await signOut(auth)

            if (active) {
              setAuthError(
                'Akun ini sedang dinonaktifkan.'
              )
              setAuthLoading(false)
            }

            return
          }

          const userRole = String(
            profile.role || ''
          ).toLowerCase()

          if (
            ![
              'admin',
              'strategic',
              'creative',
              'digital_marketing',
            ].includes(userRole)
          ) {
            setAuthError(
              'Role akun tidak valid. Periksa profil Firestore.'
            )
            setAuthLoading(false)
            return
          }

          setCurrentUser({
            uid: firebaseUser.uid,
            email:
              firebaseUser.email ||
              profile.email ||
              '',
            name:
              profile.name ||
              firebaseUser.email ||
              'User',
            role: userRole,
          })

          setAuthLoading(false)
        } catch (error) {
          console.error(
            'Gagal mengambil profil:',
            error
          )

          if (active) {
            setAuthError(
              'Gagal mengambil profil dari Firestore. Periksa koneksi dan aturan database.'
            )
            setAuthLoading(false)
          }
        }
      }
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const role = currentUser?.role || ''

  const CAN_MANAGE_TASKS = [
    'admin',
    'strategic',
  ].includes(role)

  const canDeleteTasks = [
    'admin',
    'strategic',
  ].includes(role)

  const canUseMyBrief = role === 'strategic'

  async function handleLogout() {
    try {
      await signOut(auth)

      setShowDetail(false)
      setShowNewTask(false)
      setShowEditTask(false)
      setSelectedTaskId(null)
    } catch (error) {
      console.error('Logout gagal:', error)
      window.alert('Logout gagal. Silakan coba lagi.')
    }
  }

  const selectedTask =
    tasks.find(
      (task) =>
        String(task.id) === String(selectedTaskId)
    ) || null

  // Draft tidak boleh masuk ke halaman task aktif.
  // Task lama tanpa workflowState tetap dianggap aktif.
  const activeTasks = tasks.filter(
    (task) => task.workflowState !== 'DRAFT'
  )

  // Draft hanya terlihat oleh Strategic pembuatnya.
  const myDrafts = tasks.filter(
    (task) =>
      role === 'strategic' &&
      task.workflowState === 'DRAFT' &&
      task.createdByUid === currentUser?.uid
  )

  const normalizedSearch = search.trim().toLowerCase()

  // Semua halaman task aktif menerima daftar yang sama:
  // prioritas tertinggi dahulu, lalu deadline terdekat.
  const filteredTasks = sortTasksByPriority(
    activeTasks.filter((task) => {
      const searchableText = [
        task.title,
        task.code,
        task.project,
        task.pic,
        task.type,
        task.status,
        normalizePriority(task.priority),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        searchableText.includes(normalizedSearch)

      if (role === 'creative') {
        const matchesAssignee =
          task.picUid === currentUser?.uid ||
          String(task.pic || '').toLowerCase() ===
            String(currentUser?.name || '').toLowerCase()

        return matchesSearch && matchesAssignee
      }

      return matchesSearch
    })
  )

  function handleNavigate(page) {
    if (!NAV_ITEMS.includes(page)) return

    if (page === 'My Brief' && !canUseMyBrief) {
      return
    }

    setActiveNav(page)
    setSearch('')
    setShowDetail(false)
    setShowNewTask(false)
    setShowEditTask(false)

    if (
      page === 'Team' ||
      page === 'My Brief'
    ) {
      setSelectedTaskId(null)
    }
  }

  function handleSelectTask(task) {
    if (!task || task.workflowState === 'DRAFT') return

    setSelectedTaskId(task.id)
    setShowDetail(true)
  }

  function handleSelectBrief(task) {
    if (!task || task.workflowState === 'DRAFT') return

    setSelectedTaskId(task.id)
    setShowDetail(true)
  }

  function handleChangeMonth(amount) {
    setMonthDate((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1
      )
    )
  }

  function handleToday() {
    const today = new Date()

    setMonthDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    )
  }

  async function sendNotificationSafely(payload) {
    try {
      await notifyActiveMembers(payload)
    } catch (error) {
      console.error(
        'Task berhasil diproses, tetapi notifikasi gagal dikirim:',
        error
      )
    }
  }

  // Membuat task yang langsung masuk workflow aktif.
  async function handleCreateTask(taskData) {
    if (!CAN_MANAGE_TASKS) return

    try {
      const newTask = await addTask({
        ...taskData,
        priority: normalizePriority(taskData.priority),
        workflowState: 'ASSIGNED',
        createdByUid: currentUser.uid,
      })

      await sendNotificationSafely({
        taskId: newTask.id,
        taskTitle: newTask.title,
        type: 'task_created',
        message: `${currentUser.name} membuat task baru`,
      })

      setSelectedTaskId(newTask.id)
      setShowNewTask(false)
      setShowDetail(true)
    } catch (error) {
      console.error('Gagal membuat task:', error)

      window.alert(
        error.message || 'Gagal membuat task.'
      )
    }
  }

  async function handleUpdateTask(taskId, changes) {
    if (!CAN_MANAGE_TASKS) return

    const task = activeTasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) return

    try {
      await editTask(taskId, {
        ...changes,
        ...(changes.priority !== undefined
          ? { priority: normalizePriority(changes.priority) }
          : {}),
      })

      await sendNotificationSafely({
        taskId,
        taskTitle: changes.title || task.title || 'Task',
        type: 'task_updated',
        message: `${currentUser.name} mengedit detail task`,
      })

      setSelectedTaskId(taskId)
      setShowEditTask(false)
      setShowDetail(true)
    } catch (error) {
      console.error('Gagal mengedit task:', error)

      window.alert(
        error.message || 'Gagal mengedit task.'
      )
    }
  }

  // Simpan draft baru khusus Strategic.
  async function handleSaveDraft(draftData) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        'Hanya Strategic yang dapat membuat brief.'
      )
    }

    try {
      await saveDraft({
        ...draftData,
        priority: normalizePriority(draftData.priority),
        workflowState: 'DRAFT',
        createdByUid: currentUser.uid,
      })
    } catch (error) {
      console.error('Gagal menyimpan draft:', error)
      throw error
    }
  }

  // Edit hanya draft milik Strategic yang sedang login.
  async function handleUpdateDraft(draftId, changes) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        'Kamu tidak memiliki akses untuk mengedit draft.'
      )
    }

    const draft = tasks.find(
      (task) =>
        String(task.id) === String(draftId) &&
        task.workflowState === 'DRAFT' &&
        task.createdByUid === currentUser.uid
    )

    if (!draft) {
      throw new Error(
        'Draft tidak ditemukan atau bukan milik akunmu.'
      )
    }

    try {
      await editTask(draftId, {
        ...changes,
        priority: normalizePriority(
          changes.priority ?? draft.priority
        ),
        workflowState: 'DRAFT',
        createdByUid: currentUser.uid,
      })
    } catch (error) {
      console.error('Gagal mengedit draft:', error)
      throw error
    }
  }

  // Publish draft menjadi task aktif.
  async function handleAssignDraft(draftId, taskData) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        'Hanya Strategic yang dapat melakukan assign.'
      )
    }

    const draft = tasks.find(
      (task) =>
        String(task.id) === String(draftId) &&
        task.workflowState === 'DRAFT' &&
        task.createdByUid === currentUser.uid
    )

    if (!draft) {
      throw new Error(
        'Draft tidak ditemukan atau bukan milik akunmu.'
      )
    }

    const assignmentData = {
      ...draft,
      ...taskData,
      priority: normalizePriority(
        taskData?.priority ?? draft.priority
      ),
      status: taskData?.status || 'NOT STARTED',
      progress: taskData?.progress ?? 0,
      workflowState: 'ASSIGNED',
      createdByUid: currentUser.uid,
    }

    try {
      await assignDraft(draftId, assignmentData)

      await sendNotificationSafely({
        taskId: draftId,
        taskTitle:
          assignmentData.title || draft.title || 'Task',
        type: 'task_created',
        message: `${currentUser.name} meng-assign task baru`,
      })

      setSelectedTaskId(draftId)
      setActiveNav('Calendar')
      setShowDetail(true)
    } catch (error) {
      console.error('Gagal assign draft:', error)

      window.alert(
        error.message || 'Gagal assign task.'
      )
    }
  }

  // Hapus draft milik pembuatnya saja.
  async function handleDeleteDraft(draftId) {
    if (!canUseMyBrief || !currentUser?.uid) {
      window.alert(
        'Kamu tidak memiliki akses untuk menghapus draft.'
      )
      return
    }

    const draft = tasks.find(
      (task) =>
        String(task.id) === String(draftId) &&
        task.workflowState === 'DRAFT' &&
        task.createdByUid === currentUser.uid
    )

    if (!draft) {
      window.alert(
        'Draft tidak ditemukan atau bukan milik akunmu.'
      )
      return
    }

    const confirmed = window.confirm(
      `Hapus draft "${draft.title}"?`
    )

    if (!confirmed) return

    try {
      await removeTask(draftId)
    } catch (error) {
      console.error('Gagal menghapus draft:', error)

      window.alert(
        error.message || 'Gagal menghapus draft.'
      )
    }
  }

  async function handleStatusChange(taskId, status) {
    const task = activeTasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task || !STATUS_OPTIONS.includes(status)) {
      return
    }

    if (task.status === status) return

    if (role === 'creative') {
      const isAssignedToUser =
        String(task.picUid || '') ===
          String(currentUser.uid) ||
        (!task.picUid && task.pic === currentUser.name)

      if (!isAssignedToUser) return
    } else if (!CAN_MANAGE_TASKS) {
      return
    }

    try {
      await changeTaskStatus(taskId, status)

      await sendNotificationSafely({
        taskId,
        taskTitle: task.title,
        type: 'status_changed',
        message: `${currentUser.name} mengubah status menjadi ${status}`,
      })

      setSelectedTaskId(taskId)
    } catch (error) {
      console.error(
        'Gagal mengubah status task:',
        error
      )

      window.alert(
        error.message || 'Gagal mengubah status task.'
      )
    }
  }

  async function handleDeadlineChange(taskId, deadline) {
    if (!CAN_MANAGE_TASKS) return

    const task = activeTasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task || task.deadline === deadline) return

    try {
      await moveTaskDeadline(taskId, deadline)

      await sendNotificationSafely({
        taskId,
        taskTitle: task.title,
        type: 'deadline_changed',
        message: `${currentUser.name} mengubah deadline menjadi ${deadline}`,
      })
    } catch (error) {
      console.error(
        'Gagal mengubah deadline:',
        error
      )

      window.alert(
        error.message || 'Gagal mengubah deadline.'
      )
    }
  }

  async function handleDeleteTask(taskId) {
    if (!canDeleteTasks) return

    const task = activeTasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) return

    const confirmed = window.confirm(
      `Hapus task "${task.title}"?`
    )

    if (!confirmed) return

    try {
      await removeTask(taskId)

      await sendNotificationSafely({
        taskId,
        taskTitle: task.title,
        type: 'task_deleted',
        message: `${currentUser.name} menghapus task`,
      })

      setShowDetail(false)
      setShowEditTask(false)
      setSelectedTaskId(null)
    } catch (error) {
      console.error('Gagal menghapus task:', error)

      window.alert(
        error.message || 'Gagal menghapus task.'
      )
    }
  }

  if (authLoading) {
    return (
      <LoadingScreen message="Memeriksa akun..." />
    )
  }

  if (!auth.currentUser) {
    return <Login />
  }

  if (!currentUser) {
    return (
      <LoadingScreen
        message={
          authError || 'Profil akun belum tersedia.'
        }
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeNav={activeNav}
        onNavigate={handleNavigate}
        taskCount={activeTasks.length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-area">
        <Header
          activeNav={activeNav}
          search={search}
          onSearchChange={setSearch}
          notifications={notifications}
          unreadCount={unreadCount}
          notificationsLoading={notificationsLoading}
          notificationsError={notificationsError}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onOpenNotification={(notification) => {
            const task = activeTasks.find(
              (item) =>
                String(item.id) ===
                String(notification.taskId)
            )

            if (task) {
              setSelectedTaskId(task.id)
              setShowDetail(true)
            }
          }}
        />

        <div className="workspace-layout">
          <div className="workspace-main">
            {activeNav === 'Overview' && (
              <Dashboard
                tasks={filteredTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onNavigate={handleNavigate}
                onAddTask={
                  CAN_MANAGE_TASKS
                    ? () => setShowNewTask(true)
                    : undefined
                }
              />
            )}

            {activeNav === 'Calendar' && (
              <Calendar
                tasks={filteredTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                year={monthDate.getFullYear()}
                month={monthDate.getMonth()}
                onChangeMonth={handleChangeMonth}
                onToday={handleToday}
                onMoveDeadline={handleDeadlineChange}
                onAddTask={
                  CAN_MANAGE_TASKS
                    ? () => setShowNewTask(true)
                    : undefined
                }
              />
            )}

            {activeNav === 'Board' && (
              <Board
                tasks={filteredTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onChangeStatus={handleStatusChange}
                onAddTask={
                  CAN_MANAGE_TASKS
                    ? () => setShowNewTask(true)
                    : undefined
                }
              />
            )}

            {activeNav === 'All Tasks' && (
              <Tasks
                tasks={filteredTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                search={search}
                onSearchChange={setSearch}
              />
            )}

            {activeNav === 'My Tasks' && (
              <MyTasks
                tasks={filteredTasks}
                currentUser={currentUser.name}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
              />
            )}

            {activeNav === 'My Brief' &&
              canUseMyBrief && (
                <MyBrief
                  drafts={myDrafts}
                  currentUser={currentUser}
                  creatives={creatives}
                  creativesLoading={creativesLoading}
                  creativesError={creativesError}
                  onSaveDraft={handleSaveDraft}
                  onUpdateDraft={handleUpdateDraft}
                  onAssignDraft={handleAssignDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onSelectTask={handleSelectBrief}
                />
              )}

            {activeNav === 'Team' && (
              <Team currentUser={currentUser} />
            )}

            <footer className="page-footer">
              <span>
                CREATIVE DEADLINE <b>·</b> WORKSPACE
              </span>

              <span>
                <i className="live-dot" />
                FIREBASE WORKSPACE
              </span>
            </footer>
          </div>

          {showDetail &&
            selectedTask &&
            selectedTask.workflowState !== 'DRAFT' && (
              <aside className="task-detail-sidebar">
                <div className="detail-card">
                  <div className="section-title-row">
                    <div>
                      <div className="eyebrow">
                        TASK OVERVIEW
                      </div>
                      <h3>Task details</h3>
                    </div>

                    <button
                      type="button"
                      className="icon-button small"
                      onClick={() => setShowDetail(false)}
                      aria-label="Close task details"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="detail-code">
                    {selectedTask.code || 'NEW TASK'}

                    <span
                      className={`status-pill ${getStatusClass(
                        selectedTask.status
                      )}`}
                    >
                      {selectedTask.status || 'NOT STARTED'}
                    </span>
                  </div>

                  <h4>{selectedTask.title}</h4>

                  <p className="detail-description">
                    {selectedTask.project || 'No project'}
                    {' · '}
                    {selectedTask.type || 'Task'}
                  </p>

                  <div className="detail-priority-row">
                    <span className="detail-field-label">
                      PRIORITY
                    </span>

                    <span
                      className={`priority-badge priority-${normalizePriority(
                        selectedTask.priority
                      ).toLowerCase()}`}
                    >
                      <Flag size={13} />
                      {normalizePriority(selectedTask.priority)}
                    </span>
                  </div>

                  <div className="detail-meta">
                    <div>
                      <span>ASSIGNEE</span>

                      <strong>
                        <i className="assignee-avatar">
                          {(selectedTask.pic || '?').charAt(0)}
                        </i>
                        {selectedTask.pic || 'Unassigned'}
                      </strong>
                    </div>

                    <div>
                      <span>DEADLINE</span>

                      <strong>
                        <CalendarDays size={15} />
                        {formatDeadline(
                          selectedTask.deadline,
                          monthDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="progress-heading">
                    <span>Production progress</span>
                    <strong>
                      {selectedTask.status === 'DONE'
                        ? 100
                        : Math.min(
                            100,
                            Math.max(0, selectedTask.progress ?? 0)
                          )}
                      %
                    </strong>
                  </div>

                  <div className="progress-track">
                    <span
                      style={{
                        width: `${
                          selectedTask.status === 'DONE'
                            ? 100
                            : Math.min(
                                100,
                                Math.max(0, selectedTask.progress ?? 0)
                              )
                        }%`,
                      }}
                    />
                  </div>

                  <label className="detail-field-label">
                    Update status
                  </label>

                  <div className="detail-status-options">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        type="button"
                        key={status}
                        className={
                          selectedTask.status === status
                            ? 'detail-status-active'
                            : ''
                        }
                        disabled={
                          role === 'creative' &&
                          !(
                            selectedTask.picUid === currentUser.uid ||
                            String(selectedTask.pic || '').toLowerCase() ===
                              currentUser.name.toLowerCase()
                          )
                        }
                        onClick={() =>
                          handleStatusChange(
                            selectedTask.id,
                            status
                          )
                        }
                      >
                        {selectedTask.status === status && (
                          <Check size={13} />
                        )}
                        {status}
                      </button>
                    ))}
                  </div>

                  {selectedTask.link && (
                    <div className="detail-link-section">
                      <span className="detail-field-label">
                        TASK RESOURCE
                      </span>

                      <a
                        className="detail-link-card"
                        href={selectedTask.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="detail-link-icon">
                          <ExternalLink size={18} />
                        </span>

                        <span className="detail-link-content">
                          <strong>Open task link</strong>
                          <small>
                            View brief, reference, or task files
                          </small>
                        </span>

                        <ExternalLink
                          className="detail-link-arrow"
                          size={15}
                        />
                      </a>
                    </div>
                  )}

                  {selectedTask.notes && (
                    <div className="detail-notes">
                      <span className="detail-field-label">
                        DESCRIPTION & NOTES
                      </span>

                      <div className="detail-notes-content">
                        {selectedTask.notes}
                      </div>
                    </div>
                  )}

                  <div className="detail-actions">
                    {CAN_MANAGE_TASKS && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => setShowEditTask(true)}
                      >
                        <Pencil size={15} />
                        Edit task
                      </button>
                    )}

                    {canDeleteTasks && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          handleDeleteTask(selectedTask.id)
                        }
                      >
                        Delete task
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            )}
        </div>
      </main>

      {showNewTask && CAN_MANAGE_TASKS && (
        <TaskModal
          open={showNewTask}
          onClose={() => setShowNewTask(false)}
          onCreate={handleCreateTask}
          creatives={creatives}
          creativesLoading={creativesLoading}
          creativesError={creativesError}
        />
      )}

      {showEditTask &&
        selectedTask &&
        selectedTask.workflowState !== 'DRAFT' &&
        CAN_MANAGE_TASKS && (
          <TaskModal
            open={showEditTask}
            task={selectedTask}
            onClose={() => setShowEditTask(false)}
            onUpdate={handleUpdateTask}
            creatives={creatives}
            creativesLoading={creativesLoading}
            creativesError={creativesError}
          />
        )}
    </div>
  )
}

export default App
