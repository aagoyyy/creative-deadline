
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
  } from 'lucide-react'
  
  export default function StatCard({
    title,
    value,
    note,
    icon: Icon,
    color = 'purple',
    trend,
  }) {
    const TrendIcon =
      color === 'orange'
        ? AlertTriangle
        : color === 'cyan'
          ? Activity
          : ArrowUpRight
  
    return (
      <div className="stat-card">
        <div className="stat-top">
          <div className={`stat-icon ${color}`}>
            {Icon && <Icon size={18} />}
          </div>
  
          <span className={`stat-trend ${color}`}>
            <TrendIcon size={12} />
            {trend}
          </span>
        </div>
  
        <div className="stat-value">
          {String(value ?? 0).padStart(2, '0')}
        </div>
  
        <div className="stat-title">{title}</div>
        <div className="stat-note">{note}</div>
  
        <div className={`stat-accent ${color}`} />
      </div>
    )
  }
  