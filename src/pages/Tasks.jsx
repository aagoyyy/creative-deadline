
import { useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  ListTodo,
  CalendarDays,
  Flag,
  X,
} from 'lucide-react'

import TaskCard from '../components/TaskCard'
import '../pages/Tasks.css'

const STATUS_OPTIONS = [
  'NOT STARTED',
  'START',
  'APPROVAL 1',
  'APPROVAL 2',
  'REVISION',
  'UPLOAD',
  'DONE',
]

const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const PRIORITY_ORDER = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function normalizeStatus(status) {
  return String(status || 'NOT STARTED')
    .trim()
    .toUpperCase()
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

function getDeadlineDate(task) {
  const value = task.deadline

  if (value === null || value === undefined || value === '') {
    return null
  }

  let date

  if (value instanceof Date) {
    date = new Date(value)
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(value)
    }
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    return null
  }

  if (Number.isNaN(date.getTime())) return null

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
}

function getCompletionDate(task) {
  const value =
    task.completedAt ??
    task.completed_at ??
    task.doneAt ??
    task.finishedAt ??
    task.completedDate ??
    task.completed_date

  if (!value) return null

  let date

  if (value instanceof Date) {
    date = new Date(value)
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(value)
    }
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    return null
  }

  if (Number.isNaN(date.getTime())) return null

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
}

function getDeadlineCategory(task) {
  const deadline = getDeadlineDate(task)

  if (!deadline) return 'NO_DATE'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diff = Math.round(
    (deadline.getTime() - today.getTime()) / 86400000
  )

  if (diff < 0) return 'OVERDUE'
  if (diff === 0) return 'TODAY'
  if (diff <= 7) return 'THIS_WEEK'

  return 'UPCOMING'
}

function getTaskPriorityGroup(task, today) {
  const status = normalizeStatus(task.status)
  const workflowState = String(
    task.workflowState || ''
  ).toUpperCase()

  const deadline = getDeadlineDate(task)
  const completedDate = getCompletionDate(task)

  const isDraft = workflowState === 'DRAFT'
  const isDone = status === 'DONE'
  const isForgiven = task.overdueForgiven === true

  const isOverdue =
    Boolean(deadline) &&
    deadline < today &&
    !isDraft &&
    !isDone &&
    !isForgiven

  // 0: overdue aktif
  if (isOverdue) return 0

  // 1: deadline hari ini, belum selesai dan bukan draft/forgiven
  if (
    deadline &&
    deadline.getTime() === today.getTime() &&
    !isDraft &&
    !isDone &&
    !isForgiven
  ) {
    return 1
  }

  // 2: task aktif lainnya, termasuk task yang menunggu approval
  if (!isDraft && !isDone && !isForgiven) return 2

  // 3: task selesai, termasuk DONE LATE
  if (isDone) {
    // Completion date tetap dibaca agar field yang tersedia
    // konsisten dengan data task, tanpa mengubah statusnya.
    void completedDate
    return 3
  }

  // 4: forgiven
  if (isForgiven) return 4

  // 5: draft
  if (isDraft) return 5

  return 2
}

function sortTasksByPriority(tasks) {
  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  return [...tasks].sort((a, b) => {
    const priorityA = getTaskPriorityGroup(a, today)
    const priorityB = getTaskPriorityGroup(b, today)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const deadlineA = getDeadlineDate(a)
    const deadlineB = getDeadlineDate(b)

    // Task tanpa deadline diletakkan setelah task dengan deadline
    // dalam kelompok prioritas yang sama.
    if (deadlineA && !deadlineB) return -1
    if (!deadlineA && deadlineB) return 1

    if (deadlineA && deadlineB) {
      const dateDifference =
        deadlineA.getTime() - deadlineB.getTime()

      if (dateDifference !== 0) {
        return dateDifference
      }
    }

    // Jika deadline sama, prioritas task lebih tinggi dahulu.
    const taskPriorityDifference =
      PRIORITY_ORDER[normalizePriority(a.priority)] -
      PRIORITY_ORDER[normalizePriority(b.priority)]

    if (taskPriorityDifference !== 0) {
      return taskPriorityDifference
    }

    // Jika semuanya sama, urutkan berdasarkan judul A–Z.
    return String(a.title || '').localeCompare(
      String(b.title || '')
    )
  })
}

export default function Tasks({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  search = '',
  onSearchChange,
}) {
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [picFilter, setPicFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [deadlineFilter, setDeadlineFilter] = useState('ALL')
  const [monthFilter, setMonthFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Draft tidak ditampilkan di daftar All Tasks.
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
      [
        ...new Set(
          activeTasks.map((task) => task.project).filter(Boolean)
        ),
      ].sort(),
    [activeTasks]
  )

  const pics = useMemo(
    () =>
      [
        ...new Set(
          activeTasks.map((task) => task.pic).filter(Boolean)
        ),
      ].sort(),
    [activeTasks]
  )

  const types = useMemo(
    () =>
      [
        ...new Set(
          activeTasks.map((task) => task.type).filter(Boolean)
        ),
      ].sort(),
    [activeTasks]
  )

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()

    const availableYears = new Set(
      Array.from({ length: 5 }, (_, index) =>
        String(currentYear - 2 + index)
      )
    )

    activeTasks.forEach((task) => {
      const date = getDeadlineDate(task)

      if (date) {
        availableYears.add(String(date.getFullYear()))
      }
    })

    return [...availableYears].sort()
  }, [activeTasks])

  const filteredTasks = useMemo(() => {
    const result = activeTasks.filter((task) => {
      const matchesSearch =
        !search ||
        [task.title, task.code, task.project, task.pic].some(
          (value) =>
            String(value || '')
              .toLowerCase()
              .includes(search.toLowerCase())
        )

      const matchesProject =
        projectFilter === 'ALL' ||
        task.project === projectFilter

      const matchesPic =
        picFilter === 'ALL' ||
        task.pic === picFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        normalizeStatus(task.status) === statusFilter

      const matchesType =
        typeFilter === 'ALL' ||
        task.type === typeFilter

      const matchesDeadline =
        deadlineFilter === 'ALL' ||
        getDeadlineCategory(task) === deadlineFilter

      const matchesPriority =
        priorityFilter === 'ALL' ||
        normalizePriority(task.priority) === priorityFilter

      const deadlineDate = getDeadlineDate(task)

      const matchesMonth =
        monthFilter === 'ALL' ||
        (
          deadlineDate &&
          String(deadlineDate.getMonth() + 1) === monthFilter
        )

      const matchesYear =
        yearFilter === 'ALL' ||
        (
          deadlineDate &&
          String(deadlineDate.getFullYear()) === yearFilter
        )

      return (
        matchesSearch &&
        matchesProject &&
        matchesPic &&
        matchesStatus &&
        matchesType &&
        matchesDeadline &&
        matchesPriority &&
        matchesMonth &&
        matchesYear
      )
    })

    return sortTasksByPriority(result)
  }, [
    activeTasks,
    search,
    projectFilter,
    picFilter,
    statusFilter,
    typeFilter,
    deadlineFilter,
    monthFilter,
    yearFilter,
    priorityFilter,
  ])

  const hasActiveFilters =
    Boolean(search) ||
    projectFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    deadlineFilter !== 'ALL' ||
    monthFilter !== 'ALL' ||
    yearFilter !== 'ALL' ||
    priorityFilter !== 'ALL'

  function resetFilters() {
    setIsFiltersOpen(false)
    setProjectFilter('ALL')
    setPicFilter('ALL')
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setDeadlineFilter('ALL')
    setMonthFilter('ALL')
    setYearFilter('ALL')
    setPriorityFilter('ALL')
    onSearchChange?.('')
  }

  return (
    <section className="page-content">
      <section className="dashboard-panel all-tasks-panel">
        {/* MOBILE FILTER TRIGGER */}
        <button
          type="button"
          className={`all-tasks-mobile-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
          onClick={() => setIsFiltersOpen(true)}
          aria-label="Open task filters"
        >
          <SlidersHorizontal size={15} />
          Filters
          {hasActiveFilters && <span className="all-tasks-filter-active-dot" />}
        </button>

        {/* TASK FILTERS */}
        <div
          className={`all-tasks-filter-overlay ${isFiltersOpen ? 'is-mobile-open' : ''}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsFiltersOpen(false)
          }}
        >
          <div className="all-tasks-filters">
            <div className="all-tasks-filter-dialog-heading">
              <strong>Filters</strong>
              <button
                type="button"
                className="all-tasks-filter-close"
                onClick={() => setIsFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
          <label className="all-tasks-search">
            <Search size={16} />

            <input
              type="search"
              placeholder="Search by title, code, project, or PIC..."
              value={search}
              onChange={(event) =>
                onSearchChange?.(event.target.value)
              }
            />
          </label>

          <div className="all-tasks-filter-grid">
            <label>
              <span>Project</span>

              <select
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(event.target.value)
                }
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
              <span>Creative PIC</span>

              <select
                value={picFilter}
                onChange={(event) =>
                  setPicFilter(event.target.value)
                }
              >
                <option value="ALL">All PICs</option>

                {pics.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">All Statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Content Type</span>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
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
              <span>
                <Flag size={13} />
                Priority
              </span>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
              >
                <option value="ALL">All Priorities</option>

                {PRIORITIES.map((priority) => (
                  <option
                    key={priority.value}
                    value={priority.value}
                  >
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <CalendarDays size={13} />
                Deadline Month
              </span>

              <select
                value={monthFilter}
                onChange={(event) =>
                  setMonthFilter(event.target.value)
                }
              >
                <option value="ALL">All Months</option>

                {MONTHS.map((month, index) => (
                  <option
                    key={month}
                    value={String(index + 1)}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Deadline Year</span>

              <select
                value={yearFilter}
                onChange={(event) =>
                  setYearFilter(event.target.value)
                }
              >
                <option value="ALL">All Years</option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Deadline Status</span>

              <select
                value={deadlineFilter}
                onChange={(event) =>
                  setDeadlineFilter(event.target.value)
                }
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue</option>
                <option value="TODAY">Due Today</option>
                <option value="THIS_WEEK">Within 7 Days</option>
                <option value="UPCOMING">
                  More Than 7 Days Away
                </option>
                <option value="NO_DATE">No Deadline</option>
              </select>
            </label>
          </div>

          <div className="all-tasks-filter-footer">
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
          </div>
        </div>

        {/* TASK LIST */}
        <div className="dashboard-task-list">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  ...task,
                  priority: normalizePriority(task.priority),
                }}
                selected={
                  String(selectedTaskId) === String(task.id)
                }
                onClick={() => onSelectTask?.(task)}
              />
            ))
          ) : (
            <div className="all-tasks-empty">
              <ListTodo size={28} />
              <h3>No Tasks Found</h3>
              <p>
                Try changing your filters or resetting all filters.
              </p>

              <button
                type="button"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
