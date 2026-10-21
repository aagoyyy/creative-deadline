
import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (!message) return

    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  }

  return (
    <div className={`app-toast app-toast-${type}`} role="status">
      <span className="app-toast-icon">{icons[type] || icons.info}</span>
      <span className="app-toast-message">{message}</span>
      <button type="button" onClick={onClose} aria-label="Tutup notifikasi">
        <X size={16} />
      </button>
    </div>
  )
}
