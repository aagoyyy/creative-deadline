
import './statcard.css'

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'purple',
}) {
  return (
    <article className={`stat-card ${color}`}>
      <div className="stat-card-top">
        <div className="stat-card-heading">
          <span className="stat-card-label">{label}</span>
          <span className="stat-card-trend">{trend}</span>
        </div>

        <div className="stat-card-icon">
          {Icon && <Icon size={20} strokeWidth={1.8} />}
        </div>
      </div>

      <div className="stat-card-value">{value ?? 0}</div>

      <div className="stat-card-bottom">
        <span className="stat-card-status-dot" />
        <span className="stat-card-caption">{label}</span>
      </div>

      <div className="stat-card-accent" />
    </article>
  )
}
