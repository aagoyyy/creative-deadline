
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
} from 'lucide-react'

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
  const value = task.deadline

  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    // Supports legacy numeric deadline values.
    const date = new Date()
    date.setDate(1)
    date.setDate(value)
    date.setHours(0, 0, 0, 0)
    return date
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    date.setHours(0, 0, 0, 0)
    return date
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
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
      [
        ...new Set(
          visibleTasks.map((task) => task.project).filter(Boolean)
        ),
      ].sort(),
    [visibleTasks]
  )

  const pics = useMemo(
    () =>
      [
        ...new Set(
          visibleTasks.map((task) => task.pic).filter(Boolean)
        ),
      ].sort(),
    [visibleTasks]
  )

  const types = useMemo(
    () =>
      [
        ...new Set(
          visibleTasks.map((task) => task.type).filter(Boolean)
        ),
      ].sort(),
    [visibleTasks]
  )

  const filteredTasks = useMemo(() => {
    const result = visibleTasks.filter((task) => {
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

      const matchesDone = !hideDone || task.status !== 'DONE'

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
    visibleTasks,
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

    if (task.status !== status) {
      onChangeStatus?.(task.id, status)
    }

    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  function handleDragEnd() {
    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  function resetFilters() {
    setProjectFilter('ALL')
    setPicFilter('ALL')
    setTypeFilter('ALL')
    setDeadlineFilter('ALL')
    setPriorityFilter('ALL')
    setHideDone(false)
  }

  const hasActiveFilters =
    projectFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    deadlineFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    hideDone

  const completedCount = visibleTasks.filter(
    (task) => task.status === 'DONE'
  ).length

  return (
    <section className="page-content board-page">
      <div className="board-summary">
        <div className="board-summary-icon">
          <ClipboardList size={19} />
        </div>

        <div>
          <strong>{filteredTasks.length} tasks displayed</strong>
          <span>{visibleTasks.length} total tasks</span>
        </div>

        <div className="board-summary-completed">
          <Check size={15} />
          {completedCount} completed
        </div>
      </div>

      <section className="board-filters">
        <div className="board-filters-heading">
          <div>
            <h3>Board Filters</h3>
            <p>Choose which tasks you want to see.</p>
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
              (task) => task.status === column.status
            )
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
                {columnTasks.map((task) => {
                  const isSelected =
                    String(selectedTaskId) === String(task.id)

                  const isDragging =
                    String(draggedTaskId) === String(task.id)

                  const priority = getPriorityInfo(task.priority)

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectTask?.(task)}
                      className={[
                        'kanban-card',
                        isSelected ? 'kanban-card-selected' : '',
                        isDragging ? 'kanban-card-dragging' : '',
                        task.status === 'DONE' ? 'task-done' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="kanban-card-top">
                        <span
                          className={`kanban-type ${task.color || 'purple'}`}
                        >
                          {task.type || 'Task'}
                        </span>

                        <GripVertical className="kanban-grip" size={16} />
                      </div>

                      <div className="kanban-card-priority-row">
                        <span
                          className={`priority-badge priority-${priority.className}`}
                        >
                          <Flag size={11} />
                          {priority.label}
                        </span>
                      </div>

                      <h4>{task.title || 'Untitled Task'}</h4>

                      <div className="kanban-card-code">
                        {task.code}
                      </div>

                      <div className="kanban-card-meta">
                        <span className="kanban-pic">
                          {(task.pic || '?').charAt(0)}
                        </span>

                        <span>{task.pic || 'Unassigned'}</span>

                        <span className="kanban-deadline">
                          {typeof task.deadline === 'number'
                            ? `Oct ${task.deadline}`
                            : task.deadline || 'No deadline'}
                        </span>
                      </div>

                      <div className="kanban-progress-track">
                        <div
                          className="kanban-progress-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, task.progress || 0)
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="kanban-card-footer">
                        <span>{task.progress || 0}% complete</span>

                        {task.status === 'DONE' && <Check size={14} />}
                      </div>
                    </article>
                  )
                })}

                {columnTasks.length === 0 && (
                  <div className="kanban-empty">
                    <CircleDashed size={20} />
                    <span>Drop tasks here</span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
