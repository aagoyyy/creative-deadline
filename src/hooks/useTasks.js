
import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

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

const progressByStatus = {
  'NOT STARTED': 0,
  START: 20,
  'APPROVAL 1': 40,
  'APPROVAL 2': 60,
  REVISION: 60,
  UPLOAD: 90,
  DONE: 100,
}

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')

  useEffect(() => {
    const tasksRef = collection(db, 'tasks')

    const unsubscribe = onSnapshot(
      tasksRef,
      (snapshot) => {
        const firestoreTasks = snapshot.docs.map((item) => {
          const data = item.data()

          return {
            ...data,
            id: item.id,
            priority: normalizePriority(data.priority),
          }
        })

        setTasks(firestoreTasks)
        setTasksError('')
        setTasksLoading(false)
      },
      (error) => {
        console.error('Gagal membaca tasks:', error)
        setTasksError(error.message || 'Gagal membaca data task.')
        setTasksLoading(false)
      }
    )

    return unsubscribe
  }, [])

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
      createdByUid: taskData.createdByUid,
      link: String(taskData.link || '').trim(),
      notes: String(taskData.notes || '').trim(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'tasks'), draftData)

    return { ...draftData, id: docRef.id }
  }, [])

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

    await updateDoc(doc(db, 'tasks', String(taskId)), {
      ...taskData,
      title,
      pic,
      picUid,
      priority: normalizePriority(taskData.priority),
      workflowState: 'ASSIGNED',
      status: taskData.status || 'NOT STARTED',
      progress: taskData.progress ?? 0,
      updatedAt: serverTimestamp(),
    })
  }, [])

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
      progress: 0,
      status: 'NOT STARTED',
      link: String(taskData.link || '').trim(),
      notes: String(taskData.notes || '').trim(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'tasks'), newTask)

    return {
      ...newTask,
      id: docRef.id,
    }
  }, [])

  const editTask = useCallback(async (taskId, changes) => {
    const {
      id,
      createdAt,
      ...safeChanges
    } = changes

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

    await updateDoc(doc(db, 'tasks', String(taskId)), {
      ...safeChanges,
      updatedAt: serverTimestamp(),
    })
  }, [])

  const changeTaskStatus = useCallback(async (taskId, status) => {
    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    await updateDoc(doc(db, 'tasks', String(taskId)), {
      status,
      progress: progressByStatus[status] ?? task?.progress ?? 0,
      updatedAt: serverTimestamp(),
    })
  }, [tasks])

  const moveTaskDeadline = useCallback(async (taskId, deadline) => {
    await updateDoc(doc(db, 'tasks', String(taskId)), {
      deadline,
      updatedAt: serverTimestamp(),
    })
  }, [])

  const removeTask = useCallback(async (taskId) => {
    await deleteDoc(doc(db, 'tasks', String(taskId)))
  }, [])

  // Tidak menghapus task dari Firestore.
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
