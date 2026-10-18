
import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  ListTodo,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  EyeOff,
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

function getDeadlineCategory(task) {
  const value = task.deadline

  if (value === undefined || value === null || value === '') {
    return 'NO DATE'
  }

  let deadline

  if (typeof value === 'number') {
    // Deadline berbentuk angka dianggap tanggal pada bulan ini.
    deadline = new Date()
    deadline.setHours(0, 0, 0, 0)
    deadline.setDate(value)
  } else {
    deadline = new Date(value)

    if (Number.isNaN(deadline.getTime())) {
      return 'NO DATE'
    }

    deadline.setHours(0, 0, 0, 0)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (task.status !== 'DONE' && deadline < today) {
    return 'OVERDUE'
  }

  if (deadline.getTime() === today.getTime()) {
    return 'TODAY'
  }

  const endOfWeek = new Date(today)
  const daysUntilSunday = 7 - endOfWeek.getDay()
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday)
  endOfWeek.setHours(23, 59, 59, 999)

  if (deadline > today && deadline <= endOfWeek) {
    return 'THIS WEEK'
  }

  if (deadline > endOfWeek) {
    return 'UPCOMING'
  }

  return 'OVERDUE'
}

export default function MyTasks({
  tasks = [],
  currentUser = 'Yoga',
  selectedTaskId,
  onSelectTask,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [deadlineFilter, setDeadlineFilter] = useState('ALL')
  const [hideDone, setHideDone] = useState(false)

  const myTasks = useMemo(
    () => tasks.filter((task) => task.pic === currentUser),
    [tasks, currentUser]
  )

  const projectOptions = useMemo(
    () => [...new Set(myTasks.map((task) => task.project).filter(Boolean))].sort(),
    [myTasks]
  )

  const typeOptions = useMemo(
    () => [
      ...new Set(
        myTasks.map((task) => task.contentType || task.type).filter(Boolean)
      ),
    ].sort(),
    [myTasks]
  )

  const filteredTasks = useMemo(() => {
    return myTasks.filter((task) => {
      const statusMatch =
        statusFilter === 'ALL' || task.status === statusFilter

      const projectMatch =
        projectFilter === 'ALL' || task.project === projectFilter

      const typeMatch =
        typeFilter === 'ALL' ||
        (task.contentType || task.type) === typeFilter

      const deadlineMatch =
        deadlineFilter === 'ALL' ||
        getDeadlineCategory(task) === deadlineFilter

      const doneMatch = !hideDone || task.status !== 'DONE'

      return (
        statusMatch &&
        projectMatch &&
        typeMatch &&
        deadlineMatch &&
        doneMatch
      )
    })
  }, [
    myTasks,
    statusFilter,
    projectFilter,
    typeFilter,
    deadlineFilter,
    hideDone,
  ])

  const completed = myTasks.filter(
    (task) => task.status === 'DONE'
  ).length

  const inProgress = myTasks.filter((task) =>
    ['START', 'APPROVAL 1', 'APPROVAL 2', 'REVISION', 'UPLOAD'].includes(
      task.status
    )
  ).length

  const pending = myTasks.filter(
    (task) => task.status === 'NOT STARTED'
  ).length

  const overdue = myTasks.filter(
    (task) =>
      task.status !== 'DONE' &&
      getDeadlineCategory(task) === 'OVERDUE'
  ).length

  function resetFilters() {
    setStatusFilter('ALL')
    setProjectFilter('ALL')
    setTypeFilter('ALL')
    setDeadlineFilter('ALL')
    setHideDone(false)
  }

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    deadlineFilter !== 'ALL' ||
    hideDone

  return (
    <section className="page-content">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">WORKSPACE / MY TASKS</div>
          <h1>
            My Tasks<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Semua pekerjaan yang ditugaskan ke {currentUser}.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <ListTodo size={18} />
          </div>
          <div className="stat-value">{myTasks.length}</div>
          <div className="stat-title">Total tasks</div>
          <div className="stat-note">Task yang ditugaskan ke lu</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan">
            <Clock3 size={18} />
          </div>
          <div className="stat-value">{inProgress}</div>
          <div className="stat-title">In progress</div>
          <div className="stat-note">Termasuk approval dan upload</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-value">{completed}</div>
          <div className="stat-title">Completed</div>
          <div className="stat-note">Task selesai</div>
        </div>
      </section>

      <section className="dashboard-panel my-tasks-panel">
        <div className="panel-heading">
          <div>
            <h2>Assigned to me</h2>
            <p>
              {pending} belum dimulai · {overdue} overdue
            </p>
          </div>
        </div>

        <div className="my-tasks-filters">
          <div className="my-tasks-filter-heading">
            <div>
              <SlidersHorizontal size={15} />
              <strong>Filter tasks</strong>
            </div>

            <span>
              {filteredTasks.length} dari {myTasks.length} task
            </span>
          </div>

          <div className="my-tasks-filter-grid">
            <label className="my-tasks-filter">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Semua status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="my-tasks-filter">
              <span>Project</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="ALL">Semua project</option>
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </label>

            <label className="my-tasks-filter">
              <span>Tipe konten</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">Semua tipe</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="my-tasks-filter">
              <span>Deadline</span>
              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
              >
                <option value="ALL">Semua deadline</option>
                <option value="OVERDUE">Overdue</option>
                <option value="TODAY">Hari ini</option>
                <option value="THIS WEEK">Minggu ini</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="NO DATE">Tanpa deadline</option>
              </select>
            </label>
          </div>

          <div className="my-tasks-filter-footer">
          
<button
  type="button"
  className={`board-hide-done ${hideDone ? 'active' : ''}`}
  onClick={() => setHideDone((value) => !value)}
>
  {hideDone ? <Eye size={14} /> : <EyeOff size={14} />}
  {hideDone ? 'Tampilkan DONE' : 'Sembunyikan DONE'}
</button>


            {hasActiveFilters && (
              <button
                type="button"
                className="my-tasks-reset"
                onClick={resetFilters}
              >
                <RotateCcw size={13} />
                Reset filter
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-task-list">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selected={String(selectedTaskId) === String(task.id)}
                onClick={() => onSelectTask?.(task)}
              />
            ))
          ) : (
            <div className="my-tasks-empty">
              <div className="my-tasks-empty-icon">
                <ListTodo size={24} />
              </div>
              <strong>
                {myTasks.length === 0
                  ? 'Belum ada task'
                  : 'Task tidak ditemukan'}
              </strong>
              <span>
                {myTasks.length === 0
                  ? `Task yang ditugaskan ke ${currentUser} akan muncul di sini.`
                  : 'Coba ubah filter supaya task yang sesuai muncul.'}
              </span>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters}>
                  Reset semua filter
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
