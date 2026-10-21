
import * as XLSX from 'xlsx'

function toDate(value) {
  if (!value) return null

  let date = value

  if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {
    date = new Date(value.seconds * 1000)
  } else if (typeof value === 'string') {
    // Tanggal YYYY-MM-DD dipertahankan sebagai tanggal kalender.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    date = new Date(value)
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatDate(value) {
  const date = toDate(value)

  if (!date) return ''

  return date.toISOString()
}

function getCreatedMonth(task) {
  const date = toDate(task.createdAt)

  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function formatHistory(history) {
  if (!Array.isArray(history)) return ''

  return history.map((item) => {
    const changedAt = formatDate(item.changedAt)

    return [
      `${item.from || '-'} → ${item.to || '-'}`,
      changedAt,
      item.changedByName || '',
      item.changedByEmail || '',
    ].filter(Boolean).join(' | ')
  }).join('\n')
}

export function exportTasksToExcel(tasks, selectedMonth = 'ALL') {
  if (!Array.isArray(tasks)) {
    throw new Error('Data task tidak valid.')
  }

  const filteredTasks = selectedMonth === 'ALL'
    ? tasks
    : tasks.filter(
        (task) => getCreatedMonth(task) === selectedMonth
      )

  if (filteredTasks.length === 0) {
    throw new Error(
      selectedMonth === 'ALL'
        ? 'Tidak ada data task untuk diekspor.'
        : `Tidak ada task pada bulan ${selectedMonth}.`
    )
  }

  const rows = filteredTasks.map((task) => ({
    'Task ID': task.id || '',
    'Kode Task': task.code || '',
    'Judul Task': task.title || '',
    'Project': task.project || '',
    'Tipe Konten': task.type || '',
    'PIC': task.pic || '',
    'PIC UID': task.picUid || '',
    'Prioritas': task.priority || '',
    'Status': task.status || '',
    'Workflow': task.workflowState || 'ASSIGNED',
    'Progress': Number(task.progress || 0),
    'Tanggal Dibuat': formatDate(task.createdAt),
    'Terakhir Diubah': formatDate(task.updatedAt),
    'Tanggal Mulai': formatDate(task.startDate || task.start),
    'Deadline': formatDate(task.deadline),
    'Tanggal Selesai': formatDate(task.completedAt),
    'Pembuat Task UID': task.createdByUid || '',
    'Link Brief': task.link || '',
    'Link Hasil': task.resultLink || '',
    'Catatan': task.notes || '',
    'Riwayat Status': formatHistory(task.statusHistory),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 28 },
    { wch: 36 },
    { wch: 36 },
    { wch: 40 },
    { wch: 60 },
  ]

  if (worksheet['!ref']) {
    worksheet['!autofilter'] = {
      ref: worksheet['!ref'],
    }
  }

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Task Archive'
  )

  const datePart = new Date().toISOString().slice(0, 10)
  const fileName = selectedMonth === 'ALL'
    ? `creative-tasks-all-${datePart}.xlsx`
    : `creative-tasks-${selectedMonth}.xlsx`

  XLSX.writeFile(workbook, fileName)

  return {
    fileName,
    exportedCount: rows.length,
  }
}

export function getAvailableTaskMonths(tasks) {
  const months = new Set()

  for (const task of tasks) {
    const month = getCreatedMonth(task)

    if (month) {
      months.add(month)
    }
  }

  return [...months].sort().reverse()
}
