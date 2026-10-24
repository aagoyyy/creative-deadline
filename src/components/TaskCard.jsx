
import {
  CalendarDays,
  CheckCircle2,
  Video,
  Flag,
  ExternalLink,
  UserRound,
} from 'lucide-react'
import { getStatusClass } from '../utils/taskUtils'

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', className: 'priority-urgent' },
  HIGH: { label: 'High', className: 'priority-high' },
  MEDIUM: { label: 'Medium', className: 'priority-medium' },
  LOW: { label: 'Low', className: 'priority-low' },
}

function getPriority(priority) {
  const normalized = String(priority || 'MEDIUM').toUpperCase()
  return PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.MEDIUM
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  let date = null

  if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (value instanceof Date) {
    date = new Date(value)
  } else if (typeof value === 'number') {
    // Mendukung timestamp milliseconds dan tanggal berupa angka.
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
  }

  if (!date || Number.isNaN(date.getTime())) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date
}

function getCompletionDate(task) {
  const directValue =
    task.completedAt ??
    task.completed_at ??
    task.doneAt ??
    task.done_at ??
    task.finishedAt ??
    task.finished_at ??
    task.completedDate ??
    task.completed_date

  if (directValue) {
    const parsed = parseDate(directValue)
    if (parsed) return parsed
  }

  const history = Array.isArray(task.statusHistory)
    ? task.statusHistory
    : []

  const doneEntries = history.filter(
    (entry) =>
      String(entry.to || '').toUpperCase() === 'DONE' &&
      entry.changedAt
  )

  if (!doneEntries.length) return null

  return parseDate(doneEntries[doneEntries.length - 1].changedAt)
}

function getDeadlineState(task, deadline) {
  if (!deadline) return 'no-date'

  const status = String(task.status || '').toUpperCase()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (status === 'DONE') {
    const completedAt = getCompletionDate(task)

    if (completedAt && completedAt > deadline) {
      return 'done-late'
    }

    return 'done'
  }

  if (deadline < today) return 'overdue'
  return 'normal'
}

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(deadline)
}

function getDateParts(deadline) {
  if (!deadline) {
    return { day: '—', month: 'N/A' }
  }

  return {
    day: String(deadline.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat('en-US', {
      month: 'short',
    })
      .format(deadline)
      .toUpperCase(),
  }
}

export default function TaskCard({
  task,
  selected = false,
  onClick,
  compact = false,
}) {
  const priority = getPriority(task.priority)

  const status = String(task.status || 'NOT STARTED').toUpperCase()
  const deadline = parseDate(task.deadline)
  const deadlineState = getDeadlineState(task, deadline)
  const dateParts = getDateParts(deadline)

  const resultLink =
    task.resultLink ||
    task.resultUrl ||
    task.resultURL ||
    task.result ||
    ''

  const isDraft =
    String(task.workflowState || '').toUpperCase() === 'DRAFT'

  const stateClass = isDraft
    ? 'task-state-draft'
    : deadlineState === 'overdue'
      ? 'task-state-overdue'
      : deadlineState === 'done-late'
        ? 'task-state-done-late'
        : deadlineState === 'done'
          ? 'task-state-done'
          : 'task-state-normal'

          const deadlineLabel = isDraft ? 'DRAFT' : ''

  return (
    <div
      className={[
        'list-task',
        stateClass,
        selected ? 'list-task-selected' : '',
        compact ? 'list-task-compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onClick?.(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.(task)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Task ${task.title || 'Untitled'}, status ${status}`}
    >
      <span className="list-task-datebox" aria-hidden="true">
        <strong>{dateParts.day}</strong>
        <span>{dateParts.month}</span>
      </span>

      <span className="list-task-main">
        <strong className="list-task-title">
          {task.title || 'Untitled task'}
        </strong>

        <span className="list-task-meta">
          {task.type || 'Content'} 
          {task.code ? ` · ${task.code}` : ''}
          {task.project ? ` · ${task.project}` : ''}
        </span>

        <span className="list-task-pic">
          <UserRound size={12} />
          {task.pic || 'Unassigned'}
        </span>
      </span>

      <span className="list-task-badges">
        {!isDraft && (
          <span
            className={`priority-badge ${priority.className}`}
            title={`Priority: ${priority.label}`}
          >
            <Flag size={11} />
            {priority.label}
          </span>
        )}

        <span
          className={`status-pill ${getStatusClass(task.status)}`}
        >
          {status}
        </span>

        {isDraft && (
          <span className="list-task-deadline-badge draft">
            DRAFT
          </span>
        )}
      </span>

      <span className="list-task-bottom">
        <span className="list-task-deadline">
          <CalendarDays size={13} />
          <span>Deadline: {formatDeadline(deadline)}</span>
        </span>

        {typeof task.progress === 'number' && (
          <span className="list-task-progress">
            <span className="list-task-progress-track">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, task.progress)
                  )}%`,
                }}
              />
            </span>
            <small>{Math.round(task.progress)}%</small>
          </span>
        )}

        {resultLink ? (
          <a
            href={resultLink}
            target="_blank"
            rel="noopener noreferrer"
            className="result-link-button"
            onClick={(event) => event.stopPropagation()}
            title="Open task result"
          >
            <ExternalLink size={13} />
            Result
          </a>
        ) : (
          <span className="result-link-empty">No result link</span>
        )}
      </span>
    </div>
  )
}
