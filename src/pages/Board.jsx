
import { useMemo, useState } from 'react'
import {
  Check,
  CircleDashed,
  ClipboardList,
  Flag,
  GripVertical,
  Plus,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import './Calendar.css'
import { parseDate } from '../utils/dateUtils'

const INITIAL_VISIBLE_TASKS = 5

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

const getPicColor = (pic, pics) => {
  const normalizedPic = String(pic || '').trim().toLowerCase()

  if (!normalizedPic) return 'purple'

  const index = pics.findIndex(
    (item) => String(item).trim().toLowerCase() === normalizedPic
  )

  if (index === -1) return 'purple'

  return PIC_COLORS[index % PIC_COLORS.length]
}

const columns = [
  { status: 'NOT STARTED', title: 'Not Started', color: 'gray' },
  { status: 'START', title: 'In Progress', color: 'blue' },
  { status: 'APPROVAL 1', title: 'Approval 1', color: 'cyan' },
  { status: 'APPROVAL 2', title: 'Approval 2', color: 'purple' },
  { status: 'DONE', title: 'Completed', color: 'green' },
]

const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', className: 'urgent', order: 0 },
  { value: 'HIGH', label: 'High', className: 'high', order: 1 },
  { value: 'MEDIUM', label: 'Medium', className: 'medium', order: 2 },
  { value: 'LOW', label: 'Low', className: 'low', order: 3 },
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
  return String(status || 'NOT STARTED').trim().toUpperCase()
}

function normalizePriority(priority) {
  const normalized = String(priority || 'MEDIUM').toUpperCase()

  return Object.prototype.hasOwnProperty.call(
    PRIORITY_ORDER,
    normalized
  )
    ? normalized
    : 'MEDIUM'
}

function getPriorityInfo(priority) {
  const normalized = normalizePriority(priority)

  return (
    PRIORITIES.find((item) => item.value === normalized) ||
    PRIORITIES[2]
  )
}

function getDeadlineDate(task) {
  if (!task.deadline) return null

  const date = parseDate(task.deadline)

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
}

function getDeadlineCategory(task) {
  const date = getDeadlineDate(task)

  if (!date) return 'NO_DATE'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diff = Math.round(
    (date.getTime() - today.getTime()) / 86400000
  )

  if (diff < 0) return 'OVERDUE'
  if (diff === 0) return 'TODAY'
  if (diff <= 7) return 'THIS_WEEK'

  return 'UPCOMING'
}

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[normalizePriority(a.priority)]
    const priorityB = PRIORITY_ORDER[normalizePriority(b.priority)]

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const dateA = getDeadlineDate(a)
    const dateB = getDeadlineDate(b)

    if (dateA && dateB) {
      const difference = dateA.getTime() - dateB.getTime()
      if (difference !== 0) return difference
    } else if (dateA) {
      return -1
    } else if (dateB) {
      return 1
    }

    return String(a.title || '').localeCompare(
      String(b.title || '')
    )
  })
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

function isTaskOverdue(task, now = new Date()) {
  if (!task?.deadline) return false
  if (task.overdueForgiven === true) return false

  const deadline = getDeadlineDate(task)

  if (!deadline) return false

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  return deadline < today
}

function isTaskCompletedLate(task, now = new Date()) {
  return (
    normalizeStatus(task.status) === 'DONE' &&
    isTaskOverdue(task, now)
  )
}

export default function Board({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onChangeStatus,
  onAddTask,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverStatus, setDragOverStatus] = useState(null)

  const [projectFilter, setProjectFilter] = useState('ALL')
  const [picFilter, setPicFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [deadlineFilter, setDeadlineFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [hideDone, setHideDone] = useState(false)

  const [expandedColumns, setExpandedColumns] = useState({})

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function changeMonth(offset) {
    setCurrentMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    )
    setExpandedColumns({})
  }

  function goToToday() {
    const today = new Date()

    setCurrentMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    )
    setExpandedColumns({})
  }

  const visibleTasks = useMemo(
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
        visibleTasks.map((task) => task.project).filter(Boolean)
      )].sort(),
    [visibleTasks]
  )

  const pics = useMemo(
    () =>
      [...new Set(
        visibleTasks.map((task) => task.pic).filter(Boolean)
      )].sort(),
    [visibleTasks]
  )

  const types = useMemo(
    () =>
      [...new Set(
        visibleTasks.map((task) => task.type).filter(Boolean)
      )].sort(),
    [visibleTasks]
  )

  const monthTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const deadline = getDeadlineDate(task)

      if (!deadline) return false

      return (
        deadline.getMonth() === currentMonth.getMonth() &&
        deadline.getFullYear() === currentMonth.getFullYear()
      )
    })
  }, [visibleTasks, currentMonth])

  const filteredTasks = useMemo(() => {
    const result = monthTasks.filter((task) => {
      const matchesProject =
        projectFilter === 'ALL' || task.project === projectFilter

      const matchesPic =
        picFilter === 'ALL' || task.pic === picFilter

      const matchesType =
        typeFilter === 'ALL' || task.type === typeFilter

      const matchesDeadline =
        deadlineFilter === 'ALL' ||
        getDeadlineCategory(task) === deadlineFilter

      const matchesPriority =
        priorityFilter === 'ALL' ||
        normalizePriority(task.priority) === priorityFilter

      const matchesDone =
        !hideDone || normalizeStatus(task.status) !== 'DONE'

      return (
        matchesProject &&
        matchesPic &&
        matchesType &&
        matchesDeadline &&
        matchesPriority &&
        matchesDone
      )
    })

    return sortTasksByPriority(result)
  }, [
    monthTasks,
    projectFilter,
    picFilter,
    typeFilter,
    deadlineFilter,
    priorityFilter,
    hideDone,
  ])

  function handleDragStart(event, task) {
    setDraggedTaskId(task.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
  }

  function handleDragOver(event, status) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    if (dragOverStatus !== status) {
      setDragOverStatus(status)
    }
  }

  function handleDrop(event, status) {
    event.preventDefault()
    event.stopPropagation()

    const transferredId = event.dataTransfer.getData('text/plain')
    const rawTaskId = transferredId || draggedTaskId

    const task = visibleTasks.find(
      (item) => String(item.id) === String(rawTaskId)
    )

    if (!task) {
      setDraggedTaskId(null)
      setDragOverStatus(null)
      return
    }

    if (normalizeStatus(task.status) !== status) {
      onChangeStatus?.(task.id, status)
    }

    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  function handleDragEnd() {
    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  function toggleColumnExpanded(status) {
    setExpandedColumns((current) => ({
      ...current,
      [status]: !current[status],
    }))
  }

  function resetFilters() {
    setProjectFilter('ALL')
    setPicFilter('ALL')
    setTypeFilter('ALL')
    setDeadlineFilter('ALL')
    setPriorityFilter('ALL')
    setHideDone(false)
    setExpandedColumns({})
  }

  const hasActiveFilters =
    projectFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    deadlineFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    hideDone

  const completedCount = monthTasks.filter(
    (task) => normalizeStatus(task.status) === 'DONE'
  ).length

  return (
    <section className="page-content board-page calendar-panel">
      <div className="board-summary">
        <div className="board-summary-main">
          <div className="board-summary-icon">
            <ClipboardList size={19} />
          </div>

          <div className="board-summary-info">
            <strong>{filteredTasks.length} tasks displayed</strong>
            <span>{visibleTasks.length} total tasks</span>
          </div>

          <div className="board-month-navigation">
            <button
              type="button"
              className="board-month-arrow"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft size={17} />
            </button>

            <strong>{monthLabel}</strong>

            <button
              type="button"
              className="board-month-arrow"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              className="board-today-button"
              onClick={goToToday}
            >
              Today
            </button>
          </div>
        </div>

        <div className="board-summary-bottom">
          <div className="board-summary-completed">
            <Check size={15} />
            {completedCount} completed
          </div>

          <button
            type="button"
            className={`board-hide-done ${hideDone ? 'active' : ''}`}
            onClick={() => setHideDone((value) => !value)}
          >
            {hideDone ? <Eye size={14} /> : <EyeOff size={14} />}
            {hideDone ? 'Show Completed' : 'Hide Completed'}
          </button>
        </div>
      </div>

      <section className="board-filters">
        <div className="board-filters-heading">
          <div>
            <h3>Board Filters</h3>
            <p>Choose which tasks you want to see.</p>
          </div>
        </div>

        <div className="board-filter-grid">
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
            <span>Deadline</span>
            <select
              value={deadlineFilter}
              onChange={(event) => setDeadlineFilter(event.target.value)}
            >
              <option value="ALL">All Deadlines</option>
              <option value="OVERDUE">Overdue</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_WEEK">Within 7 Days</option>
              <option value="UPCOMING">More Than 7 Days Away</option>
              <option value="NO_DATE">No Deadline</option>
            </select>
          </label>

          <label>
            <span>Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="board-filter-footer">
          <span>
            <SlidersHorizontal size={14} />
            {filteredTasks.length} tasks found
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
      </section>

      <div className="kanban-board">
        {columns.map((column) => {
          const columnTasks = sortTasksByPriority(
            filteredTasks.filter(
              (task) => normalizeStatus(task.status) === column.status
            )
          )

          const isExpanded = Boolean(expandedColumns[column.status])

          const displayedTasks = isExpanded
            ? columnTasks
            : columnTasks.slice(0, INITIAL_VISIBLE_TASKS)

          const remainingTasks = Math.max(
            0,
            columnTasks.length - INITIAL_VISIBLE_TASKS
          )

          const isOver = dragOverStatus === column.status

          return (
            <section
              key={column.status}
              className={[
                'kanban-column',
                `kanban-${column.color}`,
                isOver ? 'kanban-column-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(event) => handleDragOver(event, column.status)}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-heading">
                  <span className={`kanban-dot ${column.color}`} />
                  <h3>{column.title}</h3>
                  <span className="kanban-count">
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  className="kanban-add"
                  aria-label={`Add task to ${column.title}`}
                  onClick={onAddTask}
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="kanban-column-body">
                {displayedTasks.map((task) => {
                  const status = normalizeStatus(task.status)
                  const isSelected =
                    String(selectedTaskId) === String(task.id)

                  const isDragging =
                    String(draggedTaskId) === String(task.id)

                  const priority = normalizePriority(task.priority)
                  const progress = getProgress(task)
                  const isDone = status === 'DONE'
                  const isOverdue = isTaskOverdue(task)
                  const isCompletedLate = isTaskCompletedLate(task)

                  const start = task.startDate || task.start

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectTask?.(task)}
                      className={[
                        'task-chip',
                        getPicColor(task.pic, pics),
                        isDone ? 'task-done' : '',
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
                    >
                      <span className="task-card-header">
                        <span className="task-card-pic kanban-card-pic">
                          {task.pic || 'UNASSIGNED'}
                        </span>

                        <span className="task-card-title">
                          {task.title || 'Untitled Task'}
                        </span>

                        <GripVertical className="kanban-grip" size={16} />
                      </span>

                      <span className="task-card-tags">
                        <span
                          className={`task-card-project ${getProjectColor(task.project)}`}
                        >
                          {getProjectLabel(task.project)}
                        </span>

                        <span
                          className={`task-card-type ${getTypeColor(task.type)}`}
                        >
                          {getTypeLabel(task.type)}
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
                        {start && (
                          <span className="task-date-start">
                            START
                          </span>
                        )}

                        {task.deadline && (
                          <span className="task-date-deadline">
                            DEADLINE
                          </span>
                        )}

                        <span className="task-card-deadline-date">
                          {task.deadline ? formatDate(task.deadline) : ''}
                        </span>
                      </span>

                      <span className="task-card-progress-info">
                        <span className="task-card-status">
                          {isOverdue
                            ? 'OVERDUE'
                            : isCompletedLate
                              ? 'DONE · LATE'
                              : getStatusLabel(task.status)}
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
                                : task.deadline
                                  ? `Due ${formatDate(task.deadline)}`
                                  : 'No Deadline Set'}
                      </span>
                    </article>
                  )
                })}

                {columnTasks.length === 0 && (
                  <div className="kanban-empty">
                    <CircleDashed size={20} />
                    <span>Drop tasks here</span>
                  </div>
                )}

                {remainingTasks > 0 && (
                  <button
                    type="button"
                    className="kanban-see-all"
                    onClick={() => toggleColumnExpanded(column.status)}
                  >
                    <span>
                      {isExpanded ? 'Show Less' : `See All (${columnTasks.length})`}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
