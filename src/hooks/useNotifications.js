
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '../firebase'

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] =
    useState(true)
  const [notificationsError, setNotificationsError] = useState('')

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([])
      setNotificationsLoading(false)
      return
    }

    setNotificationsLoading(true)

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        )
        setNotificationsError('')
        setNotificationsLoading(false)
      },
      (error) => {
        console.error('Gagal mengambil notifikasi:', error)
        setNotificationsError(error.message)
        setNotificationsLoading(false)
      }
    )

    return unsubscribe
  }, [currentUser?.uid])

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length

  const markAsRead = useCallback(async (notificationId) => {
    await updateDoc(
      doc(db, 'notifications', notificationId),
      { read: true }
    )
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.uid) return

    const unreadQuery = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', currentUser.uid),
      where('read', '==', false)
    )

    const snapshot = await getDocs(unreadQuery)

    if (snapshot.empty) return

    // Firestore batch maksimal 500 operasi.
    for (let start = 0; start < snapshot.docs.length; start += 500) {
      const batch = writeBatch(db)
      const chunk = snapshot.docs.slice(start, start + 500)

      chunk.forEach((item) => {
        batch.update(item.ref, { read: true })
      })

      await batch.commit()
    }
  }, [currentUser?.uid])

  const notifyActiveMembers = useCallback(
    async ({
      taskId,
      taskTitle,
      type,
      message,
    }) => {
      if (!currentUser?.uid) return

      // Ambil semua anggota aktif, bukan cuma Creative.
      const usersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('active', '==', true)
        )
      )

      const recipients = usersSnapshot.docs.filter(
        (item) => item.id !== currentUser.uid
      )

      if (recipients.length === 0) return

      for (let start = 0; start < recipients.length; start += 500) {
        const batch = writeBatch(db)
        const chunk = recipients.slice(start, start + 500)

        chunk.forEach((recipient) => {
          const notificationRef = doc(
            collection(db, 'notifications')
          )

          batch.set(notificationRef, {
            recipientUid: recipient.id,
            taskId: String(taskId || ''),
            taskTitle: String(taskTitle || 'Task'),
            type,
            message,
            actorUid: currentUser.uid,
            actorName: currentUser.name || 'User',
            read: false,
            createdAt: serverTimestamp(),
          })
        })

        await batch.commit()
      }
    },
    [currentUser?.uid, currentUser?.name]
  )

  return {
    notifications,
    notificationsLoading,
    notificationsError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    notifyActiveMembers,
  }
}
