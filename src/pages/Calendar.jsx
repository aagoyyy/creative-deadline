
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
import './Calendar.css'
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
  START: 25,
  'APPROVAL 1': 50,
  'APPROVAL 2': 75,
  DONE: 100,
}

function normalizeStatus(status) {
  return String(status || 'NOT STARTED')
    .trim()
    .toUpperCase()
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
    const doneA = normalizeStatus(a.status) === 'DONE'
    const doneB = normalizeStatus(b.status) === 'DONE'

    // Task DONE selalu berada di paling bawah.
    if (doneA !== doneB) {
      return doneA ? 1 : -1
    }

    // Task lainnya tetap diurutkan berdasarkan prioritas.
    const priorityA =
      PRIORITY_ORDER[normalizePriority(a.priority)]
    const priorityB =
      PRIORITY_ORDER[normalizePriority(b.priority)]

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Jika prioritas sama, deadline yang lebih dekat didahulukan.
    const deadlineA = String(a.deadline || '9999-12-31')
    const deadlineB = String(b.deadline || '9999-12-31')

    if (deadlineA !== deadlineB) {
      return deadlineA.localeCompare(deadlineB)
    }

    // Jika masih sama, urutkan berdasarkan judul.
    return String(a.title || '').localeCompare(
      String(b.title || '')
    )
  })
}


function matchesCalendarDate(value, day, year, month) {
  if (!value || !day) return false

  const date = parseDate(value)

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false
  }

  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  )
}

/**
 * Overdue rules:
 * - Deadline must be before today.
 * - Task must not be DONE.
 * - Task must not have been forgiven by Admin.
 *
 * A DONE task stays in its completed color, even if completed late.
 */

function isTaskLate(task, now = new Date()) {
  if (!task?.deadline) return false
  if (task.overdueForgiven === true) return false

  const deadline = parseDate(task.deadline)

  if (!deadline || normalizeStatus(task.status) === 'DONE') {
    return false
  }

  const todayDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const deadlineDate = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  )

  return deadlineDate < todayDate
}

function isTaskOverdue(task, now = new Date()) {
  return isTaskLate(task, now)
}

function isTaskCompletedLate(task) {
  if (normalizeStatus(task?.status) !== 'DONE') return false
  if (task.overdueForgiven === true) return false
  if (!task?.deadline || !task?.completedAt) return false

  const deadline = parseDate(task.deadline)
  const completedAt = parseDate(task.completedAt)

  if (!deadline || !completedAt) return false

  const deadlineDate = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  )

  const completedDate = new Date(
    completedAt.getFullYear(),
    completedAt.getMonth(),
    completedAt.getDate()
  )

  return completedDate > deadlineDate
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

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  })
}

function getProgress(task) {
  const status = normalizeStatus(task.status)

  if (status === 'DONE') return 100

  const value = Number(task.progress)

  if (
    task.progress !== undefined &&
    task.progress !== null &&
    task.progress !== '' &&
    Number.isFinite(value)
  ) {
    return Math.max(0, Math.min(100, value))
  }

  return STATUS_PROGRESS[status] ?? 0
}

function getStatusLabel(status) {
  const labels = {
    'NOT STARTED': 'Not Started',
    START: 'In Progress',
    'APPROVAL 1': 'Approval 1',
    'APPROVAL 2': 'Approval 2',
    DONE: 'Completed',
  }

  const normalized = normalizeStatus(status)

  return labels[normalized] || status || 'Not Started'
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
  'yellow',
  'orange',
  'green',
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
  if (!type) return 'TYPE -'

  const value = String(type).trim().toUpperCase()

  if (value.includes('SINGLE')) return 'SINGLE IMAGE'
  if (value.includes('CAROUSEL')) return 'CAROUSEL'
  if (value.includes('VIDEO')) return 'VIDEO'

  return type
}
function getProjectColor(project) {
  const value = String(project || '').trim().toUpperCase()

  if (value.includes('ORGANIC')) return 'organic'
  if (value.includes('SMM')) return 'smm'
  if (value.includes('BIG PROJECT')) return 'big-project'

  return 'other-project'
}

function getTypeColor(type) {
  const value = String(type || '').trim().toUpperCase()

  if (value.includes('VIDEO')) return 'video'
  if (value.includes('CAROUSEL')) return 'carousel'
  if (value.includes('SINGLE')) return 'single-image'

  return 'other-type'
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

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          String(task.workflowState || '').toUpperCase() !== 'DRAFT'
      ),
    [tasks]
  )

  const projects = useMemo(
    () =>
      [...new Set(
        activeTasks
          .map((task) => task.project)
          .filter(Boolean)
      )].sort(),
    [activeTasks]
  )

  const pics = useMemo(
    () =>
      [...new Set(
        activeTasks
          .map((task) => task.pic)
          .filter(Boolean)
      )].sort(),
    [activeTasks]
  )

  const types = useMemo(
    () =>
      [...new Set(
        activeTasks
          .map((task) => task.type)
          .filter(Boolean)
      )].sort(),
    [activeTasks]
  )

  const filteredTasks = useMemo(() => {
    const filtered = activeTasks.filter((task) => {
      const taskStatus = normalizeStatus(task.status)

      return (
        (projectFilter === 'ALL' || task.project === projectFilter) &&
        (picFilter === 'ALL' || task.pic === picFilter) &&
        (typeFilter === 'ALL' || task.type === typeFilter) &&
        (statusFilter === 'ALL' || taskStatus === statusFilter) &&
        (priorityFilter === 'ALL' ||
          normalizePriority(task.priority) === priorityFilter)
      )
    })

    return sortTasksByPriority(filtered)
  }, [
    activeTasks,
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
            <h3>Calendar Filters</h3>
            <p>Filter tasks based on your needs.</p>
          </div>
        </div>

        <div className="calendar-filter-grid">
          <label>
            <span>Project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="ALL">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Creative Assignee</span>
            <select
              value={picFilter}
              onChange={(event) => setPicFilter(event.target.value)}
            >
              <option value="ALL">All Creatives</option>
              {pics.map((pic) => (
                <option key={pic} value={pic}>
                  {pic}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Content Type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="ALL">All Content Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">All Priorities</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Date Type</span>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            >
              <option value="ALL">Start Date & Deadline</option>
              <option value="START">Start Date Only</option>
              <option value="DEADLINE">Deadline Only</option>
            </select>
          </label>
        </div>

        <div className="calendar-filter-footer">
          <span>
            <SlidersHorizontal size={14} />
            {filteredTasks.length} tasks match the filters
          </span>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw size={13} />
            Reset Filters
          </button>
        </div>
      </div>

      <div className="calendar-grid-scroll">
        <div className="calendar-grid">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, dayIndex) => (
          <div
            className={`weekday ${dayIndex >= 5 ? 'weekend-weekday' : ''}`}
            key={day}
          >
            {day}
          </div>
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
                index % 7 >= 5 ? 'weekend-day' : '',
                !day ? 'empty-day' : '',
                isToday ? 'today-cell' : '',
                day && dragOverDay === day ? 'drag-over' : '',
                isExpanded ? 'day-cell-expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
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
                      <span className="day-task-count">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="day-tasks">
                    {visibleDayTasks.map((task) => {
                      const isSelected =
                        String(selectedTaskId) === String(task.id)

                      const start = task.startDate || task.start

                      const isStart = matchesCalendarDate(
                        start,
                        day,
                        year,
                        month
                      )

                      const isDeadline = matchesCalendarDate(
                        task.deadline,
                        day,
                        year,
                        month
                      )

                      const isDragging = dragTaskId === String(task.id)
                      const progress = getProgress(task)
                      const statusLabel = getStatusLabel(task.status)
                      const projectLabel = getProjectLabel(task.project)
                      const typeLabel = getTypeLabel(task.type)
                      const priority = normalizePriority(task.priority)
                      const status = normalizeStatus(task.status)
                      const isDone = status === 'DONE'
                      const isOverdue = isTaskOverdue(task)
                      const isCompletedLate = isTaskCompletedLate(task)

                      return (
                        <button
                          type="button"
                          key={task.id}
                          draggable={
                            Boolean(onMoveDeadline) &&
                            isDeadline &&
                            dateFilter !== 'START'
                          }
                          onDragStart={(event) =>
                            handleDragStart(event, task)
                          }
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectTask?.(task)}
                          className={[
                            'task-chip',
                            getPicColor(task.pic, pics),
                            'task-card-readable',

                            // DONE always keeps its completed styling.
                            isDone ? 'task-done' : '',

                            // Only active, un-forgiven overdue tasks are red.
                            isOverdue ? 'task-overdue' : '',
                            isCompletedLate ? 'task-completed-late' : '',

                            task.overdueForgiven === true
                              ? 'task-overdue-forgiven'
                              : '',

                            isSelected ? 'task-selected' : '',
                            isDragging ? 'task-dragging' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          title={
                            task.overdueForgiven === true
                              ? `${task.title || 'Untitled Task'} — overdue forgiven by Admin`
                              : isOverdue
                                ? `${task.title || 'Untitled Task'} — overdue`
                                : onMoveDeadline && isDeadline
                                  ? `${task.title || 'Untitled Task'} — drag to another date to move the deadline`
                                  : task.title || 'Untitled Task'
                          }
                        >
                          <span className="task-card-header">
                            <span className="task-card-pic">
                              {task.pic || 'UNASSIGNED'}
                            </span>

                            <span className="task-card-title">
                              {task.title || 'Untitled Task'}
                            </span>
                          </span>

                          <span className="task-card-tags">
                          <span
                              className={`task-card-project ${getProjectColor(task.project)}`}>
                              {projectLabel}
                            </span>

                            <span
                              className={`task-card-type ${getTypeColor(task.type)}`}>
                              {typeLabel}
                            </span>
                          </span>

                          <span className="task-card-priority-row">
                            <span
                              className={`priority-badge priority-${priority.toLowerCase()}`}
                            >
                              <Flag size={11} />
                              {priority}
                            </span>
                          </span>

                          <span className="task-card-dates">
                            {isStart && (
                              <span className="task-date-start">
                                START
                              </span>
                            )}

                            {isDeadline && (
                              <span className="task-date-deadline">
                                DEADLINE
                              </span>
                            )}

                            <span className="task-card-deadline-date">
                              {isDeadline ? formatDate(task.deadline) : ''}
                            </span>
                          </span>

                          <span className="task-card-progress-info">
                            <span className="task-card-status">
                              {isOverdue
                                ? 'OVERDUE'
                                : isCompletedLate
                                  ? 'DONE · LATE'
                                  : statusLabel}
                            </span>

                            <strong>{progress}%</strong>
                          </span>


                          <span className="task-progress-track">
                            <span
                              className="task-progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </span>

<span className="task-card-footer">
  {isCompletedLate
    ? 'Completed Late'
    : isDone
      ? 'Completed'
      : task.overdueForgiven === true
        ? 'Overdue Forgiven'
        : isOverdue
          ? 'Overdue'
          : isDeadline
            ? 'Deadline Day'
            : isStart
              ? 'Start Day'
              : task.deadline
                ? `Due ${formatDate(task.deadline)}`
                : 'No Deadline Set'}
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
                            +{dayTasks.length - 3} more
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
      </div>

      <div className="calendar-footer">
        <div>

        </div>

        <span>{filteredTasks.length} tasks match the filters</span>
      </div>
    </section>
  )
}
