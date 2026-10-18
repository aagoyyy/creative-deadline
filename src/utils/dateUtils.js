
export function getMonthName(year, month) {
    return new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long',
    })
  }
  
  export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }
  
  export function getFirstDayOffset(year, month) {
    // Senin = 0, Minggu = 6
    return (new Date(year, month, 1).getDay() + 6) % 7
  }
  
  export function getCalendarCells(year, month) {
    const offset = getFirstDayOffset(year, month)
    const totalDays = getDaysInMonth(year, month)
  
    const cells = [
      ...Array(offset).fill(null),
      ...Array.from({ length: totalDays }, (_, index) => index + 1),
    ]
  
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
  
    return cells
  }
  
  export function changeMonth(year, month, amount) {
    const date = new Date(year, month + amount, 1)
  
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
    }
  }
  
  /**
   * Mengubah nilai tanggal menjadi Date yang valid.
   * Mendukung string tanggal dan timestamp.
   */
  export function parseDate(value) {
    if (value === null || value === undefined || value === '') {
      return null
    }
  
    // Angka saja tidak cukup untuk menentukan bulan dan tahun.
    // Jangan menebak tanggal lengkap dari angka legacy.
    if (typeof value === 'number') {
      return null
    }
  
    const parsed = new Date(value)
  
    if (Number.isNaN(parsed.getTime())) {
      return null
    }
  
    return parsed
  }
  
  export function formatDate(date, options = {}) {
    const parsedDate = parseDate(date)
  
    if (!parsedDate) return '-'
  
    return parsedDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    })
  }
  
  export function isSameDay(dateA, dateB) {
    const a = parseDate(dateA)
    const b = parseDate(dateB)
  
    if (!a || !b) return false
  
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }
  
  export function isOverdue(task, today = new Date()) {
    if (!task || task.status === 'DONE') return false
  
    const deadline = parseDate(task.deadline)
  
    if (!deadline) return false
  
    const deadlineEnd = new Date(deadline)
    deadlineEnd.setHours(23, 59, 59, 999)
  
    return deadlineEnd < today
  }
  
  export function getDeadlineCategory(task, today = new Date()) {
    if (!task || !task.deadline) return 'NO DATE'
  
    const deadline = parseDate(task.deadline)
  
    if (!deadline) return 'NO DATE'
  
    const dueDate = new Date(deadline)
    dueDate.setHours(0, 0, 0, 0)
  
    const currentDate = new Date(today)
    currentDate.setHours(0, 0, 0, 0)
  
    if (task.status !== 'DONE' && dueDate < currentDate) {
      return 'OVERDUE'
    }
  
    if (dueDate.getTime() === currentDate.getTime()) {
      return 'TODAY'
    }
  
    const endOfWeek = new Date(currentDate)
    endOfWeek.setDate(
      endOfWeek.getDate() + (7 - endOfWeek.getDay())
    )
    endOfWeek.setHours(23, 59, 59, 999)
  
    if (dueDate <= endOfWeek) return 'THIS WEEK'
  
    return 'UPCOMING'
  }
  