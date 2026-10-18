
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
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
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
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return null

    date.setHours(0, 0, 0, 0)
    return date
  }

  if (typeof value === 'number') {
    const date = new Date()
    date.setDate(1)
    date.setDate(value)
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

    return String(a.title || '').localeCompare(String(b.title || ''))
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

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) => String(task.workflowState || '').toUpperCase() !== 'DRAFT'
      ),
    [tasks]
  )

  const projects = useMemo(
    () =>
      [...new Set(activeTasks.map((task) => task.project).filter(Boolean))]
        .sort(),
    [activeTasks]
  )

  const pics = useMemo(
    () =>
      [...new Set(activeTasks.map((task) => task.pic).filter(Boolean))]
        .sort(),
    [activeTasks]
  )

  const types = useMemo(
    () =>
      [...new Set(activeTasks.map((task) => task.type).filter(Boolean))]
        .sort(),
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
      const matchesProject =
        projectFilter === 'ALL' || task.project === projectFilter

      const matchesPic =
        picFilter === 'ALL' || task.pic === picFilter

      const matchesStatus =
        statusFilter === 'ALL' || task.status === statusFilter

      const matchesType =
        typeFilter === 'ALL' || task.type === typeFilter

      const matchesDeadline =
        deadlineFilter === 'ALL' ||
        getDeadlineCategory(task) === deadlineFilter

      const matchesPriority =
        priorityFilter === 'ALL' ||
        normalizePriority(task.priority) === priorityFilter

      const deadlineDate = getDeadlineDate(task)

      const matchesMonth =
        monthFilter === 'ALL' ||
        (deadlineDate &&
          String(deadlineDate.getMonth() + 1) === monthFilter)

      const matchesYear =
        yearFilter === 'ALL' ||
        (deadlineDate &&
          String(deadlineDate.getFullYear()) === yearFilter)

      return (
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
      <section className="welcome-row">
        <div>
          <div className="eyebrow">WORKSPACE / TASK MANAGEMENT</div>
          <h1>
            All Tasks<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Kelola dan pantau semua pekerjaan tim berdasarkan prioritas.
          </p>
        </div>

        <div className="task-page-count">
          <ListTodo size={17} />
          {filteredTasks.length} / {activeTasks.length} tasks
        </div>
      </section>

      <section className="dashboard-panel all-tasks-panel">
        <div className="all-tasks-filters">
          <label className="all-tasks-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Cari judul, kode, project, atau PIC..."
              value={search}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
          </label>

          <div className="all-tasks-filter-grid">
            <label>
              <span>Project</span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="ALL">Semua project</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
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
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">Semua status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
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
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <Flag size={13} /> Prioritas
              </span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="ALL">Semua prioritas</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <CalendarDays size={13} /> Bulan deadline
              </span>
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              >
                <option value="ALL">Semua bulan</option>
                {MONTHS.map((month, index) => (
                  <option key={month} value={String(index + 1)}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Tahun deadline</span>
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="ALL">Semua tahun</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Kondisi deadline</span>
              <select
                value={deadlineFilter}
                onChange={(event) => setDeadlineFilter(event.target.value)}
              >
                <option value="ALL">Semua deadline</option>
                <option value="OVERDUE">Terlambat</option>
                <option value="TODAY">Hari ini</option>
                <option value="THIS_WEEK">7 hari ke depan</option>
                <option value="UPCOMING">Lebih dari 7 hari</option>
                <option value="NO_DATE">Belum ada deadline</option>
              </select>
            </label>
          </div>

          <div className="all-tasks-filter-footer">
            <span>
              <SlidersHorizontal size={14} />
              {filteredTasks.length} task ditemukan
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

        <div className="dashboard-task-list">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  ...task,
                  priority: normalizePriority(task.priority),
                }}
                selected={String(selectedTaskId) === String(task.id)}
                onClick={() => onSelectTask?.(task)}
              />
            ))
          ) : (
            <div className="all-tasks-empty">
              <ListTodo size={28} />
              <h3>Task tidak ditemukan</h3>
              <p>Coba ubah filter atau reset semua filter.</p>
              <button type="button" onClick={resetFilters}>
                Reset filter
              </button>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
