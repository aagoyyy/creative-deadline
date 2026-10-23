
import { useMemo } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Layers3,
  UserRound,
} from 'lucide-react'

import './OrganicCalendar.css'

const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

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
const today = new Date()

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
    // Avoid timezone shifts for date-only values such as YYYY-MM-DD.
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

  // Older Organic tasks without workflowState are treated as assigned.
  return 'ASSIGNED'
}

function getStatusClass(status) {
  switch (String(status || '').toUpperCase()) {
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

function OrganicCalendar({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  year,
  month,
  onChangeMonth,
  onToday,
}) {
  const today = new Date()
  const todayKey = dateKey(today)

  const calendarTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const project = String(task.project || '')
          .trim()
          .toLowerCase()

        return project === 'organic'
      })
      .map((task) => ({
        ...task,
        parsedDeadline: parseDate(task.deadline),
        calendarWorkflowState: getWorkflowState(task),
      }))
      .filter((task) => task.parsedDeadline)
      .sort((a, b) => {
        const dateDifference =
          a.parsedDeadline.getTime() -
          b.parsedDeadline.getTime()

        if (dateDifference !== 0) return dateDifference

        return String(a.title || '').localeCompare(
          String(b.title || '')
        )
      })
  }, [tasks])

  const monthCells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Convert Sunday-first JavaScript weekdays to Monday-first.
    const leadingDays = (firstDay.getDay() + 6) % 7
    const totalCells = Math.ceil(
      (leadingDays + daysInMonth) / 7
    ) * 7

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

  const monthTasks = useMemo(() => {
    return calendarTasks.filter(
      (task) =>
        task.parsedDeadline.getFullYear() === year &&
        task.parsedDeadline.getMonth() === month
    )
  }, [calendarTasks, year, month])

  const draftCount = monthTasks.filter(
    (task) => task.calendarWorkflowState === 'DRAFT'
  ).length

  const assignedCount = monthTasks.filter(
    (task) => task.calendarWorkflowState === 'ASSIGNED'
  ).length

  const overdueCount = monthTasks.filter(
    (task) =>
      task.parsedDeadline < new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ) &&
      task.status !== 'DONE'
  ).length

  return (
    <section className="organic-calendar-page">
      <div className="organic-stats-grid">
        <div className="organic-stat-card">
          <span className="organic-stat-icon purple">
            <Layers3 size={18} />
          </span>
          <div>
            <span>Total Konten</span>
            <strong>{monthTasks.length}</strong>
            <small>Deadline bulan terpilih</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon blue">
            <FileText size={18} />
          </span>
          <div>
            <span>Draft</span>
            <strong>{draftCount}</strong>
            <small>Belum ditugaskan</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon green">
            <CircleDashed size={18} />
          </span>
          <div>
            <span>Assigned</span>
            <strong>{assignedCount}</strong>
            <small>Sudah masuk workflow</small>
          </div>
        </div>

        <div className="organic-stat-card">
          <span className="organic-stat-icon red">
            <Clock3 size={18} />
          </span>
          <div>
            <span>Terlambat</span>
            <strong>{overdueCount}</strong>
            <small>Belum selesai</small>
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
              {monthTasks.length} konten dengan deadline
            </span>
          </div>

          <div className="organic-calendar-controls">
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
            <div
              key={weekday}
              className="organic-weekday"
            >
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
                    {cell.tasks.map((task) => {
                      const isDraft =
                        task.calendarWorkflowState === 'DRAFT'

                      return (
                        <button
                          type="button"
                          key={task.id}
                          title={`${task.title || 'Untitled'} · ${
                            isDraft ? 'Draft' : 'Assigned'
                          }`}
                          className={`organic-task-chip ${
                            isDraft
                              ? 'organic-task-draft'
                              : 'organic-task-assigned'
                          } ${
                            String(selectedTaskId) ===
                            String(task.id)
                              ? 'is-selected'
                              : ''
                          }`}
                          onClick={() => onSelectTask?.(task)}
                        >
                          <span className="organic-task-chip-title">
                            {task.title || 'Untitled content'}
                          </span>
                          <span className="organic-task-chip-state">
                            {isDraft ? 'DRAFT' : task.status || 'ASSIGNED'}
                          </span>
                        </button>
                      )
                    })}
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
            Deadline lewat
          </span>
        </div>
      </div>

      <section className="organic-deadline-section">
        <div className="organic-section-heading">
          <div>
            <h2>Jadwal Konten</h2>
            <p>Daftar konten Organic berdasarkan deadline.</p>
          </div>
          <span>{monthTasks.length} konten</span>
        </div>

        {monthTasks.length === 0 ? (
          <div className="organic-empty-state">
            <CalendarDays size={28} />
            <strong>Belum ada jadwal bulan ini</strong>
            <p>
              Konten Organic dengan deadline pada bulan terpilih
              akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="organic-deadline-list">
            {monthTasks.map((task) => {
              const isDraft =
                task.calendarWorkflowState === 'DRAFT'

              const isOverdue =
                task.parsedDeadline < new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                ) &&
                task.status !== 'DONE'

              return (
                <button
                  type="button"
                  key={task.id}
                  className={`organic-deadline-row ${
                    String(selectedTaskId) === String(task.id)
                      ? 'is-selected'
                      : ''
                  }`}
                  onClick={() => onSelectTask?.(task)}
                >
                  <div className="organic-deadline-date">
                    <strong>
                      {task.parsedDeadline.getDate()}
                    </strong>
                    <span>
                      {MONTHS[task.parsedDeadline.getMonth()]
                        .slice(0, 3)
                        .toUpperCase()}
                    </span>
                  </div>

                  <div className="organic-deadline-info">
                    <strong>
                      {task.title || 'Untitled content'}
                    </strong>
                    <span>
                      {task.type || 'Content type not set'}
                      {' · '}
                      {formatShortDate(task.parsedDeadline)}
                    </span>
                    <small>
                      <UserRound size={12} />
                      {task.pic || 'Belum ada PIC'}
                    </small>
                  </div>

                  <div className="organic-deadline-badges">
                    <span
                      className={`organic-workflow-badge ${
                        isDraft ? 'draft' : 'assigned'
                      }`}
                    >
                      {isDraft ? 'DRAFT' : 'ASSIGNED'}
                    </span>

                    {!isDraft && (
                      <span
                        className={`organic-status-badge ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {task.status || 'NOT STARTED'}
                      </span>
                    )}

                    {isOverdue && (
                      <span className="organic-overdue-badge">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

export default OrganicCalendar
