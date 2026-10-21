
import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Plus,
  Save,
  Send,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Search,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ClipboardList,
  Flag,
} from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function normalizePriority(value) {
  const priority = String(value || 'MEDIUM').toUpperCase()

  return PRIORITY_OPTIONS.some((item) => item.value === priority)
    ? priority
    : 'MEDIUM'
}

function todayDate() {
  const date = new Date()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function dateValue(value) {
  if (!value || typeof value === 'number') return todayDate()

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
  }

  const text = String(value)

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const date = new Date(text)

  if (Number.isNaN(date.getTime())) return todayDate()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function displayDate(value) {
  if (!value) return 'Belum diatur'

  const normalized = dateValue(value)
  const date = new Date(`${normalized}T00:00:00`)

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getBriefLabel(task) {
  if (task.workflowState === 'DRAFT') return 'DRAFT'
  if (task.status === 'DONE') return 'DONE'

  if (!task.status || task.status === 'NOT STARTED') {
    return 'ASSIGNED'
  }

  return 'IN PROGRESS'
}

function getTaskProgress(task) {
  if (task.status === 'DONE') return 100

  const progressMap = {
    'NOT STARTED': 0,
    START: 20,
    'APPROVAL 1': 40,
    'APPROVAL 2': 60,
    REVISION: 70,
    UPLOAD: 90,
    DONE: 100,
  }

  if (
    typeof task.progress === 'number' &&
    Number.isFinite(task.progress)
  ) {
    return Math.max(0, Math.min(100, task.progress))
  }

  return progressMap[task.status] ?? 0
}

function getStatusClass(label) {
  return label.toLowerCase().replace(/\s+/g, '-')
}

function getPriorityClass(priority) {
  return normalizePriority(priority).toLowerCase()
}

const EMPTY_FORM = {
  title: '',
  project: 'Organic',
  type: 'Video',
  priority: 'MEDIUM',
  picUid: '',
  start: todayDate(),
  deadline: todayDate(),
  link: '',
  notes: '',
}

export default function MyBrief({
  drafts = [],
  currentUser,
  creatives = [],
  creativesLoading = false,
  creativesError = '',
  onSaveDraft,
  onUpdateDraft,
  onAssignDraft,
  onDeleteDraft,
  onSelectTask,
  showToast,
  onRequestConfirm,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const selectedCreative = creatives.find(
    (creative) => creative.uid === form.picUid
  )

  const myBriefs = useMemo(() => {
    return drafts.filter(
      (task) =>
        currentUser?.uid &&
        task.createdByUid === currentUser.uid
    )
  }, [drafts, currentUser?.uid])

  const summary = useMemo(() => {
    const result = {
      total: myBriefs.length,
      draft: 0,
      assigned: 0,
      progress: 0,
      done: 0,
    }

    myBriefs.forEach((task) => {
      const label = getBriefLabel(task)

      if (label === 'DRAFT') result.draft += 1
      else if (label === 'ASSIGNED') result.assigned += 1
      else if (label === 'IN PROGRESS') result.progress += 1
      else if (label === 'DONE') result.done += 1
    })

    return result
  }, [myBriefs])

  const filteredDrafts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return myBriefs
      .filter((task) => {
        const label = getBriefLabel(task)

        const matchesSearch =
          !query ||
          [
            task.title,
            task.project,
            task.type,
            task.pic,
            task.status,
            task.notes,
            normalizePriority(task.priority),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query)

        const matchesStatus =
          statusFilter === 'ALL' || label === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const priorityOrder = {
          URGENT: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        }

        const priorityDifference =
          priorityOrder[normalizePriority(a.priority)] -
          priorityOrder[normalizePriority(b.priority)]

        if (priorityDifference !== 0) return priorityDifference

        return String(a.deadline || '').localeCompare(
          String(b.deadline || '')
        )
      })
  }, [myBriefs, search, statusFilter])

  useEffect(() => {
    if (!editingId) return

    const task = myBriefs.find(
      (item) => String(item.id) === String(editingId)
    )

    if (!task || task.workflowState !== 'DRAFT') {
      setEditingId(null)
      setFormOpen(false)
      return
    }

    const matchedCreative =
      creatives.find((item) => item.uid === task.picUid) ||
      creatives.find(
        (item) =>
          String(item.name || '').trim().toLowerCase() ===
          String(task.pic || '').trim().toLowerCase()
      )

    setForm({
      title: task.title || '',
      project: task.project || 'Organic',
      type: task.type || 'Video',
      priority: normalizePriority(task.priority),
      picUid: matchedCreative?.uid || '',
      start: dateValue(task.startDate || task.start),
      deadline: dateValue(task.deadline),
      link: task.link || '',
      notes: task.notes || '',
    })
  }, [editingId, myBriefs, creatives])

  useEffect(() => {
    if (!formOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) {
        closeForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [formOpen, submitting])

  function changeField(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function openNewForm() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      start: todayDate(),
      deadline: todayDate(),
    })
    setFormOpen(true)
  }

  function openEditForm(task) {
    if (task.workflowState !== 'DRAFT') return

    const matchedCreative =
      creatives.find((item) => item.uid === task.picUid) ||
      creatives.find(
        (item) =>
          String(item.name || '').trim().toLowerCase() ===
          String(task.pic || '').trim().toLowerCase()
      )

    setForm({
      title: task.title || '',
      project: task.project || 'Organic',
      type: task.type || 'Video',
      priority: normalizePriority(task.priority),
      picUid: matchedCreative?.uid || '',
      start: dateValue(task.startDate || task.start),
      deadline: dateValue(task.deadline),
      link: task.link || '',
      notes: task.notes || '',
    })

    setEditingId(task.id)
    setFormOpen(true)
  }

  function closeForm() {
    if (submitting) return

    setFormOpen(false)
    setEditingId(null)
  }

  function buildTaskData(requirePIC = false) {
    const title = form.title.trim()
  
    if (!title) {
      showToast?.('Nama task wajib diisi.', 'error')
      return null
    }
  
    if (!form.start || !form.deadline) {
      showToast?.('Start date dan deadline wajib diisi.', 'error')
      return null
    }
  
    if (form.deadline < form.start) {
      showToast?.('Deadline tidak boleh sebelum start date.', 'error')
      return null
    }
  
    if (requirePIC && !selectedCreative) {
      showToast?.('Pilih PIC sebelum assign task.', 'error')
      return null
    }
  
    return {
      title,
      project: form.project,
      type: form.type,
      priority: normalizePriority(form.priority),
      pic: selectedCreative?.name || '',
      picUid: selectedCreative?.uid || '',
      start: form.start,
      startDate: form.start,
      deadline: form.deadline,
      link: form.link.trim(),
      notes: form.notes.trim(),
      status: 'NOT STARTED',
      progress: 0,
      workflowState: 'DRAFT',
      createdByUid: currentUser?.uid || '',
    }
  }
  

  async function handleSaveDraft(event) {
    event.preventDefault()

    if (submitting) return

    const taskData = buildTaskData(false)
    if (!taskData) return

    setSubmitting(true)

    try {
      if (editingId) {
        const task = myBriefs.find(
          (item) => String(item.id) === String(editingId)
        )

        if (!task || task.workflowState !== 'DRAFT') {
          throw new Error(
            'Draft tidak ditemukan atau sudah di-assign.'
          )
        }

        await onUpdateDraft?.(editingId, taskData)
      } else {
        await onSaveDraft?.(taskData)
      }

      setFormOpen(false)
      setEditingId(null)
    } catch (error) {
      showToast?.(error.message || 'Gagal menyimpan draft.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignDraft(task) {
    if (task.workflowState !== 'DRAFT') return
    if (submitting || deletingId) return
  
    const matchedCreative =
      creatives.find((item) => item.uid === task.picUid) ||
      creatives.find(
        (item) =>
          String(item.name || '').trim().toLowerCase() ===
          String(task.pic || '').trim().toLowerCase()
      )
  
    if (!matchedCreative) {
      showToast?.(
        'Pilih dan simpan PIC aktif pada draft sebelum assign task.',
        'error'
      )
      openEditForm(task)
      return
    }
  
    onRequestConfirm?.({
      title: 'Assign task?',
      message: `Assign "${task.title}" kepada ${matchedCreative.name}? Task akan masuk ke workflow aktif.`,
      confirmText: 'Assign Task',
      onConfirm: async () => {
        setSubmitting(true)
  
        try {
          await onAssignDraft?.(task.id, {
            ...task,
            pic: matchedCreative.name,
            picUid: matchedCreative.uid,
            priority: normalizePriority(task.priority),
            workflowState: 'ASSIGNED',
            status: 'NOT STARTED',
            progress: 0,
          })
  
          showToast?.('Task berhasil di-assign!', 'success')
        } catch (error) {
          showToast?.(
            error.message || 'Gagal assign task.',
            'error'
          )
        } finally {
          setSubmitting(false)
        }
      },
    })
  }
  

  async function handleDeleteDraft(task) {
    if (task.workflowState !== 'DRAFT') return
    if (deletingId || submitting) return
  
    setDeletingId(task.id)
  
    try {
      await onDeleteDraft?.(task.id)
    } catch (error) {
      console.error('Gagal menghapus draft:', error)
    } finally {
      setDeletingId(null)
    }
  }
  

  function handleOpenTask(task) {
    if (!task || task.workflowState === 'DRAFT') return
    onSelectTask?.(task)
  }

  return (
    <section className="my-brief-page">
      <div className="my-brief-header">
        <div>
          <div className="eyebrow">STRATEGIC WORKSPACE</div>
          <h2>My Brief</h2>
          <p>
            Pantau brief dari tahap persiapan sampai task selesai.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openNewForm}
          disabled={submitting}
        >
          <Plus size={16} />
          New Brief
        </button>
      </div>

      <div className="brief-summary-grid">
        <div className="brief-summary-card">
          <div className="brief-summary-icon">
            <ClipboardList size={19} />
          </div>
          <div>
            <span>Total Brief</span>
            <strong>{summary.total}</strong>
            <small>Semua brief milik lu</small>
          </div>
        </div>

        <div className="brief-summary-card">
          <div className="brief-summary-icon draft">
            <FileText size={19} />
          </div>
          <div>
            <span>Draft</span>
            <strong>{summary.draft}</strong>
            <small>Belum di-assign</small>
          </div>
        </div>

        <div className="brief-summary-card">
          <div className="brief-summary-icon assigned">
            <Clock3 size={19} />
          </div>
          <div>
            <span>Assigned</span>
            <strong>{summary.assigned}</strong>
            <small>Menunggu pengerjaan</small>
          </div>
        </div>

        <div className="brief-summary-card">
          <div className="brief-summary-icon progress">
            <Clock3 size={19} />
          </div>
          <div>
            <span>In Progress</span>
            <strong>{summary.progress}</strong>
            <small>Sedang dikerjakan</small>
          </div>
        </div>

        <div className="brief-summary-card">
          <div className="brief-summary-icon done">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <span>Done</span>
            <strong>{summary.done}</strong>
            <small>Task selesai</small>
          </div>
        </div>
      </div>

      {formOpen && (
        <div
          className="brief-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeForm()
            }
          }}
        >
          <form
            className="task-modal brief-form brief-form-modal"
            onSubmit={handleSaveDraft}
          >
            <div className="section-title-row brief-form-heading">
              <div>
                <div className="eyebrow">BRIEF DETAILS</div>
                <h3>{editingId ? 'Edit Draft' : 'Create Brief'}</h3>
                <p>
                  Lengkapi detail brief sebelum masuk ke workflow.
                </p>
              </div>

              <button
                type="button"
                className="icon-button small"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close form"
              >
                <X size={17} />
              </button>
            </div>

            <label>
              Task name
              <input
                name="title"
                value={form.title}
                onChange={changeField}
                placeholder="e.g. October campaign video"
                required
              />
            </label>

            <label>
              Project
              <select
                name="project"
                value={form.project}
                onChange={changeField}
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
                name="type"
                value={form.type}
                onChange={changeField}
              >
                <option>Video</option>
                <option>Carousel</option>
                <option>Single Image</option>
              </select>
            </label>

            <label>
              <span>
                <Flag size={14} style={{ marginRight: 6 }} />
                Priority
              </span>
              <select
                name="priority"
                value={form.priority || 'MEDIUM'}
                onChange={changeField}
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
                name="picUid"
                value={form.picUid}
                onChange={changeField}
                disabled={
                  creativesLoading || Boolean(creativesError)
                }
              >
                <option value="">
                  {creativesLoading
                    ? 'Memuat daftar PIC...'
                    : creativesError
                      ? 'Gagal memuat PIC'
                      : 'Pilih PIC (opsional untuk draft)'}
                </option>

                {creatives.map((creative) => (
                  <option key={creative.uid} value={creative.uid}>
                    {creative.name}
                  </option>
                ))}
              </select>
            </label>

            {creativesError && (
              <p
                className="error-message brief-form-error"
                role="alert"
              >
                {creativesError}
              </p>
            )}

            <label>
              Start date
              <input
                name="start"
                type="date"
                value={form.start}
                onChange={changeField}
                required
              />
            </label>

            <label>
              Deadline
              <input
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={changeField}
                required
              />
            </label>

            <label className="brief-form-full">
              Brief / task link
              <input
                name="link"
                type="url"
                value={form.link}
                onChange={changeField}
                placeholder="https://..."
              />
            </label>

            <label className="brief-form-full">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={changeField}
                placeholder="Brief, arahan, atau catatan task..."
                rows={3}
              />
            </label>

            <div className="modal-actions brief-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                <Save size={16} />
                {submitting ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="brief-list-toolbar">
        <div>
          <h3>Brief Monitoring</h3>
          <span>
            {filteredDrafts.length} dari {myBriefs.length} brief
          </span>
        </div>

        <div className="brief-toolbar-controls">
          <label className="brief-search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari brief..."
              aria-label="Cari brief"
            />
          </label>

          <select
            className="brief-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status brief"
          >
            <option value="ALL">Semua status</option>
            <option value="DRAFT">Draft</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      </div>

      {myBriefs.length === 0 ? (
        <div className="empty-state">
          <FileText size={28} />
          <h3>Belum ada brief</h3>
          <p>
            Buat brief baru untuk menyiapkan dan memantau task creative.
          </p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="empty-state">
          <Search size={26} />
          <h3>Brief tidak ditemukan</h3>
          <p>
            Coba kata kunci atau filter status yang berbeda.
          </p>
        </div>
      ) : (
        <div className="brief-list-wrapper">
          <div className="brief-list-header">
            <span>BRIEF NAME</span>
            <span>PROJECT / TYPE</span>
            <span>PIC</span>
            <span>PRIORITY</span>
            <span>START DATE</span>
            <span>DEADLINE</span>
            <span>STATUS / PROGRESS</span>
            <span>ACTIONS</span>
          </div>

          <div className="brief-list">
            {filteredDrafts.map((task) => {
              const label = getBriefLabel(task)
              const progress = getTaskProgress(task)
              const isDraft = task.workflowState === 'DRAFT'
              const isDeleting = deletingId === task.id
              const priority = normalizePriority(task.priority)

              return (
                <div className="brief-row" key={task.id}>
                  <div className="brief-name-cell">
                    <div className="brief-file-icon">
                      <FileText size={17} />
                    </div>

                    <div className="brief-name-content">
                      <button
                        type="button"
                        className={`brief-task-title ${
                          !isDraft ? 'is-clickable' : ''
                        }`}
                        title={
                          isDraft
                            ? 'Draft belum di-assign'
                            : 'Klik untuk melihat detail task'
                        }
                        disabled={isDraft}
                        onClick={() => handleOpenTask(task)}
                      >
                        {task.title || 'Untitled brief'}
                      </button>

                      {task.link && (
                        <a
                          href={task.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brief-row-link"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ExternalLink size={12} />
                          Open link
                        </a>
                      )}

                      {task.notes && (
                        <span
                          className="brief-row-notes"
                          title={task.notes}
                        >
                          {task.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="brief-project-cell">
                    <span>{task.project || 'Other'}</span>
                    <small>{task.type || 'Video'}</small>
                  </div>

                  <div className="brief-pic-cell">
                    {task.pic ? (
                      <>
                        <span className="brief-avatar">
                          {task.pic.charAt(0).toUpperCase()}
                        </span>
                        <span title={task.pic}>{task.pic}</span>
                      </>
                    ) : (
                      <span className="brief-unassigned">
                        Unassigned
                      </span>
                    )}
                  </div>

                  <div className="brief-priority-cell">
                    <span
                      className={`priority-badge priority-${getPriorityClass(priority)}`}
                    >
                      <Flag size={12} />
                      {priority}
                    </span>
                  </div>

                  <div className="brief-date-cell">
                    <CalendarDays size={14} />
                    <span>
                      {displayDate(task.startDate || task.start)}
                    </span>
                  </div>

                  <div className="brief-date-cell">
                    <CalendarDays size={14} />
                    <span>{displayDate(task.deadline)}</span>
                  </div>

                  <div className="brief-status-cell">
                    <span
                      className={`brief-status brief-status-${getStatusClass(label)}`}
                    >
                      {label}
                    </span>

                    <div
                      className="brief-progress-track"
                      role="progressbar"
                      aria-label={`Progress ${task.title}`}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="brief-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <small>
                      {progress}%{task.status ? ` · ${task.status}` : ''}
                    </small>
                  </div>

                  <div className="brief-row-actions">
                    {isDraft ? (
                      <>
                        <button
                          type="button"
                          className="icon-button small"
                          onClick={() => openEditForm(task)}
                          disabled={submitting || Boolean(deletingId)}
                          aria-label={`Edit ${task.title}`}
                          title="Edit draft"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-button small"
                          onClick={() => handleDeleteDraft(task)}
                          disabled={submitting || Boolean(deletingId)}
                          aria-label={`Delete ${task.title}`}
                          title="Delete draft"
                        >
                          <Trash2 size={15} />
                        </button>

                        <button
                          type="button"
                          className="brief-assign-button"
                          onClick={() => handleAssignDraft(task)}
                          disabled={
                            submitting ||
                            Boolean(deletingId) ||
                            creativesLoading ||
                            Boolean(creativesError)
                          }
                          title="Assign task"
                        >
                          <Send size={14} />
                          Assign
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="brief-monitor-button"
                        onClick={() => handleOpenTask(task)}
                      >
                        Monitoring
                      </button>
                    )}

                    {isDeleting && <small>Menghapus...</small>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
