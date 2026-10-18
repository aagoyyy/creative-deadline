
import { useMemo, useState } from 'react'

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Flag,
  SlidersHorizontal,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import {
  getCalendarCells,
  getMonthName,
  parseDate,
} from '../utils/dateUtils'

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

const STATUS_PROGRESS = {
  'NOT STARTED': 0,
  START: 20,
  'APPROVAL 1': 40,
  'APPROVAL 2': 60,
  REVISION: 70,
  UPLOAD: 90,
  DONE: 100,
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

function matchesCalendarDate(value, day, year, month) {
  if (!value || !day) return false

  const date = parseDate(value)
  if (!date) return false

  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  )
}

function getTaskDateMatch(task, day, year, month, dateFilter) {
  if (!day) return false

  const start = task.startDate || task.start
  const deadline = task.deadline

  const matchesStart = matchesCalendarDate(
    start,
    day,
    year,
    month
  )

  const matchesDeadline = matchesCalendarDate(
    deadline,
    day,
    year,
    month
  )

  if (dateFilter === 'START') return matchesStart
  if (dateFilter === 'DEADLINE') return matchesDeadline

  return matchesStart || matchesDeadline
}

function makeDateString(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function formatDate(value) {
  if (!value) return '-'

  const date = parseDate(value)
  if (!date) return '-'

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

function getProgress(task) {
  if (task.status === 'DONE') return 100

  const value = Number(task.progress)

  if (
    task.progress !== undefined &&
    task.progress !== null &&
    task.progress !== '' &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(100, value))
  }

  return STATUS_PROGRESS[task.status] ?? 0
}

function getStatusLabel(status) {
  const labels = {
    'NOT STARTED': 'BELUM MULAI',
    START: 'START',
    'APPROVAL 1': 'APPROVAL 1',
    'APPROVAL 2': 'APPROVAL 2',
    REVISION: 'REVISION',
    UPLOAD: 'UPLOAD',
    DONE: 'SELESAI',
  }

  return labels[status] || status || 'BELUM MULAI'
}

function getProjectLabel(project) {
  if (!project) return 'OTHER'

  const value = String(project).trim().toUpperCase()

  if (value.includes('SMM')) return 'SMM'
  if (value.includes('ORGANIC')) return 'ORGANIC'

  return project
}

const PIC_COLORS = [
  'purple',
  'cyan',
  'blue',
  'pink',
  'orange',
  'green',
  'red',
  'yellow',
  'indigo',
  'teal',
]

function getPicColor(pic, pics) {
  const name = String(pic || '').trim().toLowerCase()

  if (!name) return 'purple'

  const index = pics.findIndex(
    (item) => String(item).trim().toLowerCase() === name
  )

  if (index === -1) return 'purple'

  return PIC_COLORS[index % PIC_COLORS.length]
}

function getTypeLabel(type) {
  if (!type) return 'TIPE -'

  const value = String(type).trim().toUpperCase()

  if (value.includes('SINGLE')) return 'SINGLE IMAGE'
  if (value.includes('CAROUSEL')) return 'CAROUSEL'
  if (value.includes('VIDEO')) return 'VIDEO'

  return type
}

export default function Calendar({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  year,
  month,
  onChangeMonth,
  onToday,
  onMoveDeadline,
  onAddTask,
}) {
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [picFilter, setPicFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  const [dragTaskId, setDragTaskId] = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)

  // Simpan tanggal yang sedang dibuka secara terpisah.
  const [expandedDays, setExpandedDays] = useState(() => new Set())

  const cells = useMemo(
    () => getCalendarCells(year, month),
    [year, month]
  )

  const monthName = getMonthName(year, month)
  const today = new Date()

  const isCurrentMonth =
    today.getFullYear() === year &&
    today.getMonth() === month

  const projects = useMemo(
    () =>
      [...new Set(
        tasks
          .filter((task) => String(task.workflowState || '').toUpperCase() !== 'DRAFT')
          .map((task) => task.project)
          .filter(Boolean)
      )].sort(),
    [tasks]
  )

  const pics = useMemo(
    () =>
      [...new Set(
        tasks
          .filter((task) => String(task.workflowState || '').toUpperCase() !== 'DRAFT')
          .map((task) => task.pic)
          .filter(Boolean)
      )].sort(),
    [tasks]
  )

  const types = useMemo(
    () =>
      [...new Set(
        tasks
          .filter((task) => String(task.workflowState || '').toUpperCase() !== 'DRAFT')
          .map((task) => task.type)
          .filter(Boolean)
      )].sort(),
    [tasks]
  )

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => (
      String(task.workflowState || '').toUpperCase() !== 'DRAFT' &&
      (projectFilter === 'ALL' || task.project === projectFilter) &&
      (picFilter === 'ALL' || task.pic === picFilter) &&
      (typeFilter === 'ALL' || task.type === typeFilter) &&
      (statusFilter === 'ALL' || task.status === statusFilter) &&
      (priorityFilter === 'ALL' ||
        normalizePriority(task.priority) === priorityFilter)
    ))

    return sortTasksByPriority(filtered)
  }, [
    tasks,
    projectFilter,
    picFilter,
    typeFilter,
    statusFilter,
    priorityFilter,
  ])

  function getTasksForDay(day) {
    if (!day) return []

    return sortTasksByPriority(
      filteredTasks.filter((task) =>
        getTaskDateMatch(task, day, year, month, dateFilter)
      )
    )
  }

  function getDayKey(day) {
    return `${year}-${month}-${day}`
  }

  function toggleDay(day) {
    const key = getDayKey(day)

    setExpandedDays((previous) => {
      const next = new Set(previous)

      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }

  function resetFilters() {
    setProjectFilter('ALL')
    setPicFilter('ALL')
    setTypeFilter('ALL')
    setStatusFilter('ALL')
    setDateFilter('ALL')
    setPriorityFilter('ALL')
  }

  const hasActiveFilters =
    projectFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    priorityFilter !== 'ALL'

  function handleDragStart(event, task) {
    if (!onMoveDeadline) {
      event.preventDefault()
      return
    }

    setDragTaskId(String(task.id))
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
  }

  function handleDragEnd() {
    setDragTaskId(null)
    setDragOverDay(null)
  }

  function handleDragOver(event, day) {
    if (!day || !onMoveDeadline || dragTaskId === null) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverDay(day)
  }

  function handleDrop(event, day) {
    event.preventDefault()

    const taskId = event.dataTransfer.getData('text/plain')

    if (!day || !taskId || !onMoveDeadline) {
      handleDragEnd()
      return
    }

    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    )

    if (!task) {
      handleDragEnd()
      return
    }

    const newDeadline = makeDateString(year, month, day)

    if (task.deadline !== newDeadline) {
      onMoveDeadline(task.id, newDeadline)
    }

    handleDragEnd()
  }

  return (
    <section className="calendar-panel">
      <div className="calendar-toolbar">
        <div className="calendar-heading">
          <div className="calendar-icon">
            <CalendarDays size={19} />
          </div>

          <div>
            <h2>{monthName} {year}</h2>
            <p>Plan it. Create it. Deliver it.</p>
          </div>
        </div>

        <div className="calendar-controls">
          {onAddTask && (
            <button
              type="button"
              className="primary-button calendar-new-task"
              onClick={onAddTask}
            >
              <Plus size={16} />
              New Task
            </button>
          )}

          <button
            type="button"
            className="icon-button small"
            onClick={() => onChangeMonth(-1)}
            aria-label="Previous month"
          >
            <ArrowLeft size={16} />
          </button>

          <button
            type="button"
            className="icon-button small"
            onClick={() => onChangeMonth(1)}
            aria-label="Next month"
          >
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="today-button"
            onClick={onToday}
          >
            Today
          </button>
        </div>
      </div>

      <div className="calendar-filters">
        <div className="calendar-filters-heading">
          <div>
            <h3>Filter kalender</h3>
            <p>Tampilkan task sesuai kebutuhan lu.</p>
          </div>
        </div>

        <div className="calendar-filter-grid">
          <label>
            <span>Project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="ALL">Semua project</option>
              {projects.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </label>

          <label>
            <span>PIC Creative</span>
            <select
              value={picFilter}
              onChange={(event) => setPicFilter(event.target.value)}
            >
              <option value="ALL">Semua PIC</option>
              {pics.map((pic) => (
                <option key={pic} value={pic}>{pic}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipe konten</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="ALL">Semua tipe</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Semua status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Prioritas</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">Semua prioritas</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Jenis tanggal</span>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            >
              <option value="ALL">Mulai dan deadline</option>
              <option value="START">Tanggal mulai saja</option>
              <option value="DEADLINE">Deadline saja</option>
            </select>
          </label>
        </div>

        <div className="calendar-filter-footer">
          <span>
            <SlidersHorizontal size={14} />
            {filteredTasks.length} task sesuai filter
          </span>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw size={13} />
            Reset filter
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div className="weekday" key={day}>{day}</div>
        ))}

        {cells.map((day, index) => {
          const dayTasks = getTasksForDay(day)
          const dayKey = day ? getDayKey(day) : ''
          const isExpanded = day ? expandedDays.has(dayKey) : false
          const visibleDayTasks = isExpanded
            ? dayTasks
            : dayTasks.slice(0, 3)

          const isToday =
            Boolean(day) &&
            isCurrentMonth &&
            day === today.getDate()

          return (
            <div
              key={`${year}-${month}-${index}`}
              className={[
                'day-cell',
                !day ? 'empty-day' : '',
                isToday ? 'today-cell' : '',
                day && dragOverDay === day ? 'drag-over' : '',
                isExpanded ? 'day-cell-expanded' : '',
              ].filter(Boolean).join(' ')}
              onDragOver={(event) => handleDragOver(event, day)}
              onDragLeave={() => {
                if (dragOverDay === day) setDragOverDay(null)
              }}
              onDrop={(event) => handleDrop(event, day)}
            >
              {day && (
                <>
                  <div className="day-number-row">
                    <span className={isToday ? 'today-number' : ''}>
                      {String(day).padStart(2, '0')}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="day-task-count">{dayTasks.length}</span>
                    )}
                  </div>

                  <div className="day-tasks">
                    {visibleDayTasks.map((task) => {
                      const isSelected =
                        String(selectedTaskId) === String(task.id)

                      const start = task.startDate || task.start
                      const isStart = matchesCalendarDate(start, day, year, month)
                      const isDeadline = matchesCalendarDate(task.deadline, day, year, month)
                      const isDragging = dragTaskId === String(task.id)
                      const progress = getProgress(task)
                      const statusLabel = getStatusLabel(task.status)
                      const projectLabel = getProjectLabel(task.project)
                      const typeLabel = getTypeLabel(task.type)
                      const priority = normalizePriority(task.priority)

                      return (
                        <button
                          type="button"
                          key={task.id}
                          draggable={
                            Boolean(onMoveDeadline) &&
                            isDeadline &&
                            dateFilter !== 'START'
                          }
                          onDragStart={(event) => handleDragStart(event, task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectTask?.(task)}
                          className={[
                            'task-chip',
                            getPicColor(task.pic, pics),
                            'task-card-readable',
                            task.status === 'DONE' ? 'task-done' : '',
                            isSelected ? 'task-selected' : '',
                            isDragging ? 'task-dragging' : '',
                          ].filter(Boolean).join(' ')}
                          title={
                            onMoveDeadline && isDeadline
                              ? `${task.title} — tarik ke tanggal lain untuk memindahkan deadline`
                              : task.title
                          }
                        >
                          <span className="task-card-header">
                            <span className="task-card-pic">{task.pic || 'NO PIC'}</span>
                            <span className="task-card-title">{task.title || 'Untitled task'}</span>
                          </span>

                          <span className="task-card-tags">
                            <span className="task-card-project">{projectLabel}</span>
                            <span className="task-card-type">{typeLabel}</span>
                          </span>

                          <span className="task-card-priority-row">
                            <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                              <Flag size={11} />
                              {priority}
                            </span>
                          </span>

                          <span className="task-card-dates">
                            {isStart && <span className="task-date-start">MULAI</span>}
                            {isDeadline && <span className="task-date-deadline">DEADLINE</span>}
                            <span className="task-card-deadline-date">
                              {isDeadline ? formatDate(task.deadline) : ''}
                            </span>
                          </span>

                          <span className="task-card-progress-info">
                            <span className="task-card-status">{statusLabel}</span>
                            <strong>{progress}%</strong>
                          </span>

                          <span className="task-progress-track">
                            <span
                              className="task-progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </span>

                          <span className="task-card-footer">
                            {task.status === 'DONE'
                              ? 'Selesai'
                              : isDeadline
                                ? 'Hari deadline'
                                : isStart
                                  ? 'Hari mulai'
                                  : task.deadline
                                    ? `Deadline ${formatDate(task.deadline)}`
                                    : 'Deadline belum diatur'}
                          </span>
                        </button>
                      )
                    })}

                    {dayTasks.length > 3 && (
                      <button
                        type="button"
                        className="more-tasks"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleDay(day)
                        }}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={13} />
                            See Less
                          </>
                        ) : (
                          <>
                            +{dayTasks.length - 3} lainnya
                            <ChevronDown size={13} />
                            See All
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="calendar-footer">
        <div>
          <span className="legend-dot purple-dot" />
          In progress
          <span className="legend-dot green-dot" />
          Completed
          <span className="legend-dot orange-dot" />
          Needs attention
        </div>

        <span>{filteredTasks.length} tasks sesuai filter</span>
      </div>
    </section>
  )
}
