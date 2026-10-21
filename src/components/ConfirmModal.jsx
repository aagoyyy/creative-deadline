import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import './ConfirmModal.css'

export default function ConfirmModal({
  open,
  title = 'Konfirmasi',
  message = 'Apakah kamu yakin ingin melanjutkan?',
  confirmText = 'Hapus',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onCancel()
        }
      }}
    >
      <section
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <button
          type="button"
          className="confirm-close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="confirm-icon">
          <AlertTriangle size={23} />
        </div>

        <h2 id="confirm-modal-title">{title}</h2>

        <p id="confirm-modal-message">{message}</p>

        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="confirm-delete"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Menghapus...' : confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}