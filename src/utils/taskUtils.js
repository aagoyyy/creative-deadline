
export const STATUS_LIST = [
    'NOT STARTED',
    'START',
    'APPROVAL 1',
    'APPROVAL 2',
    'UPLOAD',
    'DONE',
  ]
  
  export function getStatusClass(status) {
    const statusClasses = {
      DONE: 'done',
      START: 'start',
      'APPROVAL 1': 'approval',
      'APPROVAL 2': 'approval',
      UPLOAD: 'upload',
      REVISION: 'revision',
      'NOT STARTED': 'not-started',
    }
  
    return statusClasses[status] || 'not-started'
  }
  
  export function getProgressFromStatus(status) {
    const progressMap = {
      'NOT STARTED': 0,
      START: 20,
      'APPROVAL 1': 50,
      'APPROVAL 2': 80,
      UPLOAD: 90,
      DONE: 100,
      REVISION: 70,
    }
  
    return progressMap[status] ?? 0
  }
  
  export function getStatusFromProgress(progress) {
    if (progress >= 100) return 'DONE'
    if (progress >= 80) return 'APPROVAL 2'
    if (progress >= 50) return 'APPROVAL 1'
    if (progress >= 20) return 'START'
    return 'NOT STARTED'
  }
  
  export function updateTaskStatus(task, status) {
    return {
      ...task,
      status,
      progress: getProgressFromStatus(status),
    }
  }
  
  export function filterTasks(tasks, filters = {}) {
    const {
      search = '',
      project = 'All',
      type = 'All',
      pic = 'All',
      status = 'All',
    } = filters
  
    const keyword = search.trim().toLowerCase()
  
    return tasks.filter((task) => {
      const matchesSearch =
        !keyword ||
        [
          task.title,
          task.code,
          task.project,
          task.type,
          task.pic,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          )
  
      const matchesProject =
        project === 'All' || task.project === project
  
      const matchesType =
        type === 'All' || task.type === type
  
      const matchesPic =
        pic === 'All' || task.pic === pic
  
      const matchesStatus =
        status === 'All' || task.status === status
  
      return (
        matchesSearch &&
        matchesProject &&
        matchesType &&
        matchesPic &&
        matchesStatus
      )
    })
  }
  
  export function getTaskStats(tasks) {
    return {
      total: tasks.length,
  
      inProgress: tasks.filter(
        (task) =>
          task.status !== 'NOT STARTED' &&
          task.status !== 'UPLOAD' &&
          task.status !== 'DONE'
      ).length,
  
      completed: tasks.filter(
        (task) => task.status === 'DONE'
      ).length,
  
      uploaded: tasks.filter(
        (task) => task.status === 'UPLOAD'
      ).length,
  
      approval: tasks.filter(
        (task) =>
          task.status === 'APPROVAL 1' ||
          task.status === 'APPROVAL 2' ||
          task.status === 'REVISION'
      ).length,
    }
  }
  
  export function moveTaskToStatus(tasks, taskId, newStatus) {
    return tasks.map((task) =>
      task.id === taskId
        ? updateTaskStatus(task, newStatus)
        : task
    )
  }
  
  export function updateTask(tasks, taskId, changes) {
    return tasks.map((task) =>
      task.id === taskId
        ? { ...task, ...changes }
        : task
    )
  }
  
  export function deleteTask(tasks, taskId) {
    return tasks.filter((task) => task.id !== taskId)
  }
  