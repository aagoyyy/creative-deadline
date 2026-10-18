
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  TrendingUp,
  AlertTriangle,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'

import StatCard from '../components/StatCard'
import TaskCard from '../components/TaskCard'

const WORKFLOW = [
  { status: 'NOT STARTED', label: 'Not Started' },
  { status: 'START', label: 'In Progress' },
  { status: 'APPROVAL 1', label: 'Approval 1' },
  { status: 'APPROVAL 2', label: 'Approval 2' },
  { status: 'REVISION', label: 'Revision' },
  { status: 'UPLOAD', label: 'Upload' },
  { status: 'DONE', label: 'Completed' },
]

function getDeadlineDate(task) {
  const value = task.deadline

  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    // Format angka hanya menyimpan hari, jadi diasumsikan bulan ini.
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(value)
    return date
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
}

function getDeadlineCategory(task) {
  const deadline = getDeadlineDate(task)

  if (!deadline) return 'NO DATE'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (task.status !== 'DONE' && deadline < today) return 'OVERDUE'
  if (deadline.getTime() === today.getTime()) return 'TODAY'

  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
  endOfWeek.setHours(23, 59, 59, 999)

  if (deadline > today && deadline <= endOfWeek) return 'THIS WEEK'
  if (deadline > endOfWeek) return 'UPCOMING'

  return 'OVERDUE'
}

function formatDeadline(task) {
  const date = getDeadlineDate(task)

  if (!date) return 'No deadline'

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Dashboard({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onNavigate,
  onAddTask,
}) {
  const [projectFilter, setProjectFilter] = useState('ALL')

  const projectOptions = useMemo(
    () =>
      [...new Set(tasks.map((task) => task.project).filter(Boolean))].sort(),
    [tasks]
  )

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          projectFilter === 'ALL' || task.project === projectFilter
      ),
    [tasks, projectFilter]
  )

  const totalTasks = filteredTasks.length

  const inProgress = filteredTasks.filter((task) =>
    ['START', 'APPROVAL 1', 'APPROVAL 2', 'REVISION', 'UPLOAD'].includes(
      task.status
    )
  ).length

  const completed = filteredTasks.filter(
    (task) => task.status === 'DONE'
  ).length

  const awaitingApproval = filteredTasks.filter((task) =>
    ['APPROVAL 1', 'APPROVAL 2'].includes(task.status)
  ).length

  const overdueTasks = filteredTasks
    .filter(
      (task) =>
        task.status !== 'DONE' &&
        getDeadlineCategory(task) === 'OVERDUE'
    )
    .sort(
      (a, b) =>
        (getDeadlineDate(a)?.getTime() ?? Infinity) -
        (getDeadlineDate(b)?.getTime() ?? Infinity)
    )

  const upcomingTasks = filteredTasks
    .filter(
      (task) =>
        ['TODAY', 'THIS WEEK', 'UPCOMING'].includes(
          getDeadlineCategory(task)
        ) && task.status !== 'DONE'
    )
    .sort(
      (a, b) =>
        (getDeadlineDate(a)?.getTime() ?? Infinity) -
        (getDeadlineDate(b)?.getTime() ?? Infinity)
    )
    .slice(0, 5)

  const recentTasks = [...filteredTasks]
    .sort(
      (a, b) =>
        (getDeadlineDate(a)?.getTime() ?? Infinity) -
        (getDeadlineDate(b)?.getTime() ?? Infinity)
    )
    .slice(0, 5)

  const completionRate = totalTasks
    ? Math.round((completed / totalTasks) * 100)
    : 0

  function resetFilters() {
    setProjectFilter('ALL')
  }

  return (
    <section className="page-content dashboard-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">WORKSPACE / OVERVIEW</div>

          <h1>
            Good evening<span className="heading-period">.</span>
          </h1>

          <p className="page-subtitle">
            Pantau progres dan deadline pekerjaan creative team.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onAddTask}
        >
          <span>+</span>
          New task
        </button>
      </section>

      <section className="dashboard-overview-filters">
        <div className="dashboard-overview-filter-title">
          <SlidersHorizontal size={15} />
          <strong>Overview filters</strong>
        </div>

        <div className="dashboard-overview-filter-controls">
          <label>
            <span>Project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="ALL">Semua project</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </label>

          {projectFilter !== 'ALL' && (
            <button
              type="button"
              className="dashboard-overview-reset"
              onClick={resetFilters}
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="TOTAL TASKS"
          value={totalTasks}
          icon={ListTodo}
          trend="All assigned work"
          color="purple"
        />

        <StatCard
          label="IN PROGRESS"
          value={inProgress}
          icon={TrendingUp}
          trend="Including approval & upload"
          color="blue"
        />

        <StatCard
          label="AWAITING APPROVAL"
          value={awaitingApproval}
          icon={Clock3}
          trend="Needs review"
          color="orange"
        />

        <StatCard
          label="COMPLETED"
          value={completed}
          icon={CheckCircle2}
          trend={`${completionRate}% of all tasks`}
          color="green"
        />
      </section>

      <section className="dashboard-alert-grid">
        <button
          type="button"
          className="dashboard-alert-card overdue-alert"
          onClick={() => onNavigate?.('All Tasks')}
        >
          <div className="dashboard-alert-icon">
            <AlertTriangle size={19} />
          </div>

          <div className="dashboard-alert-copy">
            <span>OVERDUE TASKS</span>
            <strong>{overdueTasks.length}</strong>
            <small>Task melewati deadline</small>
          </div>

          <ArrowRight size={17} />
        </button>

        <button
          type="button"
          className="dashboard-alert-card upcoming-alert"
          onClick={() => onNavigate?.('Calendar')}
        >
          <div className="dashboard-alert-icon">
            <CalendarDays size={19} />
          </div>

          <div className="dashboard-alert-copy">
            <span>UPCOMING DEADLINES</span>
            <strong>{upcomingTasks.length}</strong>
            <small>Hari ini dan deadline berikutnya</small>
          </div>

          <ArrowRight size={17} />
        </button>
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Tasks</h2>
              <p>Daftar pekerjaan dan progres terbarunya.</p>
            </div>

            <button
              type="button"
              className="view-all-button"
              onClick={() => onNavigate?.('All Tasks')}
            >
              View all
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="dashboard-task-list">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={String(selectedTaskId) === String(task.id)}
                  onClick={() => onSelectTask?.(task)}
                />
              ))
            ) : (
              <div className="dashboard-empty">
                <ListTodo size={25} />
                <strong>Belum ada task</strong>
                <span>
                  {projectFilter === 'ALL'
                    ? 'Buat task pertama untuk mulai memantau pekerjaan.'
                    : 'Belum ada task untuk project ini.'}
                </span>
              </div>
            )}
          </div>

          {recentTasks.length > 0 && (
            <button
              type="button"
              className="view-all-button"
              onClick={() => onNavigate?.('All Tasks')}
            >
              Lihat semua task
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        <div className="dashboard-side-column">
          <div className="dashboard-panel completion-panel">
            <div className="panel-heading">
              <div>
                <h2>Completion</h2>
                <p>Ringkasan penyelesaian task.</p>
              </div>

              <CalendarDays size={19} />
            </div>

            <div className="completion-number">
              <strong>{completionRate}%</strong>
              <span>completed</span>
            </div>

            <div className="completion-track">
              <div
                className="completion-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="completion-legend">
              <span>
                <i className="legend-dot completed-dot" />
                Completed
              </span>
              <strong>{completed} / {totalTasks}</strong>
            </div>

            <div className="completion-legend">
              <span>
                <i className="legend-dot remaining-dot" />
                Remaining
              </span>
              <strong>{totalTasks - completed}</strong>
            </div>
          </div>

          <div className="dashboard-panel workflow-panel">
            <div className="panel-heading">
              <div>
                <h2>Workflow</h2>
                <p>Distribusi task per status.</p>
              </div>
            </div>

            {WORKFLOW.map((item) => {
              const count = filteredTasks.filter(
                (task) => task.status === item.status
              ).length

              const percentage = totalTasks
                ? (count / totalTasks) * 100
                : 0

              return (
                <div className="workflow-row" key={item.status}>
                  <div className="workflow-label">
                    <span>{item.label}</span>
                    <strong>{count}</strong>
                  </div>

                  <div className="workflow-track">
                    <div
                      className={`workflow-fill workflow-${item.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-panel dashboard-deadlines-panel">
        <div className="panel-heading">
          <div>
            <h2>Deadline Monitor</h2>
            <p>Task yang perlu diperhatikan berdasarkan deadline.</p>
          </div>
        </div>

        <div className="dashboard-deadline-columns">
          <div className="dashboard-deadline-group">
            <div className="dashboard-deadline-heading">
              <AlertTriangle size={16} />
              <strong>Overdue</strong>
              <span>{overdueTasks.length}</span>
            </div>

            {overdueTasks.length > 0 ? (
              overdueTasks.slice(0, 5).map((task) => (
                <button
                  type="button"
                  key={task.id}
                  className="dashboard-deadline-item"
                  onClick={() => onSelectTask?.(task)}
                >
                  <span className="dashboard-deadline-item-copy">
                    <strong>{task.title || task.name || 'Untitled task'}</strong>
                    <small>{task.pic || 'Belum ada PIC'}</small>
                  </span>
                  <span className="dashboard-deadline-date">
                    {formatDeadline(task)}
                  </span>
                </button>
              ))
            ) : (
              <div className="dashboard-deadline-empty">
                Tidak ada task overdue. Mantap!
              </div>
            )}
          </div>

          <div className="dashboard-deadline-group">
            <div className="dashboard-deadline-heading upcoming-heading">
              <CalendarDays size={16} />
              <strong>Upcoming</strong>
              <span>{upcomingTasks.length}</span>
            </div>

            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  className="dashboard-deadline-item"
                  onClick={() => onSelectTask?.(task)}
                >
                  <span className="dashboard-deadline-item-copy">
                    <strong>{task.title || task.name || 'Untitled task'}</strong>
                    <small>
                      {task.pic || 'Belum ada PIC'} · {task.status}
                    </small>
                  </span>
                  <span className="dashboard-deadline-date">
                    {formatDeadline(task)}
                  </span>
                </button>
              ))
            ) : (
              <div className="dashboard-deadline-empty">
                Belum ada deadline mendatang.
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  )
}
