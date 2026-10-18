
import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'

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
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toDateInput(value) {
  if (!value) return getTodayDate()

  if (typeof value === 'number') return ''

  const text = String(value)

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const date = new Date(text)

  if (Number.isNaN(date.getTime())) {
    return getTodayDate()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizePriority(value) {
  const priority = String(value || 'MEDIUM').toUpperCase()

  return PRIORITY_OPTIONS.some((item) => item.value === priority)
    ? priority
    : 'MEDIUM'
}

export default function TaskModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  task = null,
  creatives = [],
  creativesLoading = false,
  creativesError = '',
}) {
  const isEditing = Boolean(task)

  const [title, setTitle] = useState('')
  const [picUid, setPicUid] = useState('')
  const [start, setStart] = useState(getTodayDate())
  const [deadline, setDeadline] = useState(getTodayDate())
  const [project, setProject] = useState('Organic')
  const [type, setType] = useState('Video')
  const [priority, setPriority] = useState('MEDIUM')
  const [status, setStatus] = useState('NOT STARTED')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setTitle(task?.title || '')

    // Utamakan UID. Untuk task lama, coba cocokkan berdasarkan nama.
    const existingCreative = creatives.find(
      (creative) => creative.uid === task?.picUid
    ) || creatives.find(
      (creative) =>
        String(creative.name || '').trim().toLowerCase() ===
        String(task?.pic || '').trim().toLowerCase()
    )

    setPicUid(existingCreative?.uid || '')
    setStart(toDateInput(task?.startDate || task?.start))
    setDeadline(toDateInput(task?.deadline))
    setProject(task?.project || 'Organic')
    setType(task?.type || 'Video')
    setPriority(normalizePriority(task?.priority))
    setStatus(task?.status || 'NOT STARTED')
    setLink(task?.link || '')
    setNotes(task?.notes || '')
    setSubmitting(false)
  }, [open, task, creatives])

  if (!open) return null

  const selectedCreative = creatives.find(
    (creative) => creative.uid === picUid
  )

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    if (!title.trim() || !start || !deadline) return

    if (!selectedCreative) {
      window.alert('Pilih PIC creative yang aktif terlebih dahulu.')
      return
    }

    setSubmitting(true)

    const taskData = {
      title: title.trim(),
      pic: selectedCreative.name,
      picUid: selectedCreative.uid,
      start,
      startDate: start,
      deadline,
      project,
      type,
      priority: normalizePriority(priority),
      status: isEditing ? status : 'NOT STARTED',
      link: link.trim(),
      notes: notes.trim(),
    }

    try {
      if (isEditing) {
        await onUpdate?.(task.id, taskData)
      } else {
        await onCreate?.({
          ...taskData,
          progress: 0,
        })
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="task-modal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-title-row">
          <div>
            <div className="eyebrow">WORKSPACE</div>
            <h3>{isEditing ? 'Edit task' : 'Create new task'}</h3>
          </div>

          <button
            type="button"
            className="icon-button small"
            onClick={onClose}
            aria-label="Close modal"
            disabled={submitting}
          >
            <X size={17} />
          </button>
        </div>

        <label>
          Task name
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. October campaign video"
            required
          />
        </label>

        <label>
          Project
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option>Organic</option>
            <option>SMM</option>
            <option>Big Project</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Content type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>Video</option>
            <option>Carousel</option>
            <option>Single Image</option>
          </select>
        </label>

        <label>
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {PRIORITY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Assign to
          <select
            value={picUid}
            onChange={(event) => setPicUid(event.target.value)}
            required
            disabled={creativesLoading || Boolean(creativesError)}
          >
            <option value="">
              {creativesLoading
                ? 'Memuat daftar creative...'
                : creativesError
                  ? 'Gagal memuat PIC'
                  : creatives.length === 0
                    ? 'Belum ada creative aktif'
                    : 'Pilih PIC creative'}
            </option>

            {creatives.map((creative) => (
              <option key={creative.uid} value={creative.uid}>
                {creative.name}
              </option>
            ))}
          </select>
        </label>

        {creativesError && (
          <p role="alert" className="error-message">
            {creativesError}
          </p>
        )}

        {!creativesLoading &&
          !creativesError &&
          creatives.length === 0 && (
            <p className="modal-note">
              Tambahkan pengguna di koleksi users dengan role creative
              dan active bernilai true.
            </p>
          )}

        {isEditing && (
          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Start date
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>

        <label>
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            required
          />
        </label>

        <label>
          Brief / task link
          <input
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Brief, arahan, atau catatan task..."
            rows={3}
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={
              submitting ||
              creativesLoading ||
              Boolean(creativesError) ||
              creatives.length === 0
            }
          >
            {isEditing ? <Save size={16} /> : <Plus size={16} />}
            {submitting
              ? 'Menyimpan...'
              : isEditing
                ? 'Save changes'
                : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  )
}
