
import * as XLSX from 'xlsx'

function toDate(value) {
  if (!value) return null

  let date = value

  if (value instanceof Date) {
    date = value
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {
    date = new Date(value.seconds * 1000)
  } else if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(value)
    }
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    return null
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = toDate(value)
  return date ? date.toISOString() : ''
}

export function getTaskCreatedMonth(task) {
  const date = toDate(task?.createdAt)

  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

/**
 * Returns the retention cutoff month.
 * Only tasks created before this month are archive-eligible.
 *
 * For example, in October 2026, the cutoff is October 2025.
 * Tasks created in October 2025 become eligible in November 2026.
 */
export function getArchiveCutoffMonth(now = new Date()) {
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - 12,
    1
  )

  const year = cutoff.getFullYear()
  const month = String(cutoff.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function isTaskArchiveEligible(task, now = new Date()) {
  const createdMonth = getTaskCreatedMonth(task)

  if (!createdMonth) return false

  return createdMonth < getArchiveCutoffMonth(now)
}

export function getArchiveEligibleTasks(tasks, now = new Date()) {
  if (!Array.isArray(tasks)) return []

  return tasks.filter((task) => isTaskArchiveEligible(task, now))
}

export function getAvailableArchiveMonths(tasks, now = new Date()) {
  const months = new Set()

  for (const task of getArchiveEligibleTasks(tasks, now)) {
    const month = getTaskCreatedMonth(task)

    if (month) months.add(month)
  }

  return [...months].sort().reverse()
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

function createWorkbook(tasks) {
  const rows = tasks.map((task) => ({
    'Task ID': task.id || '',
    'Task Code': task.code || '',
    'Task Title': task.title || '',
    Project: task.project || '',
    'Content Type': task.type || '',
    'Creative Owner': task.pic || '',
    'Creative Owner UID': task.picUid || '',
    Priority: task.priority || '',
    Status: task.status || '',
    Workflow: task.workflowState || 'ASSIGNED',
    Progress: Number(task.progress || 0),
    'Created At': formatDate(task.createdAt),
    'Last Updated': formatDate(task.updatedAt),
    'Start Date': formatDate(task.startDate || task.start),
    Deadline: formatDate(task.deadline),
    'Completed At': formatDate(task.completedAt),
    'Created By UID': task.createdByUid || '',
    'Brief Link': task.link || '',
    'Result Link': task.resultLink || '',
    Notes: task.notes || '',
    'Status History': formatHistory(task.statusHistory),
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

  return workbook
}

// Exports all tasks or tasks from a selected creation month.
export function exportTasksToExcel(tasks, selectedMonth = 'ALL') {
  if (!Array.isArray(tasks)) {
    throw new Error('Invalid task data.')
  }

  const filteredTasks = selectedMonth === 'ALL'
    ? tasks
    : tasks.filter(
        (task) => getTaskCreatedMonth(task) === selectedMonth
      )

  if (filteredTasks.length === 0) {
    throw new Error(
      selectedMonth === 'ALL'
        ? 'There are no tasks available to export.'
        : `There are no tasks for ${selectedMonth}.`
    )
  }

  const workbook = createWorkbook(filteredTasks)
  const datePart = new Date().toISOString().slice(0, 10)

  const fileName = selectedMonth === 'ALL'
    ? `creative-tasks-all-${datePart}.xlsx`
    : `creative-tasks-${selectedMonth}.xlsx`

  XLSX.writeFile(workbook, fileName)

  return {
    fileName,
    exportedCount: filteredTasks.length,
  }
}

// Exports only archive-eligible tasks from the selected month.
export function exportArchiveMonthToExcel(
  tasks,
  selectedMonth,
  now = new Date()
) {
  if (!selectedMonth) {
    throw new Error('Please select an archive month.')
  }

  const availableMonths = getAvailableArchiveMonths(tasks, now)

  if (!availableMonths.includes(selectedMonth)) {
    throw new Error(
      'This month does not meet the 12-month retention requirement or contains no eligible tasks.'
    )
  }

  const eligibleTasks = getArchiveEligibleTasks(tasks, now).filter(
    (task) => getTaskCreatedMonth(task) === selectedMonth
  )

  if (eligibleTasks.length === 0) {
    throw new Error('There are no archive-eligible tasks for this month.')
  }

  if (eligibleTasks.some((task) => !task.id)) {
    throw new Error(
      'Some tasks have no ID. The archive export has been cancelled for safety.'
    )
  }

  const workbook = createWorkbook(eligibleTasks)
  const fileName = `creative-archive-${selectedMonth}.xlsx`

  XLSX.writeFile(workbook, fileName)

  return {
    fileName,
    exportedCount: eligibleTasks.length,
    taskIds: eligibleTasks.map((task) => String(task.id)).sort(),
  }
}

// Verifies an exported archive by reading the downloaded Excel file.
export async function verifyArchiveWorkbook(
  file,
  expectedTasks,
  selectedMonth,
  now = new Date()
) {
  if (!file) {
    throw new Error('Please select the exported archive file to verify.')
  }

  const expectedTasksForMonth = getArchiveEligibleTasks(
    expectedTasks,
    now
  ).filter((task) => getTaskCreatedMonth(task) === selectedMonth)

  if (expectedTasksForMonth.length === 0) {
    throw new Error(
      'There are no eligible tasks to verify for this month.'
    )
  }

  const expectedIds = expectedTasksForMonth.map(
    (task) => String(task.id || '')
  )

  if (expectedIds.some((id) => !id)) {
    throw new Error(
      'Some tasks have no ID. Verification has been cancelled.'
    )
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets['Task Archive']

  if (!sheet) {
    throw new Error('The "Task Archive" worksheet was not found.')
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const actualIds = rows.map(
    (row) => String(row['Task ID'] || '')
  )

  if (actualIds.some((id) => !id)) {
    throw new Error(
      'The archive file contains rows without a Task ID.'
    )
  }

  if (new Set(actualIds).size !== actualIds.length) {
    throw new Error(
      'Duplicate Task IDs were found in the archive file.'
    )
  }

  const expectedSorted = [...expectedIds].sort()
  const actualSorted = [...actualIds].sort()

  const matches =
    expectedSorted.length === actualSorted.length &&
    expectedSorted.every((id, index) => id === actualSorted[index])

  if (!matches) {
    throw new Error(
      `Archive verification failed. Expected ${expectedSorted.length} tasks, ` +
      `but the file contains ${actualSorted.length} tasks or different Task IDs.`
    )
  }

  return {
    verified: true,
    verifiedCount: actualSorted.length,
    taskIds: actualSorted,
    month: selectedMonth,
  }
}

// Returns all available task creation months for the regular export dropdown.
export function getAvailableTaskMonths(tasks) {
  const months = new Set()

  for (const task of tasks || []) {
    const month = getTaskCreatedMonth(task)

    if (month) months.add(month)
  }

  return [...months].sort().reverse()
}
