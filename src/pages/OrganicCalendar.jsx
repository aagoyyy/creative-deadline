
import { useMemo } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Layers3,
  UserRound,
  Plus,
  AlertTriangle,
} from 'lucide-react'

import './OrganicCalendar.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

function parseDate(value) {
  if (!value) return null

  let date

  if (value instanceof Date) {
    date = new Date(value)
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (match) {
      date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    } else {
      date = new Date(value)
    }
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

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatShortDate(date) {
  if (!date) return 'No deadline'

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getWorkflowState(task) {
  const state = String(task.workflowState || '').toUpperCase()

  if (state === 'DRAFT') return 'DRAFT'
  if (state === 'ASSIGNED') return 'ASSIGNED'

  // Organic tasks without workflowState are treated as assigned.
  return 'ASSIGNED'
}

function getCompletionDate(task) {
  return parseDate(
    task.completedAt ??
      task.completed_at ??
      task.doneAt ??
      task.finishedAt ??
      task.completedDate ??
      task.completed_date
  )
}

function getStatusClass(status) {
  switch (String(status || '').trim().toUpperCase()) {
    case 'DONE':
      return 'organic-status-done'
    case 'START':
      return 'organic-status-start'
    case 'APPROVAL 1':
    case 'APPROVAL 2':
      return 'organic-status-approval'
    default:
      return 'organic-status-pending'
  }
}

// Sorting khusus Content Schedule.
// Angka lebih kecil berarti prioritas lebih tinggi.
function getSchedulePriority(task, todayKey) {
  if (task.isDraft) return 5

  if (task.isForgiven) return 4

  if (task.isDone) return 3

  if (task.isOverdue) return 0

  if (dateKey(task.parsedDeadline) === todayKey) return 1

  return 2
}

function sortScheduleTasks(tasks, todayKey) {
  return [...tasks].sort((a, b) => {
    const priorityDifference =
      getSchedulePriority(a, todayKey) -
      getSchedulePriority(b, todayKey)

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    // Dalam prioritas yang sama, deadline terdekat lebih dulu.
    const dateDifference =
      a.parsedDeadline.getTime() -
      b.parsedDeadline.getTime()

    if (dateDifference !== 0) {
      return dateDifference
    }

    // Jika deadline sama, urutkan berdasarkan judul A–Z.
    return String(a.title || '').localeCompare(
      String(b.title || '')
    )
  })
}

function OrganicCalendar({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onNewBrief,
  year,
  month,
  onChangeMonth,
  onToday,
}) {
  const today = new Date()

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  const todayKey = dateKey(todayDate)

  // Data bersama untuk kalender dan Content Schedule.
  const calendarTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const project = String(task.project || '')
          .trim()
          .toLowerCase()

        return project === 'organic'
      })
      .map((task) => {
        const parsedDeadline = parseDate(task.deadline)
        const calendarWorkflowState = getWorkflowState(task)

        const isDraft = calendarWorkflowState === 'DRAFT'

        const isDone =
          !isDraft &&
          String(task.status || '').trim().toUpperCase() === 'DONE'

        const completedDate = getCompletionDate(task)

        // Menggunakan field forgive yang sama dengan Calendar.jsx.
        const isForgiven = task.overdueForgiven === true

        // Overdue hanya berlaku untuk task yang deadline-nya lewat,
        // belum selesai atau selesai terlambat, dan tidak di-forgive.
        const isOverdue =
          Boolean(parsedDeadline) &&
          parsedDeadline < todayDate &&
          !isDraft &&
          !isForgiven &&
          (
            !isDone ||
            !completedDate ||
            completedDate > parsedDeadline
          )

        // DONE LATE hanya jika tanggal selesai melewati deadline.
        const isDoneLate =
          isDone &&
          !isForgiven &&
          Boolean(parsedDeadline) &&
          Boolean(completedDate) &&
          completedDate > parsedDeadline

        return {
          ...task,
          parsedDeadline,
          calendarWorkflowState,
          isDraft,
          isDone,
          isForgiven,
          isOverdue,
          isDoneLate,
        }
      })
      // Kalender hanya menampilkan task dengan deadline.
      .filter((task) => task.parsedDeadline)
      // Kalender tetap urut berdasarkan tanggal, bukan prioritas list.
      .sort((a, b) => {
        const dateDifference =
          a.parsedDeadline.getTime() -
          b.parsedDeadline.getTime()

        if (dateDifference !== 0) return dateDifference

        return String(a.title || '').localeCompare(
          String(b.title || '')
        )
      })
  }, [tasks, todayKey])

  const monthCells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingDays = (firstDay.getDay() + 6) % 7

    const totalCells =
      Math.ceil((leadingDays + daysInMonth) / 7) * 7

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - leadingDays + 1

      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null
      }

      const date = new Date(year, month, dayNumber)
      const key = dateKey(date)

      return {
        date,
        key,
        dayNumber,
        isToday: key === todayKey,
        tasks: calendarTasks.filter(
          (task) => dateKey(task.parsedDeadline) === key
        ),
      }
    })
  }, [year, month, calendarTasks, todayKey])

  // Daftar semua task dengan deadline pada bulan yang dipilih.
  const monthTasks = useMemo(() => {
    return calendarTasks.filter(
      (task) =>
        task.parsedDeadline.getFullYear() === year &&
        task.parsedDeadline.getMonth() === month
    )
  }, [calendarTasks, year, month])

  // Sorting prioritas hanya diterapkan pada Content Schedule.
  const scheduleTasks = useMemo(() => {
    return sortScheduleTasks(monthTasks, todayKey)
  }, [monthTasks, todayKey])

  const draftCount = monthTasks.filter(
    (task) => task.isDraft
  ).length

  const assignedCount = monthTasks.filter(
    (task) => !task.isDraft
  ).length

  const overdueCount = monthTasks.filter(
    (task) => task.isOverdue
  ).length

  return (
    <section className="organic-calendar-page">
      <div className="organic-stats-grid">
        <div className="organic-stat-card">
          <span className="organic-stat-icon purple">
            <Layers3 size={18} />
          </span>
          <div>
            <span>Total Content</span>
            <strong>{monthTasks.length}</strong>
            <small>Deadlines in the selected month</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon blue">
            <FileText size={18} />
          </span>
          <div>
            <span>Drafts</span>
            <strong>{draftCount}</strong>
            <small>Not yet assigned</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon green">
            <CircleDashed size={18} />
          </span>
          <div>
            <span>Assigned</span>
            <strong>{assignedCount}</strong>
            <small>Added to the workflow</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon red">
            <Clock3 size={18} />
          </span>
          <div>
            <span>Overdue</span>
            <strong>{overdueCount}</strong>
            <small>Late tasks not forgiven</small>
          </div>
        </div>
      </div>

      <div className="organic-calendar-card">
        <div className="organic-calendar-toolbar">
          <div className="organic-month-heading">
            <h2>
              {MONTHS[month]} {year}
            </h2>
            <span>
              {monthTasks.length} content items with deadlines
            </span>
          </div>

          <div className="organic-calendar-controls">
            <button
              type="button"
              className="organic-new-brief-button"
              onClick={onNewBrief}
            >
              <Plus size={16} />
              New Brief
            </button>

            <button
              type="button"
              onClick={onToday}
              className="organic-today-button"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => onChangeMonth(-1)}
              aria-label="Previous month"
              className="organic-arrow-button"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => onChangeMonth(1)}
              aria-label="Next month"
              className="organic-arrow-button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="organic-calendar-grid">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="organic-weekday">
              {weekday}
            </div>
          ))}

          {monthCells.map((cell, index) => (
            <div
              key={cell?.key || `empty-${index}`}
              className={`organic-day-cell ${
                cell?.isToday ? 'is-today' : ''
              }`}
            >
              {cell && (
                <>
                  <div className="organic-day-number">
                    <span>{cell.dayNumber}</span>

                    {cell.tasks.length > 0 && (
                      <span className="organic-day-count">
                        {cell.tasks.length}
                      </span>
                    )}
                  </div>

                  <div className="organic-day-tasks">
                    {cell.tasks.map((task) => (
                      <button
                        type="button"
                        key={task.id}
                        title={`${task.title || 'Untitled'} · ${
                          task.isForgiven
                            ? 'Forgiven'
                            : task.isDraft
                              ? 'Draft'
                              : task.isOverdue
                                ? 'Overdue'
                                : task.isDoneLate
                                  ? 'Done late'
                                  : task.isDone
                                    ? 'Done'
                                    : task.status || 'Assigned'
                        }`}
                        className={`organic-task-chip ${
                          task.isDraft
                            ? 'organic-task-draft'
                            : 'organic-task-assigned'
                        } ${
                          task.isOverdue ? 'is-overdue' : ''
                        } ${
                          task.isDone ? 'is-done' : ''
                        } ${
                          task.isDoneLate ? 'is-done-late' : ''
                        } ${
                          task.isForgiven ? 'is-forgiven' : ''
                        } ${
                          String(selectedTaskId) === String(task.id)
                            ? 'is-selected'
                            : ''
                        }`}
                        onClick={() => onSelectTask?.(task)}
                      >
                        <span className="organic-task-chip-title">
                          {task.title || 'Untitled content'}
                        </span>

                        <span className="organic-task-chip-state">
                          {task.isForgiven ? (
                            'FORGIVEN'
                          ) : task.isDraft ? (
                            'DRAFT'
                          ) : task.isOverdue ? (
                            <>
                              <AlertTriangle size={12} />
                              OVERDUE
                            </>
                          ) : task.isDoneLate ? (
                            <>
                              <AlertTriangle size={12} />
                              DONE LATE
                            </>
                          ) : task.isDone ? (
                            <>
                              <CheckCircle2 size={12} />
                              DONE
                            </>
                          ) : (
                            task.status || 'ASSIGNED'
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="organic-calendar-legend">
          <span>
            <i className="organic-legend-dot draft" />
            Draft
          </span>
          <span>
            <i className="organic-legend-dot assigned" />
            Assigned
          </span>
          <span>
            <i className="organic-legend-dot overdue" />
            Overdue
          </span>
          <span>
            <i className="organic-legend-dot done-late" />
            Done late
          </span>
          <span>
            <i className="organic-legend-dot forgiven" />
            Forgiven
          </span>
        </div>
      </div>

      <section className="organic-deadline-section">
        <div className="organic-section-heading">
          <div>
            <h2>Content Schedule</h2>
            <p>Organic content organized by priority.</p>
          </div>
          <span>{scheduleTasks.length} items</span>
        </div>

        {scheduleTasks.length === 0 ? (
          <div className="organic-empty-state">
            <CalendarDays size={28} />
            <strong>No scheduled content this month</strong>
            <p>
              Organic content with deadlines in the selected month
              will appear here.
            </p>
          </div>
        ) : (
          <div className="organic-deadline-list">
            {scheduleTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className={`organic-deadline-row ${
                  task.isOverdue ? 'is-overdue' : ''
                } ${
                  task.isDone ? 'is-done' : ''
                } ${
                  task.isDoneLate ? 'is-done-late' : ''
                } ${
                  task.isForgiven ? 'is-forgiven' : ''
                } ${
                  String(selectedTaskId) === String(task.id)
                    ? 'is-selected'
                    : ''
                }`}
                onClick={() => onSelectTask?.(task)}
              >
                <div className="organic-deadline-date">
                  <strong>{task.parsedDeadline.getDate()}</strong>
                  <span>
                    {MONTHS[task.parsedDeadline.getMonth()]
                      .slice(0, 3)
                      .toUpperCase()}
                  </span>
                </div>

                <div className="organic-deadline-info">
                  <strong>{task.title || 'Untitled content'}</strong>
                  <span>
                    {task.type || 'Content type not set'}
                    {' · '}
                    {formatShortDate(task.parsedDeadline)}
                  </span>
                  <small>
                    <UserRound size={12} />
                    {task.pic || 'Unassigned'}
                  </small>
                </div>

                <div className="organic-deadline-badges">
                  <span
                    className={`organic-workflow-badge ${
                      task.isDraft ? 'draft' : 'assigned'
                    }`}
                  >
                    {task.isDraft ? 'DRAFT' : 'ASSIGNED'}
                  </span>

                  {!task.isDraft && (
                    <span
                      className={`organic-status-badge ${getStatusClass(
                        task.status
                      )}`}
                    >
                      {task.status || 'NOT STARTED'}
                    </span>
                  )}

                  {task.isForgiven && (
                    <span className="organic-forgiven-badge">
                      FORGIVEN
                    </span>
                  )}

                  {task.isOverdue && (
                    <span className="organic-overdue-badge">
                      <AlertTriangle size={12} />
                      OVERDUE
                    </span>
                  )}

                  {task.isDoneLate && (
                    <span className="organic-done-late-badge">
                      <AlertTriangle size={12} />
                      DONE LATE
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default OrganicCalendar
