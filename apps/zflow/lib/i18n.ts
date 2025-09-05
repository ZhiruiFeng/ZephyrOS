/**
 * Internationalization utilities for ZFlow
 * Supports English and Chinese languages with localStorage persistence
 */

export type Language = 'en' | 'zh';

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    create: string;
    hide: string;
    search: string;
    filter: string;
    all: string;
    none: string;
    settings: string;
    back: string;
    next: string;
    previous: string;
    start: string;
    stop: string;
    today: string;
    yesterday: string;
    refresh?: string;
  };

  // Navigation
  nav: {
    home: string;
    focus: string;
    overview: string;
    speech: string;
    kanban: string;
    focusMode: string;
    workMode: string;
  };

  // Activity Management
  activity: {
    title: string;
    description: string;
    activityType: string;
    status: string;
    notFound?: string;
    noActivities?: string;
    createActivity: string;
    editActivity: string;
    deleteActivity: string;
    startTimer: string;
    stopTimer: string;
    viewActivityTime: string;
    activityTime: string;
    activityTimeDesc: string;
    
    // Activity types
    typeExercise: string;
    typeWork: string;
    typeStudy: string;
    typeReading: string;
    typeSocial: string;
    typeRelax: string;
    typeMeditation?: string;
    typeMusic?: string;
    typeGaming?: string;
    typeWalking?: string;
    typeCooking?: string;
    typeRest?: string;
    typeCreative?: string;
    typeLearning?: string;
    typeOther: string;
    
    // Activity Editor fields
    activityTitle: string;
    activityDescription: string;
    selectActivityType: string;
    location: string;
    locationPlaceholder: string;
    companions: string;
    companionsPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    insights: string;
    insightsPlaceholder: string;
    gratitude: string;
    gratitudePlaceholder: string;
    
    // Mood and Energy
    moodBefore: string;
    moodAfter: string;
    energyBefore: string;
    energyAfter: string;
    satisfactionLevel: string;
    intensityLevel: string;
    
    // Intensity levels
    intensityLow: string;
    intensityModerate: string;
    intensityHigh: string;
    intensityIntense: string;
  };

  // Task Management
  task: {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    tags: string;
    category: string;
    createTask: string;
    editTask: string;
    deleteTask: string;
    taskTitle: string;
    taskDescription: string;
    
    // Status options
    statusPending: string;
    statusInProgress: string;
    statusCompleted: string;
    statusOnHold: string;
    statusCancelled: string;
    
    // Priority options
    priorityUrgent: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    
    // Actions
    addTask: string;
    addToCategory: string;
    joinAttentionPool: string;
    markCompleted: string;
    activateTask: string;
    reopenTask: string;
    holdTask: string;
    createCurrentTask: string;
    createAndStart: string;
    createNormalTaskDesc: string;
    createCurrentTaskDesc: string;
    
    // Task Editor fields
    selectCategory: string;
    estimatedDuration: string;
    estimatedDurationPlaceholder: string;
    progress: string;
    assignee: string;
    assigneePlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    tagsField: string;
  };

  // UI Labels
  ui: {
    totalTasks: string;
    planned: string;
    inProgress: string;
    completed: string;
    backlog: string;
    abandoned: string;
    allStatus: string;
    allPriority: string;
    searchPlaceholder: string;
    tagsPlaceholder: string;
    hideCompleted: string;
    showCompletedCounts: string;
    sidebar: string;
    listView: string;
    gridView: string;
    statistics?: string;
    noTasks: string;
    createdAt: string;
    overdue: string;
    currentCategory: string;
    uncategorized: string;
    noCategory: string;
    selectCategory: string;
    taskSorting: string;
    sortNone: string;
    sortByPriority: string;
    sortByDueDate: string;
    completedAt: string;
    cancelledAt: string;
    display: string;
    // Task Editor
    editTaskTitle: string;
    // Categories
    allCategories: string;
    categories: string;
    newCategoryName: string;
    newCategory: string;
    editCategory: string;
    deleteCategory: string;
    categoryName: string;
    // Overview page specific
    currentTasks: string;
    backlogItems: string;
    archivedTasks: string;
    noCurrentTasks: string;
    noBacklogItems: string;
    noArchivedTasks: string;
    searchTasks: string;
    // Mobile test
    mobileTest: string;
    mobileOptimization: string;
    mobileOptimizationComplete: string;
    optimizationFeatures: string;
    completionRate: string;
    testLinks: string;
    focusModeOptimization: string;
    kanbanModeOptimization: string;
    workModeOptimization: string;
    mobileHeader: string;
    responsiveModeSwitching: string;
    touchFriendlyButtons: string;
    mobileLayout: string;
    mobileSidebar: string;
    responsiveEditor: string;
    mobileToolbar: string;
    touchDragSupport: string;
    mobileSearchFilter: string;
    testFocusMode: string;
    testKanbanMode: string;
    testWorkMode: string;
    testFocusModeDesc: string;
    testKanbanModeDesc: string;
    testWorkModeDesc: string;
    // Features list
    responsiveLayout: string;
    responsiveLayoutDesc: string;
    touchFriendlyInteraction: string;
    touchFriendlyInteractionDesc: string;
    mobileSidebarFeature: string;
    mobileSidebarDesc: string;
    mobileToolbarFeature: string;
    mobileToolbarDesc: string;
    mobileSearchFeature: string;
    mobileSearchDesc: string;
    mobileKanbanFeature: string;
    mobileKanbanDesc: string;
    // FloatingAddButton
    newTask: string;
    newTaskShortcut: string;
    testDescription: string;
    // Energy Spectrum
    energySpectrumTitle: string;
    lastSaved: string;
    lowEnergy: string;
    highEnergy: string;
    energyAxis: string;
    timeAxis: string;
    editableRange: string;
    allDay: string;
    notEditableFutureDate: string;
    closeTaskFocus: string;
    focused: string;
    unnamedTask: string;
    // Energy Review Modal
    energyReview: string;
    timeEdit: string;
    editTime: string;
    timeSavedSuccessfully: string;
    endTimeMustBeAfterStart: string;
    saveFailed: string;
    // Archive page
    archiveOlderThan24h: string;
    backToHome: string;
    reopenToPending: string;
    // Kanban
    todo: string;
    done24h: string;
    kanbanTitle: string;
    dragToUpdateStatus: string;
    workMode: string;
    work: string;
    category: string;
    priority: string;
    allPriorities: string;
    editTask: string;
    wipLimitExceeded: string;
    backlogLimitExceeded: string;
    focusToMaintainProductivity: string;
    simplifyForClarity: string;
    // Generic entity labels
    task?: string;
    activity?: string;
    // Work Mode specific
    taskExplorer: string;
    selectTaskToWork: string;
    currentTasksDesc: string;
    backlogTasksDesc: string;
    taskList: string;
    hideSidebar: string;
    showSidebar: string;
    switchToKanban: string;
    showTaskInfo: string;
    hideTaskInfo: string;
    taskInfo: string;
    saving: string;
    saveNotes: string;
    selectTaskToStart: string;
    selectTaskFromLeft: string;
    openTaskList: string;
    writeNotesHere: string;
    addTag: string;
    enterTag: string;
    unassigned: string;
    dueDate: string;
    estimatedDurationMinutes: string;
    assignee: string;
    minutes: string;
    idle: string;
    // Time tracking
    focusTime: string;
    viewTimeSegmentsByDay: string;
    year: string;
    month: string;
    timing: string;
    timingStatus: string;
    pleaseSelectDate: string;
    calendar: string;
    zoomOut: string;
    zoomIn: string;
    noTimeSegments: string;
    timelineView: string;
    timeListView: string;
    timeRange?: string;
    now?: string;
    recorded?: string;
    invalidTimeFormat?: string;
    weekdays: string[];
    startTime?: string;
    endTime?: string;
    note?: string;
    addTimeEntry?: string;
    // Auth prompts
    loginRequired?: string;
    loginToViewTimeline?: string;
    // Category selector
    clearSelection?: string;
    noCategoriesFound?: string;
    searchCategories?: string;
    // Daily Time Modal
    unknownTask: string;
    summaryByCategory: string;
    dailyTimeDistribution: string;
    crossDaySegment: string;
    loadFailed: string;
    noData: string;
    // Subtasks
    subtasks: string;
    addSubtask: string;
    createSubtask: string;
    creating: string;
    noSubtasksYet: string;
    addSubtaskToGetStarted: string;
    // Date and time
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    defaultDate: string;
    showTimezone: string;
  };

  // Messages and notifications
  messages: {
    taskCreated: string;
    taskUpdated: string;
    taskDeleted: string;
    taskCreateFailed: string;
    taskUpdateFailed: string;
    taskDeleteFailed: string;
    activityCreateFailed?: string;
    titleRequired?: string;
    confirmDelete: string;
    noTasksYet: string;
    loadingTasks: string;
    failedToLoadTasks: string;
    retry: string;
    confirmDeleteCategory: string;
    categoryDeleteFailed: string;
    failedToLoadSubtasks: string;
  };

  // Meta information
  meta: {
    appTitle: string;
    appDescription: string;
    taskManagementWorkbench: string;
  };

  // Profile page
  profile: {
    yourProfile: string;
    personalProductivityInsights: string;
    customizeModules: string;
    addModules: string;
    enabledModules: string;
    availableModules: string;
    noModulesEnabled: string;
    addModulesToGetStarted: string;
    noModulesAvailable: string;
    productivityStats: string;
    activitySummary: string;
    timeRange: string;
    showTrends: string;
    tasksCompleted: string;
    completionRate: string;
    timeSpent: string;
    productivityScore: string;
    weeklyGoal: string;
    weeklyProgress: string;
    tasks: string;
    showRecentTasks: string;
    maxItems: string;
    completed: string;
    inProgress: string;
    pending: string;
  };

  // Speech to text
  speech: {
    title: string;
    description: string;
    startRecording: string;
    stopRecording: string;
    reset: string;
    language: string;
    model: string;
    recording: string;
    transcribing: string;
    clickToStart: string;
    recordingError: string;
    transcribeError: string;
    chinese: string;
    english: string;
    auto: string;
    notSupported: string;
  };
}

const translations: Record<Language, TranslationKeys> = {
  en: {
    common: {
      loading: 'Loading',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      hide: 'Hide',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      none: 'None',
      settings: 'Settings',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      start: 'Start',
      stop: 'Stop',
      today: 'Today',
      yesterday: 'Yesterday',
      refresh: 'Refresh',
    },
    nav: {
      home: 'Home',
      focus: 'Focus',
      overview: 'Overview',
      speech: 'Speech',
      kanban: 'Kanban',
      focusMode: 'Focus Mode',
      workMode: 'Work Mode',
    },
    activity: {
      title: 'Title',
      description: 'Description',
      activityType: 'Activity Type',
      status: 'Status',
      notFound: 'Activity not found',
      noActivities: 'No activities yet',
      createActivity: 'Create Activity',
      editActivity: 'Edit Activity',
      deleteActivity: 'Delete Activity',
      startTimer: 'Start Timer',
      stopTimer: 'Stop Timer',
      viewActivityTime: 'View Activity Time',
      activityTime: 'Activity Time',
      activityTimeDesc: 'View activity time segments by day',
      
      // Activity types
      typeExercise: 'Exercise',
      typeWork: 'Work',
      typeStudy: 'Study',
      typeReading: 'Reading',
      typeSocial: 'Social',
      typeRelax: 'Relax',
      typeMeditation: 'Meditation',
      typeMusic: 'Music',
      typeGaming: 'Gaming',
      typeWalking: 'Walking',
      typeCooking: 'Cooking',
      typeRest: 'Rest',
      typeCreative: 'Creative',
      typeLearning: 'Learning',
      typeOther: 'Other',
      
      // Activity Editor fields
      activityTitle: 'Activity title...',
      activityDescription: 'Activity description...',
      selectActivityType: 'Select activity type...',
      location: 'Location',
      locationPlaceholder: 'Where did this activity take place?',
      companions: 'Companions',
      companionsPlaceholder: 'Who were you with?',
      notes: 'Notes',
      notesPlaceholder: 'Any additional notes...',
      insights: 'Insights',
      insightsPlaceholder: 'What did you learn or realize?',
      gratitude: 'Gratitude',
      gratitudePlaceholder: 'What are you grateful for?',
      
      // Mood and Energy
      moodBefore: 'Mood Before',
      moodAfter: 'Mood After',
      energyBefore: 'Energy Before',
      energyAfter: 'Energy After',
      satisfactionLevel: 'Satisfaction Level',
      intensityLevel: 'Intensity Level',
      
      // Intensity levels
      intensityLow: 'Low',
      intensityModerate: 'Moderate',
      intensityHigh: 'High',
      intensityIntense: 'Intense',
    },
    task: {
      title: 'Title',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      dueDate: 'Due Date',
      tags: 'Tags',
      category: 'Category',
      createTask: 'Create Task',
      editTask: 'Edit Task',
      deleteTask: 'Delete Task',
      taskTitle: 'Task title...',
      taskDescription: 'Task description (optional)...',
      
      statusPending: 'Todo',
      statusInProgress: 'In Progress',
      statusCompleted: 'Completed',
      statusOnHold: 'On Hold',
      statusCancelled: 'Cancelled',
      
      priorityUrgent: 'Urgent',
      priorityHigh: 'High',
      priorityMedium: 'Medium',
      priorityLow: 'Low',
      
      addTask: 'Add Task',
      addToCategory: 'Add to',
      joinAttentionPool: 'Join attention pool after creation (Pending)',
      markCompleted: 'Mark as Completed',
      activateTask: 'Activate',
      reopenTask: 'Reopen',
      holdTask: 'Hold',
      createCurrentTask: 'Create Current Task',
      createAndStart: 'Create & Start',
      createNormalTaskDesc: 'Complete task setup with all options',
      createCurrentTaskDesc: 'Simplified for immediate work',
      
      selectCategory: 'Select category...',
      estimatedDuration: 'Estimated Duration (minutes)',
      estimatedDurationPlaceholder: 'e.g. 480',
      progress: 'Progress (%)',
      assignee: 'Assignee',
      assigneePlaceholder: 'Enter assignee name',
      notes: 'Notes',
      notesPlaceholder: 'Additional notes...',
      tagsField: 'Tags',
    },
    ui: {
      totalTasks: 'Total Tasks',
      planned: 'Planned',
      inProgress: 'In Progress',
      completed: 'Completed',
      backlog: 'Backlog',
      abandoned: 'Abandoned',
      allStatus: 'All Status',
      allPriority: 'All Priority',
      searchPlaceholder: 'Search title or description...',
      tagsPlaceholder: 'Tags (comma separated)...',
      hideCompleted: 'Hide Completed',
      showCompletedCounts: 'Show Completed Count in Sidebar',
      sidebar: 'Sidebar',
      listView: 'List',
      gridView: 'Grid',
      noTasks: 'No tasks yet',
      createdAt: 'Created at',
      overdue: '(Overdue)',
      currentCategory: 'Current category',
      uncategorized: 'Uncategorized',
      noCategory: 'No Category',
      selectCategory: 'Select Category',
      taskSorting: 'Task Sorting',
      sortNone: 'No Sorting',
      sortByPriority: 'By Priority',
      sortByDueDate: 'By Due Date',
      completedAt: 'Completed at',
      cancelledAt: 'Cancelled at',
      display: 'Display',
      editTaskTitle: 'Edit Task',
      allCategories: 'All Categories',
      categories: 'Categories',
      newCategoryName: 'New category name',
      newCategory: 'New Category', 
      editCategory: 'Edit Category',
      deleteCategory: 'Delete Category',
      categoryName: 'Category name',
      currentTasks: 'Current Tasks',
      backlogItems: 'Backlog Items',
      archivedTasks: 'Archived Tasks',
      noCurrentTasks: 'No current tasks',
      noBacklogItems: 'No backlog items',
      noArchivedTasks: 'No archived tasks',
      searchTasks: 'Search tasks...',
      mobileTest: 'Mobile Test',
      mobileOptimization: 'Mobile Optimization',
      mobileOptimizationComplete: 'Mobile Optimization Complete',
      optimizationFeatures: 'Optimization Features',
      completionRate: 'Completion Rate',
      testLinks: 'Test Links',
      focusModeOptimization: 'Focus Mode Optimization',
      kanbanModeOptimization: 'Kanban Mode Optimization',
      workModeOptimization: 'Work Mode Optimization',
      mobileHeader: 'Mobile Header Navigation',
      responsiveModeSwitching: 'Responsive Mode Switching',
      touchFriendlyButtons: 'Touch Friendly Buttons',
      mobileLayout: 'Mobile Single Column Layout',
      mobileSidebar: 'Mobile Sidebar',
      responsiveEditor: 'Responsive Editor',
      mobileToolbar: 'Mobile Toolbar',
      touchDragSupport: 'Touch Drag Support',
      mobileSearchFilter: 'Mobile Search and Filter',
      testFocusMode: 'Test Focus Mode',
      testKanbanMode: 'Test Kanban Mode',
      testWorkMode: 'Test Work Mode',
      testFocusModeDesc: 'Test kanban and work mode',
      testKanbanModeDesc: 'Test drag and mobile layout',
      testWorkModeDesc: 'Test sidebar and editor',
      // Work Mode specific
      taskExplorer: 'Task Explorer',
      selectTaskToWork: 'Select task to start focused work',
      currentTasksDesc: 'Show current and overdue tasks',
      backlogTasksDesc: 'Show paused tasks',
      taskList: 'Task List',
      hideSidebar: 'Hide Sidebar',
      showSidebar: 'Show Sidebar',
      switchToKanban: 'Switch to Kanban',
      showTaskInfo: 'Show Task Info',
      hideTaskInfo: 'Hide Task Info',
      taskInfo: 'Task Info',
      saving: 'Saving...',
      saveNotes: 'Save Notes',
      selectTaskToStart: 'Select task to start working',
      selectTaskFromLeft: 'Select a task from the left to view and edit its notes',
      openTaskList: 'Open Task List',
      writeNotesHere: 'Record your thoughts, progress and notes here...',
      addTag: 'Add Tag',
      enterTag: 'Enter tag:',
      unassigned: 'Unassigned',
      dueDate: 'Due Date',
      estimatedDurationMinutes: 'Estimated Duration (minutes)',
      assignee: 'Assignee',
      minutes: 'minutes',
      idle: 'Idle',
      // Subtasks
      subtasks: 'Subtasks',
      addSubtask: 'Add Subtask',
      createSubtask: 'Create Subtask',
      creating: 'Creating...',
      noSubtasksYet: 'No subtasks yet',
      addSubtaskToGetStarted: 'Add a subtask to get started',
      // Date and time
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      defaultDate: 'Default Date',
      showTimezone: 'Show Timezone',
      // Time tracking
      focusTime: 'Focus Time',
      viewTimeSegmentsByDay: 'View task focus time segments by day',
      year: 'Year',
      month: 'Month',
      timing: 'Timing',
      timingStatus: 'Timing', 
      pleaseSelectDate: 'Please select date',
      calendar: 'Calendar',
      zoomOut: 'Zoom out',
      zoomIn: 'Zoom in',
      noTimeSegments: 'No time segments',
      timelineView: 'Timeline View',
      timeListView: 'List View',
      statistics: 'Statistics',
      now: 'Now',
      recorded: 'Recorded',
      invalidTimeFormat: 'Invalid time format',
      loginRequired: 'Please sign in',
      loginToViewTimeline: 'Sign in to view your timeline records',
      clearSelection: 'Clear selection',
      noCategoriesFound: 'No categories found',
      searchCategories: 'Search categories...',
      timeRange: 'Time Range',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      startTime: 'Start time',
      endTime: 'End time',
      note: 'Note',
      addTimeEntry: 'Add time entry',
      // Daily Time Modal
      unknownTask: 'Unknown Task',
      summaryByCategory: 'Summary by Category',
      dailyTimeDistribution: 'Daily Time Distribution',
      crossDaySegment: 'Cross-day Task Segment',
      loadFailed: 'Load Failed',
      noData: 'No Data',
      // FloatingAddButton
      newTask: 'New Task',
      newTaskShortcut: 'New Task (Shortcut: Ctrl+N)',
      // Archive page
      archiveOlderThan24h: 'Archive (Completed over 24 hours ago)',
      backToHome: 'Back to Home',
      reopenToPending: 'Reopen → Pending',
      // Kanban
      todo: 'Todo',
      done24h: 'Done (24h)',
      kanbanTitle: 'Kanban',
      dragToUpdateStatus: 'Drag cards between columns to update task status',
      workMode: 'Work Mode',
      work: 'Work',
      category: 'Category',
      priority: 'Priority',
      allPriorities: 'All Priorities',
      editTask: 'Edit',
      wipLimitExceeded: 'Currently more than 3 tasks in progress, consider focusing to maintain productivity.',
      backlogLimitExceeded: 'Backlog exceeds 10 tasks, consider simplifying for clarity.',
      focusToMaintainProductivity: 'focusing to maintain productivity',
      simplifyForClarity: 'simplifying for clarity',
      task: 'Task',
      activity: 'Activity',
      responsiveLayout: 'Responsive Layout',
      responsiveLayoutDesc: 'Adaptive to different screen sizes, from mobile to desktop',
      touchFriendlyInteraction: 'Touch Friendly Interaction',
      touchFriendlyInteractionDesc: 'Optimized button sizes and spacing for finger operation',
      mobileSidebarFeature: 'Mobile Sidebar',
      mobileSidebarDesc: 'Swipeable sidebar with gesture support',
      mobileToolbarFeature: 'Mobile Toolbar',
      mobileToolbarDesc: 'Compact toolbar design saves screen space',
      mobileSearchFeature: 'Mobile Search',
      mobileSearchDesc: 'Optimized search interface and filters',
      mobileKanbanFeature: 'Mobile Kanban',
      mobileKanbanDesc: 'Single column layout suitable for vertical scrolling',
      testDescription: 'All pages have been optimized for mobile devices, providing better user experience',
      // Energy Spectrum
      energySpectrumTitle: 'Energy Spectrum',
      lastSaved: 'Last saved',
      lowEnergy: 'Low',
      highEnergy: 'High',
      energyAxis: 'Energy (1–10)',
      timeAxis: 'Time of day',
      editableRange: 'Editable range',
      allDay: 'All day',
      notEditableFutureDate: 'Not editable (future date)',
      closeTaskFocus: 'Close task focus',
      focused: 'Focused',
      unnamedTask: 'Unnamed Task',
      // Energy Review Modal
      energyReview: 'Energy Review',
      timeEdit: 'Time Edit',
      editTime: 'Edit Time',
      timeSavedSuccessfully: 'Time saved successfully!',
      endTimeMustBeAfterStart: 'End time must be after start time!',
      saveFailed: 'Save failed, please try again.',
    },
    messages: {
      taskCreated: 'Task created successfully',
      taskUpdated: 'Task updated successfully',
      taskDeleted: 'Task deleted successfully',
      taskCreateFailed: 'Failed to create task, please try again',
      taskUpdateFailed: 'Failed to update task, please try again',
      taskDeleteFailed: 'Failed to delete task, please try again',
      titleRequired: 'Title is required',
      activityCreateFailed: 'Failed to create activity, please try again',
      confirmDelete: 'Are you sure you want to delete this task?',
      noTasksYet: 'No tasks yet, start by adding your first task!',
      loadingTasks: 'Loading tasks...',
      failedToLoadTasks: 'Failed to load tasks',
      retry: 'Retry',
      confirmDeleteCategory: 'Are you sure you want to delete this category? Associated tasks will become uncategorized.',
      categoryDeleteFailed: 'Delete failed, please try again',
      failedToLoadSubtasks: 'Failed to load subtasks',
    },
    meta: {
      appTitle: 'ZFlow - Task Management System',
      appDescription: 'Personal AI operating system task management module',
      taskManagementWorkbench: 'Efficient task workbench (List / Grid / Kanban / Stats)',
    },
    profile: {
      yourProfile: 'Your Profile',
      personalProductivityInsights: 'Personal productivity insights and statistics',
      customizeModules: 'Customize Modules',
      addModules: 'Add Modules',
      enabledModules: 'Enabled Modules',
      availableModules: 'Available Modules',
      noModulesEnabled: 'No modules enabled',
      addModulesToGetStarted: 'Add modules to get started with your personalized dashboard',
      noModulesAvailable: 'No modules available',
      productivityStats: 'Productivity Stats',
      activitySummary: 'Activity Summary',
      timeRange: 'Time Range',
      showTrends: 'Show Trends',
      tasksCompleted: 'Tasks Completed',
      completionRate: 'completion rate',
      timeSpent: 'Time Spent',
      productivityScore: 'Productivity Score',
      weeklyGoal: 'Weekly Goal',
      weeklyProgress: 'Weekly Progress',
      tasks: 'tasks',
      showRecentTasks: 'Show Recent Tasks',
      maxItems: 'Max Items',
      completed: 'Completed',
      inProgress: 'In Progress',
      pending: 'Pending',
    },
    speech: {
      title: 'Speech to Text (Batch Fallback Version)',
      description: 'No audio storage, only for quick text input. Uses OpenAI gpt-4o-mini-transcribe by default.',
      startRecording: 'Start Recording',
      stopRecording: 'Stop & Transcribe',
      reset: 'Reset',
      language: 'Language',
      model: 'Model',
      recording: 'Recording... Release to start transcribing',
      transcribing: 'Transcribing...',
      clickToStart: 'Click "Start Recording", then it will automatically convert to text when finished',
      recordingError: 'Recording error',
      transcribeError: 'Transcription failed',
      chinese: 'Chinese',
      english: 'English',
      auto: 'Auto',
      notSupported: 'Browser does not support MediaRecorder (recommended desktop Chrome/Edge).',
    },
  },
  zh: {
    common: {
      loading: '加载中',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      hide: '隐藏',
      search: '搜索',
      filter: '筛选',
      all: '全部',
      none: '无',
      settings: '设置',
      back: '返回',
      next: '下一步',
      previous: '上一步',
      start: '开始',
      stop: '停止',
      today: '今天',
      yesterday: '昨天',
      refresh: '刷新',
    },
    nav: {
      home: '首页',
      focus: '专注',
      overview: '概览',
      speech: '语音',
      kanban: '看板',
      focusMode: '专注模式',
      workMode: '工作模式',
    },
    activity: {
      title: '标题',
      description: '描述',
      activityType: '活动类型',
      status: '状态',
      notFound: '活动不存在',
      noActivities: '暂无活动记录',
      createActivity: '创建活动',
      editActivity: '编辑活动',
      deleteActivity: '删除活动',
      startTimer: '开始计时',
      stopTimer: '停止计时',
      viewActivityTime: '查看活动时间',
      activityTime: '活动时间',
      activityTimeDesc: '按日查看该活动的时间段',
      
      // Activity types
      typeExercise: '运动',
      typeWork: '工作',
      typeStudy: '学习',
      typeReading: '阅读',
      typeSocial: '社交',
      typeRelax: '放松',
      typeMeditation: '冥想',
      typeMusic: '音乐',
      typeGaming: '游戏',
      typeWalking: '散步',
      typeCooking: '烹饪',
      typeRest: '休息',
      typeCreative: '创作',
      typeLearning: '学习',
      typeOther: '其他',
      
      // Activity Editor fields
      activityTitle: '活动标题...',
      activityDescription: '活动描述...',
      selectActivityType: '选择活动类型...',
      location: '地点',
      locationPlaceholder: '这个活动在哪里进行？',
      companions: '同伴',
      companionsPlaceholder: '你和谁在一起？',
      notes: '备注',
      notesPlaceholder: '任何额外的备注...',
      insights: '感悟',
      insightsPlaceholder: '你学到了什么或意识到了什么？',
      gratitude: '感恩',
      gratitudePlaceholder: '你感谢什么？',
      
      // Mood and Energy
      moodBefore: '活动前心情',
      moodAfter: '活动后心情',
      energyBefore: '活动前能量',
      energyAfter: '活动后能量',
      satisfactionLevel: '满意度',
      intensityLevel: '强度水平',
      
      // Intensity levels
      intensityLow: '低',
      intensityModerate: '中等',
      intensityHigh: '高',
      intensityIntense: '很高',
    },
    task: {
      title: '标题',
      description: '描述',
      status: '状态',
      priority: '优先级',
      dueDate: '截止时间',
      tags: '标签',
      category: '分类',
      createTask: '创建任务',
      editTask: '编辑任务',
      deleteTask: '删除任务',
      taskTitle: '任务标题...',
      taskDescription: '任务描述（可选）...',
      
      statusPending: '待办',
      statusInProgress: '进行中',
      statusCompleted: '已完成',
      statusOnHold: '搁置',
      statusCancelled: '取消',
      
      priorityUrgent: '紧急',
      priorityHigh: '高',
      priorityMedium: '中',
      priorityLow: '低',
      
      addTask: '新建任务',
      addToCategory: '添加到',
      joinAttentionPool: '创建后加入注意力池（Pending）',
      markCompleted: '标记为完成',
      activateTask: '激活',
      reopenTask: '重新打开',
      holdTask: '暂停',
      createCurrentTask: '创建当前任务',
      createAndStart: '创建并开始',
      createNormalTaskDesc: '完整任务设置，包含所有选项',
      createCurrentTaskDesc: '简化创建，立即开始工作',
      
      selectCategory: '选择分类...',
      estimatedDuration: '预计用时（分钟）',
      estimatedDurationPlaceholder: '例如：480',
      progress: '完成进度（%）',
      assignee: '负责人',
      assigneePlaceholder: '输入负责人姓名',
      notes: '备注',
      notesPlaceholder: '附加备注...',
      tagsField: '标签',
    },
    ui: {
      totalTasks: '总任务',
      planned: '计划中',
      inProgress: '进行中',
      completed: '已完成',
      backlog: '待办项',
      abandoned: '废弃',
      allStatus: '全部状态',
      allPriority: '全部优先级',
      searchPlaceholder: '搜索标题或描述...',
      tagsPlaceholder: '标签（用英文逗号分隔）...',
      hideCompleted: '隐藏已完成',
      showCompletedCounts: '侧边栏显示完成数',
      sidebar: '侧边栏',
      listView: '列表',
      gridView: '网格',
      noTasks: '暂无任务',
      createdAt: '创建于',
      overdue: '（已逾期）',
      currentCategory: '当前分类',
      uncategorized: '未分类',
      noCategory: '无分类',
      selectCategory: '选择分类',
      taskSorting: '任务排序',
      sortNone: '不排序',
      sortByPriority: '按优先级',
      sortByDueDate: '按截止时间',
      completedAt: '完成于',
      cancelledAt: '取消于',
      display: '显示',
      editTaskTitle: '编辑任务',
      allCategories: '全部分类',
      categories: '分类',
      newCategoryName: '新分类名称',
      newCategory: '新建分类',
      editCategory: '编辑分类', 
      deleteCategory: '删除分类',
      categoryName: '分类名称',
      currentTasks: '当前任务',
      backlogItems: '待办事项',
      archivedTasks: '归档任务',
      noCurrentTasks: '暂无当前任务',
      noBacklogItems: '暂无待办事项',
      noArchivedTasks: '暂无归档任务',
      searchTasks: '搜索任务...',
      mobileTest: '移动端测试',
      mobileOptimization: '移动端优化',
      mobileOptimizationComplete: '移动端优化完成',
      optimizationFeatures: '优化功能',
      completionRate: '完成度',
      testLinks: '测试链接',
      focusModeOptimization: '专注模式优化',
      kanbanModeOptimization: '看板模式优化',
      workModeOptimization: '工作模式优化',
      mobileHeader: '移动端头部导航',
      responsiveModeSwitching: '响应式模式切换',
      touchFriendlyButtons: '触摸友好的按钮',
      mobileLayout: '移动端单列布局',
      mobileSidebar: '移动端侧边栏',
      responsiveEditor: '响应式编辑器',
      mobileToolbar: '移动端工具栏',
      touchDragSupport: '触摸拖拽支持',
      mobileSearchFilter: '移动端搜索和过滤',
      testFocusMode: '测试专注模式',
      testKanbanMode: '测试看板模式',
      testWorkMode: '测试工作模式',
      testFocusModeDesc: '测试看板和工作模式',
      testKanbanModeDesc: '测试拖拽和移动端布局',
      testWorkModeDesc: '测试侧边栏和编辑器',
      // Work Mode specific
      taskExplorer: '任务资源管理器',
      selectTaskToWork: '选择任务开始专注工作',
      currentTasksDesc: '显示当前和过期的任务',
      backlogTasksDesc: '显示暂停的任务',
      taskList: '任务列表',
      hideSidebar: '隐藏侧边栏',
      showSidebar: '显示侧边栏',
      switchToKanban: '切换到看板',
      showTaskInfo: '显示任务信息',
      hideTaskInfo: '隐藏任务信息',
      taskInfo: '任务信息',
      saving: '保存中...',
      saveNotes: '保存笔记',
      selectTaskToStart: '选择任务开始工作',
      selectTaskFromLeft: '从左侧选择一个任务来查看和编辑其笔记',
      openTaskList: '打开任务列表',
      writeNotesHere: '在这里记录你的想法、进度和笔记...',
      addTag: '添加标签',
      enterTag: '请输入标签:',
      unassigned: '未分配',
      dueDate: '截止日期',
      estimatedDurationMinutes: '预估时长 (分钟)',
      assignee: '负责人',
      minutes: '分钟',
      idle: '空闲',
      // Time tracking
      focusTime: '专注时间',
      viewTimeSegmentsByDay: '按日查看该任务的专注时间段',
      year: '年',
      month: '月',
      timing: '计时中',
      timingStatus: '计时中',
      pleaseSelectDate: '请选择日期',
      calendar: '日历',
      zoomOut: '缩小',
      zoomIn: '放大',
      noTimeSegments: '无时间段',
      timelineView: '日历视图',
      timeListView: '列表视图',
      statistics: '统计',
      now: '此刻',
      recorded: '记录时长',
      invalidTimeFormat: '时间格式无效',
      loginRequired: '请先登录',
      loginToViewTimeline: '登录后即可查看您的时间线记录',
      clearSelection: '清除选择',
      noCategoriesFound: '没有找到分类',
      searchCategories: '搜索分类...',
      timeRange: '时间范围',
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      startTime: '开始时间',
      endTime: '结束时间',
      note: '备注',
      addTimeEntry: '新增时间段',
      // Daily Time Modal
      unknownTask: '未知任务',
      summaryByCategory: '按类别汇总',
      dailyTimeDistribution: '每日时间分布',
      crossDaySegment: '跨天任务片段',
      loadFailed: '加载失败',
      noData: '无数据',
      // FloatingAddButton
      newTask: '新建任务',
      newTaskShortcut: '新建任务 (快捷键: Ctrl+N)',
      // Archive page
      archiveOlderThan24h: 'Archive（超过24小时的已完成）',
      backToHome: '返回首页',
      reopenToPending: '重新打开 → Pending',
      // Kanban
      todo: 'Todo',
      done24h: 'Done (24h)',
      kanbanTitle: '看板',
      dragToUpdateStatus: '拖拽卡片在列之间即可更新任务状态',
      workMode: 'Work Mode',
      work: '工作',
      category: '分类',
      priority: '优先级',
      allPriorities: '全部优先级',
      editTask: '编辑',
      wipLimitExceeded: '当前进行中的任务已超过 3 个，建议收敛以保持专注。',
      backlogLimitExceeded: '待办池已超过 10 个，考虑精简以提升清晰度。',
      focusToMaintainProductivity: '收敛以保持专注',
      simplifyForClarity: '精简以提升清晰度',
      task: '任务',
      activity: '活动',
      responsiveLayout: '响应式布局',
      responsiveLayoutDesc: '自适应不同屏幕尺寸，从手机到桌面',
      touchFriendlyInteraction: '触摸友好交互',
      touchFriendlyInteractionDesc: '优化按钮大小和间距，适合手指操作',
      mobileSidebarFeature: '移动端侧边栏',
      mobileSidebarDesc: '可滑动的侧边栏，支持手势操作',
      mobileToolbarFeature: '移动端工具栏',
      mobileToolbarDesc: '紧凑的工具栏设计，节省屏幕空间',
      mobileSearchFeature: '移动端搜索',
      mobileSearchDesc: '优化的搜索界面和过滤器',
      mobileKanbanFeature: '移动端看板',
      mobileKanbanDesc: '单列布局，适合垂直滚动',
      testDescription: '所有页面都已针对移动设备进行了优化，提供更好的用户体验',
      // Energy Spectrum
      energySpectrumTitle: '能量图谱',
      lastSaved: '上次保存',
      lowEnergy: '低',
      highEnergy: '高',
      energyAxis: '能量（1–10）',
      timeAxis: '一天中的时间',
      editableRange: '可编辑范围',
      allDay: '全天',
      notEditableFutureDate: '不可编辑（未来日期）',
      closeTaskFocus: '关闭任务专注',
      focused: '专注中',
      unnamedTask: '无名任务',
      // Energy Review Modal
      energyReview: '能量回顾',
      timeEdit: '时间编辑',
      editTime: '编辑时间',
      timeSavedSuccessfully: '时间已保存成功！',
      endTimeMustBeAfterStart: '结束时间必须晚于开始时间',
      saveFailed: '保存失败，请重试。',
      // Subtasks
      subtasks: '子任务',
      addSubtask: '添加子任务',
      createSubtask: '创建子任务',
      creating: '创建中...',
      noSubtasksYet: '暂无子任务',
      addSubtaskToGetStarted: '添加子任务开始分解工作',
      // Date and time
      today: '今天',
      yesterday: '昨天',
      thisWeek: '本周',
      thisMonth: '本月',
      defaultDate: '默认日期',
      showTimezone: '显示时区',
    },
    messages: {
      taskCreated: '任务创建成功',
      taskUpdated: '任务更新成功',
      taskDeleted: '任务删除成功',
      taskCreateFailed: '创建任务失败，请重试',
      taskUpdateFailed: '更新任务失败，请重试',
      taskDeleteFailed: '删除任务失败，请重试',
      titleRequired: '标题不能为空',
      confirmDelete: '确定要删除这个任务吗？',
      noTasksYet: '还没有任务，开始添加你的第一个任务！',
      loadingTasks: '加载任务中...',
      failedToLoadTasks: '加载任务失败',
      retry: '重试',
      confirmDeleteCategory: '确定要删除这个分类吗？关联的任务将变为未分类。',
      categoryDeleteFailed: '删除失败，请重试',
      failedToLoadSubtasks: '加载子任务失败',
    },
    meta: {
      appTitle: 'ZFlow - 任务管理系统',
      appDescription: '个人AI操作系统的任务管理模块',
      taskManagementWorkbench: '简洁高效的任务工作台（列表 / 网格 / 看板 / 统计）',
    },
    profile: {
      yourProfile: '个人档案',
      personalProductivityInsights: '个人生产力洞察和统计数据',
      customizeModules: '自定义模块',
      addModules: '添加模块',
      enabledModules: '已启用模块',
      availableModules: '可用模块',
      noModulesEnabled: '未启用任何模块',
      addModulesToGetStarted: '添加模块以开始使用您的个性化仪表板',
      noModulesAvailable: '暂无可用模块',
      productivityStats: '生产力统计',
      activitySummary: '活动摘要',
      timeRange: '时间范围',
      showTrends: '显示趋势',
      tasksCompleted: '已完成任务',
      completionRate: '完成率',
      timeSpent: '花费时间',
      productivityScore: '生产力评分',
      weeklyGoal: '周目标',
      weeklyProgress: '周进度',
      tasks: '任务',
      showRecentTasks: '显示最近任务',
      maxItems: '最大项目数',
      completed: '已完成',
      inProgress: '进行中',
      pending: '待处理',
    },
    speech: {
      title: '语音转文字（批量回退版）',
      description: '不存音频，仅用于快速输入文本。默认使用 OpenAI gpt-4o-mini-transcribe。',
      startRecording: '开始录音',
      stopRecording: '停止并转写',
      reset: '重置',
      language: '语言',
      model: '模型',
      recording: '录音中… 松开后开始转写',
      transcribing: '转写中…',
      clickToStart: '点击"开始录音"，结束后自动转文字',
      recordingError: '录音错误',
      transcribeError: '转写失败',
      chinese: '中文',
      english: 'English',
      auto: '自动',
      notSupported: '浏览器不支持 MediaRecorder（建议桌面 Chrome/Edge）。',
    },
  },
};

// Get current language from localStorage or default to English
export const getCurrentLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  
  try {
    const stored = localStorage.getItem('zflow:language');
    return (stored === 'zh' || stored === 'en') ? stored : 'en';
  } catch {
    return 'en';
  }
};

// Set and persist language
export const setCurrentLanguage = (lang: Language): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('zflow:language', lang);
    // Trigger a custom event so components can react to language changes
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  } catch {
    console.warn('Failed to save language preference');
  }
};

// Get translations for current language
export const getTranslations = (lang?: Language): TranslationKeys => {
  const currentLang = lang || getCurrentLanguage();
  return translations[currentLang] || translations.en;
};

// Translation hook-like function
export const useTranslation = () => {
  const currentLang = getCurrentLanguage();
  const t = getTranslations(currentLang);
  
  return {
    t,
    currentLang,
    setLanguage: setCurrentLanguage,
    isEnglish: currentLang === 'en',
    isChinese: currentLang === 'zh',
  };
};

// Helper function to get nested translation
export const getNestedTranslation = (
  translations: TranslationKeys,
  path: string
): string => {
  const keys = path.split('.');
  let current: any = translations;
  
  for (const key of keys) {
    current = current?.[key];
    if (current === undefined) {
      console.warn(`Translation missing for path: ${path}`);
      return path; // Return the path as fallback
    }
  }
  
  return current;
};
