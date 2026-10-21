
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Target,
  CircleDashed,
} from 'lucide-react'

import StatCard from '../components/StatCard'
import TaskCard from '../components/TaskCard'

const WORKFLOW = [
  { status: 'NOT STARTED', label: 'Not Started' },
  { status: 'START', label: 'In Progress' },
  { status: 'APPROVAL 1', label: 'Approval 1' },
  { status: 'APPROVAL 2', label: 'Approval 2' },
  { status: 'DONE', label: 'Completed' },
]

const ACTIVE_STATUSES = ['START', 'APPROVAL 1', 'APPROVAL 2']
const APPROVAL_STATUSES = ['APPROVAL 1', 'APPROVAL 2']

function normalizeStatus(status) {
  return String(status || 'NOT STARTED').trim().toUpperCase()
}

function getDate(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value)
  }

  if (typeof value === 'number') {
    if (value < 100000000000) return null

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    const date = match
      ? new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        )
      : new Date(value)

    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function getDeadlineDate(task) {
  const date = getDate(task?.deadline)
  return date ? startOfDay(date) : null
}

function getToday() {
  return startOfDay(new Date())
}

function getTaskTitle(task) {
  return task.title || task.name || 'Untitled Task'
}

function getTaskPic(task) {
  const value = task.pic || task.picName || task.creativeName

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value && typeof value === 'object') {
    return value.name || value.displayName || 'Unassigned'
  }

  return 'Unassigned'
}

function getTaskProject(task) {
  return task.project || 'No Project'
}

function getTaskContentType(task) {
  return task.contentType || task.content_type || 'Other'
}

function getCompletionDate(task) {
  const directDate =
    task.completedAt ??
    task.completed_at ??
    task.doneAt ??
    task.done_at ??
    task.finishedAt ??
    task.finished_at ??
    task.completedDate ??
    task.completed_date

  if (directDate) {
    const parsedDate = getDate(directDate)
    if (parsedDate) return parsedDate
  }

  const history = Array.isArray(task.statusHistory)
    ? task.statusHistory
    : []

  const doneEntries = history.filter(
    (entry) =>
      normalizeStatus(entry.to) === 'DONE' &&
      entry.changedAt
  )

  if (doneEntries.length === 0) return null

  const lastDoneEntry = doneEntries[doneEntries.length - 1]

  return getDate(lastDoneEntry.changedAt)
}

function formatDate(date) {
  if (!date) return 'No Due Date'

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonth(value) {
  if (value === 'ALL') return 'All Months'

  const [year, month] = value.split('-').map(Number)

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function getMonthKey(date) {
  if (!date) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getDeadlineCategory(task) {
  const deadline = getDeadlineDate(task)

  if (!deadline) return 'NO DATE'
  if (normalizeStatus(task.status) === 'DONE') return 'DONE'

  const today = getToday()

  if (deadline < today) return 'OVERDUE'
  if (deadline.getTime() === today.getTime()) return 'TODAY'

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  if (deadline <= nextWeek) return 'NEXT 7 DAYS'

  return 'UPCOMING'
}

function getDaysOverdue(task) {
  const deadline = getDeadlineDate(task)

  if (!deadline) return 0

  return Math.max(
    0,
    Math.floor((getToday() - deadline) / 86400000)
  )
}

function compareDeadlines(a, b) {
  return (
    (getDeadlineDate(a)?.getTime() ?? Infinity) -
    (getDeadlineDate(b)?.getTime() ?? Infinity)
  )
}

function isLateTask(task) {
  const deadline = getDeadlineDate(task)

  if (!deadline) return false

  if (normalizeStatus(task.status) === 'DONE') {
    const completedAt = getCompletionDate(task)

    if (!completedAt) return false

    return startOfDay(completedAt) > deadline
  }

  return deadline < getToday()
}

function isOnTimeCompletedTask(task) {
  const deadline = getDeadlineDate(task)
  const completedAt = getCompletionDate(task)

  if (
    normalizeStatus(task.status) !== 'DONE' ||
    !deadline ||
    !completedAt
  ) {
    return false
  }

  return startOfDay(completedAt) <= deadline
}

function getMonthOptions() {
  const today = new Date()
  const options = []

  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - offset,
      1
    )

    const value = getMonthKey(date)

    options.push({
      value,
      label: formatMonth(value),
    })
  }

  return options
}

function getStatusLabel(status) {
  const found = WORKFLOW.find(
    (item) => item.status === normalizeStatus(status)
  )

  return found?.label || 'Not Started'
}

export default function Dashboard({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onNavigate,
  onAddTask,
}) {
  const currentMonth = getMonthKey(new Date())

  const [monthFilter, setMonthFilter] = useState(currentMonth)
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [contentFilter, setContentFilter] = useState('ALL')
  const [picFilter, setPicFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const monthOptions = useMemo(() => getMonthOptions(), [])

  const projectOptions = useMemo(
    () =>
      [...new Set(tasks.map(getTaskProject))]
        .filter((value) => value !== 'No Project')
        .sort((a, b) => a.localeCompare(b)),
    [tasks]
  )

  const contentOptions = useMemo(
    () =>
      [...new Set(tasks.map(getTaskContentType))]
        .filter((value) => value !== 'Other')
        .sort((a, b) => a.localeCompare(b)),
    [tasks]
  )

  const picOptions = useMemo(
    () =>
      [...new Set(tasks.map(getTaskPic))]
        .filter((value) => value !== 'Unassigned')
        .sort((a, b) => a.localeCompare(b)),
    [tasks]
  )

  const baseFilteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesProject =
          projectFilter === 'ALL' ||
          getTaskProject(task) === projectFilter

        const matchesContent =
          contentFilter === 'ALL' ||
          getTaskContentType(task) === contentFilter

        const matchesPic =
          picFilter === 'ALL' ||
          getTaskPic(task) === picFilter

        return matchesProject && matchesContent && matchesPic
      }),
    [tasks, projectFilter, contentFilter, picFilter]
  )

  const monthlyTasks = useMemo(
    () =>
      baseFilteredTasks.filter((task) => {
        const deadline = getDeadlineDate(task)

        if (!deadline) return false

        return (
          monthFilter === 'ALL' ||
          getMonthKey(deadline) === monthFilter
        )
      }),
    [baseFilteredTasks, monthFilter]
  )

  const filteredTasks = useMemo(
    () =>
      monthlyTasks.filter(
        (task) =>
          statusFilter === 'ALL' ||
          normalizeStatus(task.status) === statusFilter
      ),
    [monthlyTasks, statusFilter]
  )

  const totalTasks = filteredTasks.length

  const completed = filteredTasks.filter(
    (task) => normalizeStatus(task.status) === 'DONE'
  ).length

  const inProgress = filteredTasks.filter((task) =>
    ACTIVE_STATUSES.includes(normalizeStatus(task.status))
  ).length

  const awaitingApproval = filteredTasks.filter((task) =>
    APPROVAL_STATUSES.includes(normalizeStatus(task.status))
  ).length

  const completionRate = totalTasks
    ? Math.round((completed / totalTasks) * 100)
    : 0

  const overdueTasks = useMemo(
    () =>
      baseFilteredTasks
        .filter((task) => getDeadlineCategory(task) === 'OVERDUE')
        .sort(compareDeadlines),
    [baseFilteredTasks]
  )

  const upcomingTasks = useMemo(
    () =>
      baseFilteredTasks
        .filter((task) =>
          ['TODAY', 'NEXT 7 DAYS'].includes(
            getDeadlineCategory(task)
          )
        )
        .sort(compareDeadlines),
    [baseFilteredTasks]
  )

  const priorityTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => normalizeStatus(task.status) !== 'DONE')
        .sort((a, b) => {
          const aOverdue = getDeadlineCategory(a) === 'OVERDUE'
          const bOverdue = getDeadlineCategory(b) === 'OVERDUE'

          if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1
          }

          return compareDeadlines(a, b)
        })
        .slice(0, 5),
    [filteredTasks]
  )

  const workflowCounts = useMemo(
    () =>
      WORKFLOW.map((item) => ({
        ...item,
        count: filteredTasks.filter(
          (task) => normalizeStatus(task.status) === item.status
        ).length,
      })),
    [filteredTasks]
  )

  // Team performance is based on the selected deadline month.
  // The status filter does not affect team performance.

  const teamPerformance = useMemo(() => {
    const members = new Map()

    monthlyTasks.forEach((task) => {
      const pic = getTaskPic(task)

      if (pic === 'Unassigned') return

      if (!members.has(pic)) {
        members.set(pic, {
          name: pic,
          total: 0,
          completed: 0,
          late: 0,
          onTime: 0,
          unknownCompletionDate: 0,
          active: 0,
          approval: 0,
        })
      }

      const member = members.get(pic)
      const status = normalizeStatus(task.status)

      member.total += 1

      if (status === 'DONE') {
        member.completed += 1

        const deadline = getDeadlineDate(task)
        const completedAt = getCompletionDate(task)

        if (!deadline || !completedAt) {
          member.unknownCompletionDate += 1
          return
        }

        if (startOfDay(completedAt) > deadline) {
          member.late += 1
        } else {
          member.onTime += 1
        }

        return
      }

      if (ACTIVE_STATUSES.includes(status)) {
        member.active += 1
      }

      if (APPROVAL_STATUSES.includes(status)) {
        member.approval += 1
      }
    })

    return [...members.values()].sort(
      (a, b) => b.late - a.late || b.total - a.total
    )
  }, [monthlyTasks])

  const noDeadlineCount = baseFilteredTasks.filter(
    (task) => !getDeadlineDate(task)
  ).length

  function resetFilters() {
    setMonthFilter(currentMonth)
    setProjectFilter('ALL')
    setContentFilter('ALL')
    setPicFilter('ALL')
    setStatusFilter('ALL')
  }

  const hasFilters =
    monthFilter !== currentMonth ||
    projectFilter !== 'ALL' ||
    contentFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    statusFilter !== 'ALL'

  return (
    <section className="page-content dashboard-page">
      {/* HEADER */}
      <section className="welcome-row dashboard-welcome">
        <div>
          <div className="eyebrow">WORKSPACE / OVERVIEW</div>

          <h1>
            Overview<span className="heading-period">.</span>
          </h1>

          <p className="page-subtitle">
            Monitor tasks, deadlines, and creative team performance
            in one place.
          </p>
        </div>

      </section>

      {/* FILTERS */}
      <section className="dashboard-overview-filters">
        <div className="dashboard-overview-filter-title">
          <SlidersHorizontal size={18} />

          <div>
            <strong>Overview Filters</strong>
            <small>
              Evaluate tasks based on their deadline month.
            </small>
          </div>
        </div>

        <div className="dashboard-overview-filter-controls">
          <label>
            <span>Deadline Month</span>

            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="ALL">All Months</option>

              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Project</span>

            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="ALL">All Projects</option>

              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Content Type</span>

            <select
              value={contentFilter}
              onChange={(event) => setContentFilter(event.target.value)}
            >
              <option value="ALL">All Content Types</option>

              {contentOptions.map((content) => (
                <option key={content} value={content}>
                  {content}
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

              {picOptions.map((pic) => (
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
              <option value="ALL">All Statuses</option>

              {WORKFLOW.map((item) => (
                <option key={item.status} value={item.status}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="dashboard-overview-reset"
              onClick={resetFilters}
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* PERIOD */}
      <div className="dashboard-period-caption">
        <CalendarDays size={16} />

        <span>
          Evaluation Period: <strong>{formatMonth(monthFilter)}</strong>
          {' · '}
          <strong>{totalTasks} tasks</strong> match the selected filters
        </span>
      </div>

      {/* STAT CARDS */}
      <section className="stats-grid">
        <StatCard
          label="TOTAL TASKS"
          value={totalTasks}
          icon={ListTodo}
          trend="All tasks in the selected period"
          color="purple"
        />

        <StatCard
          label="IN PROGRESS"
          value={inProgress}
          icon={TrendingUp}
          trend="Tasks currently being worked on"
          color="blue"
        />

        <StatCard
          label="PENDING APPROVAL"
          value={awaitingApproval}
          icon={Clock3}
          trend="Tasks awaiting approval"
          color="orange"
        />

        <StatCard
          label="COMPLETED TASKS"
          value={completed}
          icon={CheckCircle2}
          trend={`${completionRate}% of all tasks`}
          color="green"
        />

        <StatCard
          label="OVERDUE TASKS"
          value={overdueTasks.length}
          icon={AlertTriangle}
          trend="Past deadline and not completed"
          color="red"
        />
      </section>

      {/* WORKFLOW + TEAM PERFORMANCE */}
      <section className="dashboard-insights-grid">
        <div className="dashboard-panel workflow-panel">
          <div className="panel-heading">
            <div>
              <h2>Task Workflow</h2>
              <p>Number of tasks at each workflow stage.</p>
            </div>

            <CircleDashed size={21} />
          </div>

          <div className="dashboard-workflow-total">
            <span>Total Tasks Matching Filters</span>
            <strong>{totalTasks}</strong>
          </div>

          {workflowCounts.map((item) => {
            const percentage = totalTasks
              ? (item.count / totalTasks) * 100
              : 0

            return (
              <div className="workflow-row" key={item.status}>
                <div className="workflow-label">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
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

        <div className="dashboard-panel team-workload-panel">
          <div className="panel-heading">
            <div>
              <h2>Team Performance</h2>
              <p>
                Compare team results based on deadlines in the selected month.
              </p>
            </div>

            <Users size={21} />
          </div>

          {teamPerformance.length > 0 ? (
            <div className="dashboard-performance-table-wrap">
              <table className="dashboard-performance-table">
                <thead>
                  <tr>
                    <th>Creative</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>Completed Late</th>
                    <th>On Time</th>
                  </tr>
                </thead>

                <tbody>
                  {teamPerformance.map((member) => {
                    const classifiedCompleted =
                      member.onTime + member.late

                    const onTimeRate =
                      classifiedCompleted > 0
                        ? Math.round(
                            (member.onTime / classifiedCompleted) * 100
                          )
                        : null

                    const hasUnknownCompletionDate =
                      member.unknownCompletionDate > 0

                    return (
                      <tr key={member.name}>
                        <td>
                          <div className="dashboard-performance-person">
                            <span className="dashboard-workload-avatar">
                              {member.name.charAt(0).toUpperCase()}
                            </span>

                            <div>
                              <strong>{member.name}</strong>
                              <small>
                                {member.active} active · {member.approval}{' '}
                                awaiting approval
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>{member.total}</td>

                        <td>{member.completed}</td>

                        <td>
                          <span
                            className={
                              member.late > 0
                                ? 'dashboard-performance-late'
                                : 'dashboard-performance-good'
                            }
                          >
                            {member.late}
                          </span>
                        </td>

                        <td>
                          <span className="dashboard-performance-rate">
                            {onTimeRate !== null
                              ? `${member.onTime} tasks · ${onTimeRate}%`
                              : hasUnknownCompletionDate
                                ? 'Missing completion date'
                                : 'No data yet'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <p className="dashboard-performance-note">
                Total includes all tasks in the selected deadline period.
                Completed Late only counts tasks completed after their
                deadline. On Time counts tasks completed on or before
                their deadline. Tasks without a completion date are
                excluded from the percentage calculation.
              </p>
            </div>
          ) : (
            <div className="dashboard-empty">
              <Users size={26} />
              <strong>No Performance Data</strong>
              <span>
                Tasks with a deadline and assigned creative will appear here.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* DEADLINE MONITORING */}
      <section className="dashboard-panel dashboard-deadlines-panel">
        <div className="panel-heading">
          <div>
            <h2>Deadline Monitoring</h2>
            <p>
              Overdue tasks and upcoming deadlines, regardless of the
              selected evaluation month.
            </p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={() => onNavigate?.('Calendar')}
          >
            Open Calendar
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="dashboard-deadline-columns">
          <div className="dashboard-deadline-group">
            <div className="dashboard-deadline-heading">
              <AlertTriangle size={17} />
              <strong>Overdue Tasks</strong>
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
                    <strong>{getTaskTitle(task)}</strong>
                    <small>{getTaskPic(task)}</small>
                  </span>

                  <span className="dashboard-deadline-date dashboard-overdue-date">
                    {getDaysOverdue(task)} days overdue
                  </span>
                </button>
              ))
            ) : (
              <div className="dashboard-deadline-empty">
                No overdue tasks. Great work!
              </div>
            )}
          </div>

          <div className="dashboard-deadline-group">
            <div className="dashboard-deadline-heading upcoming-heading">
              <CalendarDays size={17} />
              <strong>Upcoming Deadlines</strong>
              <span>{upcomingTasks.length}</span>
            </div>

            {upcomingTasks.length > 0 ? (
              upcomingTasks.slice(0, 5).map((task) => (
                <button
                  type="button"
                  key={task.id}
                  className="dashboard-deadline-item"
                  onClick={() => onSelectTask?.(task)}
                >
                  <span className="dashboard-deadline-item-copy">
                    <strong>{getTaskTitle(task)}</strong>
                    <small>
                      {getTaskPic(task)} · {getStatusLabel(task.status)}
                    </small>
                  </span>

                  <span className="dashboard-deadline-date">
                    {formatDate(getDeadlineDate(task))}
                  </span>
                </button>
              ))
            ) : (
              <div className="dashboard-deadline-empty">
                No deadlines in the next 7 days.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRIORITY TASKS */}
      <section className="dashboard-panel dashboard-priority-panel">
        <div className="panel-heading">
          <div>
            <h2>Tasks Requiring Attention</h2>
            <p>
              Incomplete tasks with the most urgent deadlines in the
              selected period.
            </p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={() => onNavigate?.('All Tasks')}
          >
            View All Tasks
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="dashboard-task-list">
          {priorityTasks.length > 0 ? (
            priorityTasks.map((task) => (
              <div className="dashboard-priority-item" key={task.id}>
                <div className="dashboard-priority-task">
                  <TaskCard
                    task={task}
                    selected={String(selectedTaskId) === String(task.id)}
                    onClick={() => onSelectTask?.(task)}
                  />

                  <div className="dashboard-priority-meta">
                    <span>{getTaskProject(task)}</span>
                    <span>{getTaskContentType(task)}</span>
                    <span>{getTaskPic(task)}</span>
                  </div>
                </div>

                <div
                  className={`dashboard-priority-deadline ${
                    getDeadlineCategory(task) === 'OVERDUE'
                      ? 'is-overdue'
                      : ''
                  }`}
                >
                  {getDeadlineCategory(task) === 'OVERDUE' ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <CalendarDays size={15} />
                  )}

                  <span>{formatDate(getDeadlineDate(task))}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="dashboard-empty">
              <Target size={26} />
              <strong>No Priority Tasks</strong>
              <span>
                There are no incomplete tasks with deadlines in this period.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* TASKS WITHOUT DEADLINES */}
      {noDeadlineCount > 0 && (
        <div className="dashboard-no-deadline-note">
          <Clock3 size={16} />

          <span>
            There are <strong>{noDeadlineCount} tasks without deadlines</strong>.
            These tasks are excluded from monthly evaluations.
          </span>

          <button
            type="button"
            onClick={() => onNavigate?.('All Tasks')}
          >
            Review Tasks
          </button>
        </div>
      )}
    </section>
  )
}
