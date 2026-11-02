
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore'
import { auth, db } from '../firebase'


export const TASK_STATUSES = [
  'NOT STARTED',
  'START',
  'APPROVAL 1',
  'APPROVAL 2',
  'DONE',
]

export const TASK_PROGRESS_BY_STATUS = {
  'NOT STARTED': 0,
  START: 20,
  'APPROVAL 1': 40,
  'APPROVAL 2': 60,
  DONE: 100,
}

const DEFAULT_PRIORITY = 'MEDIUM'

const PRIORITY_OPTIONS = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]

function normalizePriority(value) {
  const priority = String(value || DEFAULT_PRIORITY).toUpperCase()

  return PRIORITY_OPTIONS.includes(priority)
    ? priority
    : DEFAULT_PRIORITY
}

function normalizeStatus(value) {
  const status = String(value || 'NOT STARTED').toUpperCase()

  return TASK_STATUSES.includes(status)
    ? status
    : 'NOT STARTED'
}

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeDate(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

function getActor(currentUser) {
  if (!currentUser) {
    return {
      changedByUid: '',
      changedByName: 'Unknown user',
      changedByEmail: '',
    }
  }

  return {
    changedByUid: String(
      currentUser.uid || currentUser.id || ''
    ),
    changedByName: String(
      currentUser.name ||
      currentUser.displayName ||
      currentUser.email ||
      'Unknown user'
    ),
    changedByEmail: String(currentUser.email || ''),
  }
}

function createStatusHistory(previousStatus, nextStatus, currentUser) {
  return {
    from: previousStatus || '',
    to: nextStatus,
    ...getActor(currentUser),
    changedAt: new Date(),
  }
}

export function useTasks(currentUser = null) {
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')


  useEffect(() => {
    let unsubscribeTasks = null
    let isActive = true
  
    setTasksLoading(true)
    setTasksError('')
  
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!isActive) return
  
        // Jangan membaca tasks jika belum login.
        if (!firebaseUser) {
          if (unsubscribeTasks) {
            unsubscribeTasks()
            unsubscribeTasks = null
          }
  
          setTasks([])
          setTasksLoading(false)
          setTasksError('')
          return
        }
  
        // Hindari memasang listener Firestore berulang
        // untuk pengguna yang sama.
        if (unsubscribeTasks) return
  
        setTasksLoading(true)
        setTasksError('')
  
        unsubscribeTasks = onSnapshot(
          collection(db, 'tasks'),
          (snapshot) => {
            if (!isActive) return
  
            const firestoreTasks = snapshot.docs.map((item) => {
              const data = item.data()
  
              return {
                ...data,
                id: item.id,
                priority: normalizePriority(data.priority),
                resultLink: String(data.resultLink || ''),
              }
            })
  
            setTasks(firestoreTasks)
            setTasksError('')
            setTasksLoading(false)
          },
          (error) => {
            if (!isActive) return
  
            console.error('Gagal membaca tasks:', error)
            setTasksError(
              error.message || 'Gagal membaca data task.'
            )
            setTasksLoading(false)
          }
        )
      },
      (error) => {
        if (!isActive) return
  
        console.error('Gagal memeriksa autentikasi:', error)
        setTasksError(error.message || 'Gagal memeriksa login.')
        setTasksLoading(false)
      }
    )
  
    return () => {
      isActive = false
  
      if (unsubscribeTasks) {
        unsubscribeTasks()
      }
  
      unsubscribeAuth()
    }
  }, [])
  

  // Simpan draft baru
  const saveDraft = useCallback(async (taskData) => {
    const title = String(taskData.title || '').trim()

    if (!title) {
      throw new Error('Nama task wajib diisi.')
    }

    const draftData = {
      title,
      code: taskData.code || `DRAFT · ${String(Date.now()).slice(-6)}`,
      project: taskData.project || 'Organic',
      type: taskData.type || 'Video',
      priority: normalizePriority(taskData.priority),
      pic: String(taskData.pic || '').trim(),
      picUid: String(taskData.picUid || '').trim(),
      start: normalizeDate(taskData.start, getTodayDate()),
      startDate: normalizeDate(
        taskData.startDate || taskData.start,
        getTodayDate()
      ),
      deadline: normalizeDate(taskData.deadline, getTodayDate()),
      progress: 0,
      status: 'NOT STARTED',
      workflowState: 'DRAFT',
      createdByUid: taskData.createdByUid || '',
      link: String(taskData.link || '').trim(),
      resultLink: String(taskData.resultLink || '').trim(),
      notes: String(taskData.notes || '').trim(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'tasks'), draftData)

    return { ...draftData, id: docRef.id }
  }, [])

  // Assign draft kepada PIC
  const assignDraft = useCallback(async (taskId, taskData) => {
    const title = String(taskData.title || '').trim()
    const pic = String(taskData.pic || '').trim()
    const picUid = String(taskData.picUid || '').trim()

    if (!title) {
      throw new Error('Nama task wajib diisi.')
    }

    if (!pic || !picUid) {
      throw new Error('Pilih PIC sebelum assign task.')
    }

    const status = normalizeStatus(taskData.status)

    const updateData = {
      ...taskData,
      title,
      pic,
      picUid,
      priority: normalizePriority(taskData.priority),
      status,
      progress: TASK_PROGRESS_BY_STATUS[status],
      resultLink: String(taskData.resultLink || '').trim(),
      workflowState: 'ASSIGNED',
      updatedAt: serverTimestamp(),
    }

    // Catat waktu selesai jika task belum pernah selesai.
    const existingTask = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (status === 'DONE' && !existingTask?.completedAt) {
      updateData.completedAt = serverTimestamp()
    }

    await updateDoc(
      doc(db, 'tasks', String(taskId)),
      updateData
    )
  }, [tasks])

  // Tambah task baru
  const addTask = useCallback(async (taskData) => {
    const today = getTodayDate()

    const title = String(taskData.title || '').trim()
    const pic = String(taskData.pic || '').trim()
    const picUid = String(taskData.picUid || '').trim()

    if (!title) {
      throw new Error('Nama task wajib diisi.')
    }

    if (!pic || !picUid) {
      throw new Error('PIC creative wajib dipilih.')
    }

    const status = normalizeStatus(taskData.status)

    const newTask = {
      title,
      code: `NEW · ${String(Date.now()).slice(-6)}`,
      project: taskData.project || 'Organic',
      type: taskData.type || 'Video',
      priority: normalizePriority(taskData.priority),
      workflowState: taskData.workflowState || 'ASSIGNED',
      createdByUid: taskData.createdByUid || '',
      pic,
      picUid,
      start: normalizeDate(taskData.start, today),
      startDate: normalizeDate(
        taskData.startDate || taskData.start,
        today
      ),
      deadline: normalizeDate(taskData.deadline, today),
      status,
      progress: TASK_PROGRESS_BY_STATUS[status],
      link: String(taskData.link || '').trim(),
      resultLink: String(taskData.resultLink || '').trim(),
      notes: String(taskData.notes || '').trim(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    // Jika task langsung dibuat dengan status DONE, catat waktunya.
    if (status === 'DONE') {
      newTask.completedAt = serverTimestamp()
    }

    const docRef = await addDoc(collection(db, 'tasks'), newTask)

    return {
      ...newTask,
      id: docRef.id,
    }
  }, [])

  // Edit task
  const editTask = useCallback(async (taskId, changes) => {
    const {
      id,
      createdAt,
      ...safeChanges
    } = changes

    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) {
      throw new Error('Task tidak ditemukan. Coba muat ulang data.')
    }

    if (safeChanges.picUid !== undefined) {
      if (
        !String(safeChanges.picUid || '').trim() ||
        !String(safeChanges.pic || '').trim()
      ) {
        throw new Error('PIC creative wajib dipilih.')
      }
    }

    if (safeChanges.priority !== undefined) {
      safeChanges.priority = normalizePriority(safeChanges.priority)
    }

    if (safeChanges.link !== undefined) {
      safeChanges.link = String(safeChanges.link || '').trim()
    }

    if (safeChanges.resultLink !== undefined) {
      safeChanges.resultLink = String(
        safeChanges.resultLink || ''
      ).trim()
    }

    const previousStatus = normalizeStatus(task.status)
    const requestedStatus = safeChanges.status
    const statusChanged =
      requestedStatus !== undefined &&
      normalizeStatus(requestedStatus) !== previousStatus

    if (requestedStatus !== undefined) {
      const normalizedRequestedStatus = normalizeStatus(requestedStatus)

      if (!TASK_STATUSES.includes(normalizedRequestedStatus)) {
        throw new Error(
          `Status "${requestedStatus}" tidak valid.`
        )
      }

      safeChanges.status = normalizedRequestedStatus
      safeChanges.progress =
        TASK_PROGRESS_BY_STATUS[normalizedRequestedStatus]
    }

    const updateData = {
      ...safeChanges,
      updatedAt: serverTimestamp(),
    }

    if (
      statusChanged &&
      TASK_STATUSES.includes(safeChanges.status)
    ) {
      updateData.statusHistory = arrayUnion(
        createStatusHistory(
          previousStatus,
          safeChanges.status,
          currentUser
        )
      )

      // Simpan waktu pertama kali task diselesaikan.
      if (
        safeChanges.status === 'DONE' &&
        !task.completedAt
      ) {
        updateData.completedAt = serverTimestamp()
      }
    }

    await updateDoc(
      doc(db, 'tasks', String(taskId)),
      updateData
    )
  }, [tasks, currentUser])

  // Ubah status task
  const changeTaskStatus = useCallback(async (taskId, status) => {
    const nextStatus = normalizeStatus(status)

    if (!TASK_STATUSES.includes(nextStatus)) {
      throw new Error(`Status tidak valid: ${status}.`)
    }

    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) {
      throw new Error('Task tidak ditemukan. Coba muat ulang data.')
    }

    const previousStatus = normalizeStatus(task.status)

    if (previousStatus === nextStatus) {
      return
    }

    const updateData = {
      status: nextStatus,
      progress: TASK_PROGRESS_BY_STATUS[nextStatus],
      statusHistory: arrayUnion(
        createStatusHistory(previousStatus, nextStatus, currentUser)
      ),
      updatedAt: serverTimestamp(),
    }

    // Simpan tanggal selesai pertama kali, jangan timpa jika sudah ada.
    if (nextStatus === 'DONE' && !task.completedAt) {
      updateData.completedAt = serverTimestamp()
    }

    await updateDoc(
      doc(db, 'tasks', String(taskId)),
      updateData
    )
  }, [tasks, currentUser])

  // Pindahkan deadline
  const moveTaskDeadline = useCallback(async (taskId, deadline) => {
    await updateDoc(doc(db, 'tasks', String(taskId)), {
      deadline,
      updatedAt: serverTimestamp(),
    })
  }, [])

  // Hapus task
  const removeTask = useCallback(async (taskId) => {
    await deleteDoc(doc(db, 'tasks', String(taskId)))
  }, [])

  // Reset task dinonaktifkan agar data Firebase aman.
  const resetTasks = useCallback(() => {
    console.warn(
      'Reset task dinonaktifkan agar data Firestore tidak terhapus.'
    )
  }, [])

  return {
    tasks,
    setTasks,
    addTask,
    editTask,
    saveDraft,
    assignDraft,
    changeTaskStatus,
    moveTaskDeadline,
    removeTask,
    resetTasks,
    tasksLoading,
    tasksError,
  }
}
