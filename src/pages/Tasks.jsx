
import { useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  ListTodo,
  CalendarDays,
  Flag,
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

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()

    if (Number.isNaN(date.getTime())) return null

    date.setHours(0, 0, 0, 0)
    return date
  }

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      const date = new Date(year, month - 1, day)

      if (Number.isNaN(date.getTime())) return null

      date.setHours(0, 0, 0, 0)
      return date
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return null

    date.setHours(0, 0, 0, 0)
    return date
  }

  if (typeof value === 'number') {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return null

    date.setHours(0, 0, 0, 0)
    return date
  }

  return null
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

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const priorityA =
      PRIORITY_ORDER[normalizePriority(a.priority)]

    const priorityB =
      PRIORITY_ORDER[normalizePriority(b.priority)]

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
        task.status === statusFilter

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
        {/* TASK FILTERS */}
        <div className="all-tasks-filters">
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
