
import { useCallback, useEffect, useState } from 'react'
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
import './pages/Dashboard.css'
import './components/StatCard.css'
import './pages/Tasks.css'
import './pages/MyBrief.css'
import OrganicCalendar from './pages/OrganicCalendar'
import TaskArchive from './pages/TaskArchive'
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

import ConfirmModal from './components/ConfirmModal'
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
import Toast from './components/Toast'

const NAV_ITEMS = [
  'Overview',
  'Calendar',
  'Organic Calendar',
  'Board',
  'All Tasks',
  'My Tasks',
  'My Brief',
  'Task Archive',
  'Team',
]

const STATUS_OPTIONS = [
  'NOT STARTED',
  'START',
  'APPROVAL 1',
  'APPROVAL 2',
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
    const priorityA =
      PRIORITY_ORDER[normalizePriority(a.priority)]

    const priorityB =
      PRIORITY_ORDER[normalizePriority(b.priority)]

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
    case 'DONE':
      return 'done'
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
    return `${monthDate.toLocaleDateString('en-US', {
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
  const [newBriefRequest, setNewBriefRequest] = useState(0)
  const [toast, setToast] = useState({
    message: '',
    type: 'error',
  })

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])

  const closeToast = useCallback(() => {
    setToast({ message: '', type: 'error' })
  }, [])

  const [creatives, setCreatives] = useState([])
  const [creativesLoading, setCreativesLoading] = useState(true)
  const [creativesError, setCreativesError] = useState('')

  const [resultLinkInput, setResultLinkInput] = useState('')
  const [savingResultLink, setSavingResultLink] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

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

// Mobile sidebar drawer
const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [draftToEdit, setDraftToEdit] = useState(null)

  const [monthDate, setMonthDate] = useState(
    () => new Date(2026, 9, 1)
  )

  // Fetch active creative team members from Firestore.
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
          'Failed to fetch creative team members:',
          error
        )

        setCreativesError(
          'Failed to load assignees. Check your connection and Firestore Rules.'
        )

        setCreativesLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser])

  // Authenticate the user and load their profile.
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
              'User profile is not registered in Firestore. Please contact an administrator.'
            )
            setAuthLoading(false)
            return
          }

          const profile = userSnapshot.data()

          if (profile.active === false) {
            await signOut(auth)

            if (active) {
              setAuthError(
                'This account has been deactivated.'
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
              'Invalid account role. Please check the Firestore profile.'
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
            'Failed to load user profile:',
            error
          )

          if (active) {
            setAuthError(
              'Failed to load user profile from Firestore. Check your connection and database rules.'
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
      console.error('Logout failed:', error)
      showToast('Logout failed. Please try again.', 'error')
    }
  }

  const selectedTask =
    tasks.find(
      (task) =>
        String(task.id) === String(selectedTaskId)
    ) || null

  useEffect(() => {
    setResultLinkInput(selectedTask?.resultLink || '')
  }, [selectedTask?.id, selectedTask?.resultLink])

  // Drafts must not appear on active task pages.
  // Legacy tasks without workflowState are still considered active.
  const activeTasks = tasks.filter(
    (task) => task.workflowState !== 'DRAFT'
  )

  // Drafts are only visible to the Strategic user who created them.
  const myDrafts = tasks.filter(
    (task) =>
      role === 'strategic' &&
      task.workflowState === 'DRAFT' &&
      task.createdByUid === currentUser?.uid
  )

  const normalizedSearch = search.trim().toLowerCase()

  // Sort active tasks by priority, then by the nearest deadline.
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

      return matchesSearch
    })
  )

  function handleNavigate(page) {
    if (!NAV_ITEMS.includes(page)) return
    if (page === 'Task Archive' && role !== 'admin') {
      return
    }
    if (page === 'My Brief' && !canUseMyBrief) {
      return
    }
    if (
      page === 'Organic Calendar' &&
      !['admin', 'strategic'].includes(role)
    ) {
      return
    }
    setActiveNav(page)
    setSearch('')
    setShowDetail(false)
    setShowNewTask(false)
    setShowEditTask(false)
    setDraftToEdit(null)

    if (
      page === 'Team' ||
      page === 'My Brief'
    ) {
      setSelectedTaskId(null)
    }
  }

  function handleSelectTask(task) {
    if (!task) return
  
    // DRAFT: hanya pembuatnya yang boleh edit
    if (task.workflowState === 'DRAFT') {
      if (
        currentUser?.role !== 'strategic' ||
        task.createdByUid !== currentUser?.uid
      ) {
        return
      }
  
      setSelectedTaskId(null)
      setShowDetail(false)
      setShowEditTask(false)
      setShowNewTask(false)
  
      setDraftToEdit({
        id: task.id,
        requestId: Date.now(),
      })
  
      return
    }
  
    // ASSIGNED: bersihkan request edit draft sebelumnya
    setDraftToEdit(null)
  
    setShowEditTask(false)
    setShowNewTask(false)
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
        'Task processed successfully, but the notification failed to send:',
        error
      )
    }
  }

  // Create a task that immediately enters the active workflow.
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
        message: `${currentUser.name} created a new task`,
      })

      setSelectedTaskId(newTask.id)
      setShowNewTask(false)
      setShowDetail(true)

      showToast('Task created successfully!', 'success')
    } catch (error) {
      console.error('Failed to create task:', error)

      showToast(
        error.message || 'Failed to create task.',
        'error'
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
        message: `${currentUser.name} updated the task details`,
      })

      setSelectedTaskId(taskId)
      setShowEditTask(false)
      setShowDetail(true)

      showToast('Task updated successfully!', 'success')
    } catch (error) {
      console.error('Failed to update task:', error)

      showToast(
        error.message || 'Failed to update task.',
        'error'
      )
    }
  }

  // Save a new draft. This action is restricted to Strategic users.
  async function handleSaveDraft(draftData) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        'Only Strategic users can create briefs.'
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
      console.error('Failed to save draft:', error)
      throw error
    }
  }

  // Edit only drafts owned by the currently signed-in Strategic user.
  async function handleUpdateDraft(draftId, changes) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        "You don't have permission to edit this draft."
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
        "Draft not found or you don't have permission to access it."
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
      console.error('Failed to update draft:', error)
      throw error
    }
  }

  // Publish a draft as an active task.
  async function handleAssignDraft(draftId, taskData) {
    if (!canUseMyBrief || !currentUser?.uid) {
      throw new Error(
        'Only Strategic users can assign tasks.'
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
        "Draft not found or you don't have permission to access it."
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
        message: `${currentUser.name} assigned a new task`,
      })

      setSelectedTaskId(draftId)
      setActiveNav('Calendar')
      setShowDetail(true)

      showToast(
        'Draft successfully assigned as a task!',
        'success'
      )
    } catch (error) {
      console.error('Failed to assign draft:', error)

      showToast(
        error.message || 'Failed to assign task.',
        'error'
      )
    }
  }

  async function handleConfirmAction() {
    if (!confirmModal || confirmLoading) return

    setConfirmLoading(true)

    try {
      await confirmModal.onConfirm()
    } catch (error) {
      console.error(
        'Failed to execute confirmation action:',
        error
      )

      showToast(
        error.message || 'The action failed. Please try again.',
        'error'
      )
    } finally {
      setConfirmLoading(false)
      setConfirmModal(null)
    }
  }


  async function handleDeleteDraft(draftId) {
    if (!canUseMyBrief || !currentUser?.uid) {
      showToast(
        "You don't have permission to delete this draft.",
        'error'
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
      showToast(
        "Draft not found or you don't have permission to access it.",
        'error'
      )
      return
    }
  
    try {
      await removeTask(draft.id)
  
      showToast('Draft deleted successfully!', 'success')
    } catch (error) {
      console.error('Failed to delete draft:', error)
  
      showToast(
        error.message || 'Failed to delete draft.',
        'error'
      )
  
      throw error
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
        message: `${currentUser.name} changed the status to ${status}`,
      })

      setSelectedTaskId(taskId)

      showToast(
        `Status successfully changed to ${status}.`,
        'success'
      )
    } catch (error) {
      console.error(
        'Failed to update task status:',
        error
      )

      showToast(
        error.message || 'Failed to update task status.',
        'error'
      )
    }
  }

  async function handleSaveResultLink() {
    if (!selectedTask || savingResultLink) return

    const isAssignedToUser =
      String(selectedTask.picUid || '') ===
        String(currentUser?.uid || '') ||
      (
        !selectedTask.picUid &&
        String(selectedTask.pic || '').trim().toLowerCase() ===
          String(currentUser?.name || '').trim().toLowerCase()
      )

    if (
      !CAN_MANAGE_TASKS &&
      !(role === 'creative' && isAssignedToUser)
    ) {
      showToast(
        'You can only add a result link to tasks assigned to you.',
        'error'
      )
      return
    }

    let resultLink = resultLinkInput.trim()

    if (resultLink) {
      // Automatically add the protocol if it is missing.
      if (!/^https?:\/\//i.test(resultLink)) {
        resultLink = `https://${resultLink}`
      }

      try {
        const parsedUrl = new URL(resultLink)

        if (
          !['http:', 'https:'].includes(parsedUrl.protocol) ||
          !parsedUrl.hostname.includes('.')
        ) {
          throw new Error('Invalid URL')
        }
      } catch {
        showToast(
          'Invalid link. Example: drive.google.com/file/d/....',
          'error'
        )
        return
      }
    }

    setSavingResultLink(true)

    try {
      await editTask(selectedTask.id, { resultLink })

      showToast(
        'Result link saved successfully.',
        'success'
      )
    } catch (error) {
      console.error('Failed to save result link:', error)

      showToast(
        error.message || 'Failed to save result link.',
        'error'
      )
    } finally {
      setSavingResultLink(false)
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
        message: `${currentUser.name} changed the deadline to ${deadline}`,
      })

      showToast('Deadline updated successfully!', 'success')
    } catch (error) {
      console.error('Failed to update deadline:', error)

      showToast(
        error.message || 'Failed to update deadline.',
        'error'
      )
    }
  }


  async function handleForgiveOverdue() {
    if (role !== 'admin' || !selectedTask) {
      showToast('Only Admin can forgive overdue tasks.', 'error')
      return
    }
  
    const shouldForgive = selectedTask.overdueForgiven !== true
  
    try {
      if (shouldForgive) {
        await editTask(selectedTask.id, {
          overdueForgiven: true,
          overdueForgivenByUid: currentUser.uid,
          overdueForgivenByName: currentUser.name || currentUser.email,
          overdueForgivenAt: new Date(),
        })
      } else {
        await editTask(selectedTask.id, {
          overdueForgiven: false,
          overdueForgivenByUid: null,
          overdueForgivenByName: null,
          overdueForgivenAt: null,
        })
      }
  
      showToast(
        shouldForgive
          ? 'Overdue successfully forgiven.'
          : 'Overdue forgiveness has been removed.',
        'success'
      )
    } catch (error) {
      console.error('Failed to update overdue forgiveness:', error)
  
      showToast(
        error.message || 'Failed to update overdue forgiveness.',
        'error'
      )
    }
  }
  
  async function handleDeleteTask(taskId) {
    if (!canDeleteTasks) return

    const task = activeTasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) return

    setConfirmModal({
      title: 'Delete task?',
      message: `Task "${task.title}" will be permanently deleted. This action cannot be undone.`,
      confirmText: 'Delete Task',

      onConfirm: async () => {
        try {
          await removeTask(taskId)

          await sendNotificationSafely({
            taskId,
            taskTitle: task.title,
            type: 'task_deleted',
            message: `${currentUser.name} deleted a task`,
          })

          showToast('Task deleted successfully!', 'success')

          setShowDetail(false)
          setShowEditTask(false)
          setSelectedTaskId(null)
        } catch (error) {
          console.error('Failed to delete task:', error)

          showToast(
            error.message || 'Failed to delete task.',
            'error'
          )
        }
      },
    })
  }

  if (authLoading) {
    return <LoadingScreen message="Checking account..." />
  }

  if (!auth.currentUser) {
    return <Login />
  }

  if (!currentUser) {
    return (
      <LoadingScreen
        message={
          authError || 'User profile is unavailable.'
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
  isMobileOpen={isMobileOpen}
  onCloseMobile={() => setIsMobileOpen(false)}
/>


      <main className="main-area">

      <Header
  activeNav={activeNav}
  search={search}
  onSearchChange={setSearch}
  currentUser={currentUser}
  onLogout={handleLogout}
  onOpenSidebar={() => setIsMobileOpen(true)}
  notifications={notifications}
  unreadCount={unreadCount}
  notificationsLoading={notificationsLoading}
  notificationsError={notificationsError}
  onMarkAsRead={markAsRead}
  onMarkAllAsRead={markAllAsRead}
  onOpenNotification={(notification) => {
    const task = activeTasks.find(
      (item) =>
        String(item.id) === String(notification.taskId)
    )

    if (task) {
      setSelectedTaskId(task.id)
      setShowDetail(true)
      setIsMobileOpen(false)
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
                currentUser={currentUser}
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


            {activeNav === 'Organic Calendar' && (
              <OrganicCalendar
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onNewBrief={() => {
                  setNewBriefRequest(Date.now())
                }}
                year={monthDate.getFullYear()}
                month={monthDate.getMonth()}
                onChangeMonth={handleChangeMonth}
                onToday={handleToday}
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
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                search={search}
                onSearchChange={setSearch}
                userRole={currentUser.role}
              />
            )}

            {activeNav === 'Task Archive' && role === 'admin' && (
              <TaskArchive
                tasks={tasks}
                userRole={currentUser.role}
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

{canUseMyBrief &&
  (activeNav === 'My Brief' ||
    activeNav === 'Organic Calendar') && (
<MyBrief
  drafts={myDrafts}
  currentUser={currentUser}
  creatives={creatives}
  creativesLoading={creativesLoading}
  creativesError={creativesError}
  externalEditTask={draftToEdit}
  newBriefRequest={newBriefRequest}
  hidePageContent={activeNav !== 'My Brief'}
  onSaveDraft={handleSaveDraft}
  onUpdateDraft={handleUpdateDraft}
  onAssignDraft={handleAssignDraft}
  onDeleteDraft={handleDeleteDraft}
  onSelectTask={handleSelectBrief}
  showToast={showToast}
  onRequestConfirm={(config) => setConfirmModal(config)}
/>
)}


            {activeNav === 'Team' && (
              <Team
                currentUser={currentUser}
                onRequestConfirm={(config) =>
                  setConfirmModal(config)
                }
              />
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

                  {(CAN_MANAGE_TASKS || role === 'creative') && (
                    <div className="detail-status-options">
                      {STATUS_OPTIONS.map((status) => {
                        const isAssignedToUser =
                          String(selectedTask.picUid || '') ===
                            String(currentUser.uid) ||
                          (
                            !selectedTask.picUid &&
                            String(selectedTask.pic || '')
                              .trim()
                              .toLowerCase() ===
                              String(currentUser.name || '')
                                .trim()
                                .toLowerCase()
                          )

                        const canChangeStatus =
                          CAN_MANAGE_TASKS ||
                          (role === 'creative' && isAssignedToUser)

                        return (
                          <button
                            type="button"
                            key={status}
                            className={
                              selectedTask.status === status
                                ? 'detail-status-active'
                                : ''
                            }
                            disabled={!canChangeStatus}
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
                        )
                      })}
                    </div>
                  )}

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

                  <div className="detail-link-section">
                    <span className="detail-field-label">
                      RESULT LINK
                    </span>

                    {selectedTask.resultLink && (
                      <a
                        className="detail-link-card"
                        href={selectedTask.resultLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="detail-link-icon">
                          <ExternalLink size={18} />
                        </span>

                        <span className="detail-link-content">
                          <strong>Open completed work</strong>
                          <small>
                            View the final creative output
                          </small>
                        </span>

                        <ExternalLink
                          className="detail-link-arrow"
                          size={15}
                        />
                      </a>
                    )}

                    {(
                      CAN_MANAGE_TASKS ||
                      (
                        role === 'creative' &&
                        (
                          String(selectedTask.picUid || '') ===
                            String(currentUser.uid) ||
                          (
                            !selectedTask.picUid &&
                            String(selectedTask.pic || '')
                              .trim()
                              .toLowerCase() ===
                              String(currentUser.name || '')
                                .trim()
                                .toLowerCase()
                          )
                        )
                      )
                    ) && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          handleSaveResultLink()
                        }}
                        style={{
                          display: 'grid',
                          gap: '10px',
                          marginTop: '12px',
                        }}
                      >
                        <input
                          type="text"
                          value={resultLinkInput}
                          onChange={(event) =>
                            setResultLinkInput(event.target.value)
                          }
                          placeholder="https://drive.google.com/..."
                          aria-label="Result Link"
                          style={{ width: '100%' }}
                        />

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={savingResultLink}
                        >
                          {savingResultLink
                            ? 'Saving...'
                            : 'Save Result Link'}
                        </button>
                      </form>
                    )}

                    {!selectedTask.resultLink && (
                      <p className="detail-description">
                        No work result has been linked yet.
                      </p>
                    )}
                  </div>

                  <div className="detail-actions">

                  {role === 'admin' && selectedTask.deadline && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleForgiveOverdue}
                    >
                      {selectedTask.overdueForgiven === true
                        ? 'Restore Overdue'
                        : 'Forgive Overdue'}
                    </button>
                  )}

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
          showToast={showToast}
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

      <ConfirmModal
        open={Boolean(confirmModal)}
        title={confirmModal?.title}
        message={confirmModal?.message}
        confirmText={confirmModal?.confirmText}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmModal(null)
          }
        }}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  )
}

export default App
