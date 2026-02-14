import type { Activity } from '../types';
import systemActivityService from '../services/systemActivityService';

// Cache for system activities to avoid repeated API calls
let systemActivitiesCache: Activity[] | null = null;
let systemActivitiesPromise: Promise<Activity[]> | null = null;

/**
 * Fetches system activities from the database.
 * Uses caching to avoid repeated API calls during the same session.
 */
export const getSystemActivities = async (): Promise<Activity[]> => {
  // Return cached data if available
  if (systemActivitiesCache) {
    return systemActivitiesCache;
  }

  // If a request is already in progress, return that promise
  if (systemActivitiesPromise) {
    return systemActivitiesPromise;
  }

  // Fetch from API
  systemActivitiesPromise = systemActivityService
    .getSystemActivities()
    .then((response) => {
      if (response.success && response.data) {
        // Add visitId: 'system' to each activity for consistency
        systemActivitiesCache = response.data.map((activity) => ({
          ...activity,
          visitId: 'system',
        }));
        return systemActivitiesCache;
      }
      // If API fails, return empty array
      return [];
    })
    .catch((error) => {
      console.error('Error fetching system activities:', error);
      return [];
    })
    .finally(() => {
      // Clear the promise so we can retry if needed
      systemActivitiesPromise = null;
    });

  return systemActivitiesPromise;
};

/**
 * Merges system activities with visit activities, ensuring system activities appear first
 * and visit activities maintain their relative order.
 * This function is async now since it needs to fetch from the database.
 */
export const mergeActivitiesWithSystem = async (
  visitActivities: Activity[]
): Promise<Activity[]> => {
  const systemActivities = await getSystemActivities();

  // If no system activities, just return visit activities
  if (systemActivities.length === 0) {
    return visitActivities;
  }

  // Get the maximum order from system activities
  const maxSystemOrder = Math.max(...systemActivities.map((a) => a.order), -1);

  // Adjust visit activities' order to come after system activities
  const adjustedVisitActivities = visitActivities.map((activity) => ({
    ...activity,
    order: activity.order + maxSystemOrder + 1,
  }));

  // Combine and sort by order
  return [...systemActivities, ...adjustedVisitActivities].sort((a, b) => a.order - b.order);
};

