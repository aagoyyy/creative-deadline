
import {
  CalendarDays,
  CheckCircle2,
  Video,
  Flag,
} from 'lucide-react'
import { getStatusClass } from '../utils/taskUtils'

const PRIORITY_CONFIG = {
  URGENT: {
    label: 'Urgent',
    className: 'priority-urgent',
  },
  HIGH: {
    label: 'High',
    className: 'priority-high',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'priority-medium',
  },
  LOW: {
    label: 'Low',
    className: 'priority-low',
  },
}

function getPriority(priority) {
  const normalized = String(priority || 'MEDIUM').toUpperCase()

  return PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.MEDIUM
}

export default function TaskCard({
  task,
  selected = false,
  onClick,
  compact = false,
}) {
  const priority = getPriority(task.priority)

  return (
    <button
      type="button"
      className={[
        'list-task',
        selected ? 'list-task-selected' : '',
        task.status === 'DONE' ? 'task-done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onClick?.(task)}
    >
      <span className={`list-task-icon ${task.color || 'purple'}`}>
        {task.status === 'DONE' ? (
          <CheckCircle2 size={17} />
        ) : (
          <Video size={17} />
        )}
      </span>

      <span className="list-task-main">
        <strong>{task.title}</strong>

        <small>
          {task.code} · {task.project} · PIC {task.pic || 'Unassigned'}
        </small>
      </span>

      <span
        className={`priority-badge ${priority.className}`}
        title={`Prioritas: ${priority.label}`}
      >
        <Flag size={11} />
        {priority.label}
      </span>

      <span className={`status-pill ${getStatusClass(task.status)}`}>
        {task.status}
      </span>

      {!compact && (
        <span className="list-task-date">
          <CalendarDays size={13} />
          {typeof task.deadline === 'number'
            ? `Oct ${task.deadline}`
            : task.deadline || '-'}
        </span>
      )}

      <span className="list-progress">
        <span
          style={{
            width: `${Math.min(
              100,
              Math.max(0, task.progress || 0)
            )}%`,
          }}
        />
      </span>
    </button>
  )
}
