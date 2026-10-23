
import { useMemo, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Archive,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import '../pages/Tasks.css'

import {
  exportTasksToExcel,
  getAvailableArchiveMonths,
  getArchiveEligibleTasks,
  exportArchiveMonthToExcel,
  verifyArchiveWorkbook,
  getAvailableTaskMonths,
} from '../utils/taskArchive'

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

function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return monthKey || ''
  }

  const [year, month] = monthKey.split('-')
  return `${MONTHS[Number(month) - 1]} ${year}`
}

function getVerificationMessage(result) {
  if (typeof result === 'string') return result

  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    return result.errors.join(' ')
  }

  return (
    result?.message ||
    result?.summary ||
    'Verification finished. Review the result before proceeding.'
  )
}

export default function TaskArchive({
  tasks = [],
  userRole = '',
}) {
  const isAdmin =
    String(userRole).trim().toLowerCase() === 'admin'

  const [exportMonth, setExportMonth] = useState('ALL')
  const [exportError, setExportError] = useState('')
  const [exportSuccess, setExportSuccess] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [archiveMonth, setArchiveMonth] = useState('')
  const [archiveError, setArchiveError] = useState('')
  const [archiveSuccess, setArchiveSuccess] = useState('')
  const [archiveFile, setArchiveFile] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [isArchiveExporting, setIsArchiveExporting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const availableExportMonths = useMemo(
    () => getAvailableTaskMonths(tasks),
    [tasks]
  )

  const eligibleArchiveTasks = useMemo(
    () => getArchiveEligibleTasks(tasks),
    [tasks]
  )

  const availableArchiveMonths = useMemo(
    () => getAvailableArchiveMonths(tasks),
    [tasks]
  )

  const selectedArchiveTasks = useMemo(
    () =>
      eligibleArchiveTasks.filter(
        (task) => {
          if (!archiveMonth) return false

          const value = task.createdAt
          let date = value

          if (typeof value?.toDate === 'function') {
            date = value.toDate()
          } else if (
            typeof value === 'object' &&
            typeof value?.seconds === 'number'
          ) {
            date = new Date(value.seconds * 1000)
          } else if (typeof value === 'string') {
            date = /^\d{4}-\d{2}-\d{2}$/.test(value)
              ? new Date(
                  Number(value.slice(0, 4)),
                  Number(value.slice(5, 7)) - 1,
                  Number(value.slice(8, 10))
                )
              : new Date(value)
          } else if (typeof value === 'number') {
            date = new Date(value)
          }

          if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return false
          }

          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}`

          return monthKey === archiveMonth
        }
      ),
    [eligibleArchiveTasks, archiveMonth]
  )

  function handleExportExcel() {
    setExportError('')
    setExportSuccess('')

    if (!isAdmin) {
      setExportError('Only Admins can export task data.')
      return
    }

    setIsExporting(true)

    try {
      const result = exportTasksToExcel(tasks, exportMonth)

      setExportSuccess(
        `${result.fileName} is ready with ${result.exportedCount} tasks. No Firestore data was deleted or modified.`
      )
    } catch (error) {
      setExportError(
        error?.message || 'Failed to export task data.'
      )
    } finally {
      setIsExporting(false)
    }
  }

  function handleArchiveMonthChange(value) {
    setArchiveMonth(value)
    setArchiveError('')
    setArchiveSuccess('')
    setArchiveFile(null)
    setVerificationResult(null)
  }

  function handleExportArchive() {
    setArchiveError('')
    setArchiveSuccess('')
    setVerificationResult(null)

    if (!isAdmin) {
      setArchiveError('Only Admins can export archive data.')
      return
    }

    if (!archiveMonth) {
      setArchiveError('Please select an archive month first.')
      return
    }

    if (selectedArchiveTasks.length === 0) {
      setArchiveError(
        'There are no eligible tasks for the selected month.'
      )
      return
    }

    setIsArchiveExporting(true)

    try {
      const result = exportArchiveMonthToExcel(
        tasks,
        archiveMonth
      )

      setArchiveSuccess(
        `${result.fileName} is ready. ${result.exportedCount} tasks exported. Save the file, then select it below for verification.`
      )
    } catch (error) {
      setArchiveError(
        error?.message || 'Failed to export archive data.'
      )
    } finally {
      setIsArchiveExporting(false)
    }
  }

  async function handleVerifyArchive() {
    setArchiveError('')
    setArchiveSuccess('')
    setVerificationResult(null)

    if (!isAdmin) {
      setArchiveError('Only Admins can verify archive files.')
      return
    }

    if (!archiveMonth) {
      setArchiveError('Please select an archive month first.')
      return
    }

    if (!archiveFile) {
      setArchiveError('Please select an Excel archive file to verify.')
      return
    }

    if (selectedArchiveTasks.length === 0) {
      setArchiveError(
        'There are no currently eligible tasks to compare against.'
      )
      return
    }

    setIsVerifying(true)

    try {
      const result = await verifyArchiveWorkbook(
        archiveFile,
        tasks,
        archiveMonth
      )

      setVerificationResult(result)

      if (result?.verified === true) {
        setArchiveSuccess(
          `Verification passed. ${result.verifiedCount} task IDs match the current eligible Firestore tasks for ${formatMonthLabel(archiveMonth)}. No data has been deleted.`
        )
      } else {
        setArchiveError(getVerificationMessage(result))
      }
    } catch (error) {
      setArchiveError(
        error?.message ||
          'Verification failed. Check the Excel file and try again.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isAdmin) {
    return (
      <section className="page-content">
        <section className="dashboard-panel task-archive-panel">
          <h3>Access Restricted</h3>
          <p>Only Admins can access Task Archive.</p>
        </section>
      </section>
    )
  }

  return (
    <section className="page-content">
      <section className="dashboard-panel all-tasks-panel">
        <section className="task-export-panel">
          <div className="task-export-heading">
            <div className="task-export-icon">
              <FileSpreadsheet size={21} />
            </div>

            <div className="task-export-copy">
              <h3>Export Tasks to Excel</h3>
              <p>
                Download task data for backup or record keeping.
                This action does not modify Firestore data.
              </p>
            </div>
          </div>

          <div className="task-export-controls">
            <label className="task-export-select">
              <span>Task Creation Period</span>

              <select
                value={exportMonth}
                onChange={(event) => {
                  setExportMonth(event.target.value)
                  setExportError('')
                  setExportSuccess('')
                }}
              >
                <option value="ALL">All Tasks</option>

                {availableExportMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="task-export-button"
              onClick={handleExportExcel}
              disabled={isExporting || tasks.length === 0}
            >
              <Download size={16} />
              {isExporting ? 'Preparing...' : 'Export Excel'}
            </button>
          </div>

          <div className="task-export-note">
            <span>
              {tasks.length} tasks available for export, including drafts.
            </span>

            {exportError && (
              <p className="task-export-message error">
                <AlertCircle size={15} />
                {exportError}
              </p>
            )}

            {exportSuccess && (
              <p className="task-export-message success">
                <CheckCircle2 size={15} />
                {exportSuccess}
              </p>
            )}
          </div>
        </section>

        <section className="task-archive-panel">
          <div className="task-archive-heading">
            <div className="task-archive-icon">
              <Archive size={21} />
            </div>

            <div className="task-archive-copy">
              <h3>Task Archive</h3>
              <p>
                Export and verify older tasks before considering deletion.
                Eligibility is based on creation date, not deadline.
              </p>
            </div>
          </div>

          <div className="task-archive-policy">
            <ShieldCheck size={16} />
            <span>
              12 full calendar months of retention. Tasks with missing
              or invalid creation dates are not eligible. This panel
              does not delete any tasks.
            </span>
          </div>

          <div className="task-archive-controls">
            <label className="task-archive-select">
              <span>Task Creation Month</span>

              <select
                value={archiveMonth}
                onChange={(event) =>
                  handleArchiveMonthChange(event.target.value)
                }
              >
                <option value="">Select Archive Month</option>

                {availableArchiveMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="task-archive-button"
              onClick={handleExportArchive}
              disabled={
                isArchiveExporting ||
                !archiveMonth ||
                selectedArchiveTasks.length === 0
              }
            >
              <Download size={16} />
              {isArchiveExporting ? 'Preparing...' : 'Export Archive'}
            </button>
          </div>

          <div className="task-archive-count">
            <span>Eligible tasks in selected month</span>
            <strong>{selectedArchiveTasks.length}</strong>
          </div>

          <div className="task-archive-verification">
            <div className="task-archive-verification-heading">
              <Upload size={17} />
              <div>
                <h4>Verify Exported Excel</h4>
                <p>Select the Excel file you just exported.</p>
              </div>
            </div>

            <label className="task-archive-file">
              <span>Archive Excel File (.xlsx)</span>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setArchiveFile(event.target.files?.[0] || null)
                  setArchiveError('')
                  setArchiveSuccess('')
                  setVerificationResult(null)
                }}
              />

              {archiveFile && <small>{archiveFile.name}</small>}
            </label>

            <button
              type="button"
              className="task-archive-verify-button"
              onClick={handleVerifyArchive}
              disabled={
                isVerifying ||
                !archiveFile ||
                !archiveMonth ||
                selectedArchiveTasks.length === 0
              }
            >
              <ShieldCheck size={16} />
              {isVerifying ? 'Verifying...' : 'Verify Excel'}
            </button>
          </div>

          {archiveError && (
            <div className="task-archive-message error">
              <AlertCircle size={16} />
              <span>{archiveError}</span>
            </div>
          )}

          {archiveSuccess && (
            <div className="task-archive-message success">
              <CheckCircle2 size={16} />
              <span>{archiveSuccess}</span>
            </div>
          )}

          {verificationResult && (
            <div className="task-archive-verification-result">
              <strong>Verification Results</strong>
              <p>{getVerificationMessage(verificationResult)}</p>
              <p>
                Task IDs verified:{' '}
                {verificationResult.verifiedCount ?? 0}
              </p>
              <p>
                Verification only. No Firestore data was deleted or modified.
              </p>
            </div>
          )}

          {availableArchiveMonths.length === 0 && (
            <p className="task-archive-empty">
              No months currently meet the archive retention criteria.
            </p>
          )}
        </section>
      </section>
    </section>
  )
}
