/**
 * CA1B Connect - Firebase Functions
 * 
 * All features are designed to work on the Firebase Spark (free) plan.
 * The Spark plan supports Firestore triggers, Auth, and Hosting.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({ maxInstances: 10 });

// Export Google Classroom functions
export {
  classroomOAuthCallback,
  syncGoogleClassroom,
  revokeGoogleClassroomAccess
} from "./classroom";
