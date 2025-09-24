// Export all tool arrays
export { authTools } from './auth-tools.js';
export { taskTools } from './task-tools.js';
export { memoryTools } from './memory-tools.js';
export { activityTools } from './activity-tools.js';
export { timelineTools } from './timeline-tools.js';
export { timeTrackingTools } from './time-tracking-tools.js';
export { aiTasksTools } from './ai-tasks-tools.js';

// Combined tools array for easy import
import { authTools } from './auth-tools.js';
import { taskTools } from './task-tools.js';
import { memoryTools } from './memory-tools.js';
import { activityTools } from './activity-tools.js';
import { timelineTools } from './timeline-tools.js';
import { timeTrackingTools } from './time-tracking-tools.js';
import { aiTasksTools } from './ai-tasks-tools.js';

export const allTools = [
  ...authTools,
  ...taskTools,
  ...memoryTools,
  ...activityTools,
  ...timelineTools,
  ...timeTrackingTools,
  ...aiTasksTools
];