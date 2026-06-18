# CA1B Connect - Major Platform Upgrade Implementation Plan

## Phase 0: Foundation & Architecture (Files: ~15)
Goal: Create new types, Firestore collections, and foundational services before any UI work.

### 0.1 New Types
- `src/types/SubjectAnnouncement.ts` - Subject-specific announcement type (with subjectCode, pinned, attachments, dueDate, richText)
- `src/types/Settings.ts` - User preferences (theme, privacy, notifications)
- `src/types/Analytics.ts` - Analytics data types
- `src/types/AIUsage.ts` - AI usage tracking type
- `src/types/PushSubscription.ts` - FCM push subscription type

### 0.2 New Services
- `src/services/subjectAnnouncementService.ts` - CRUD for subject-specific announcements
- `src/services/settingsService.ts` - User preferences with Firestore persistence
- `src/services/analyticsService.ts` - Analytics data aggregation
- `src/services/aiUsageService.ts` - AI usage tracking with limits
- `src/services/fcmService.ts` - Firebase Cloud Messaging integration
- `src/services/pwaService.ts` - PWA install prompt detection
- `src/services/privacyService.ts` - Privacy mode checks

### 0.3 Updated Types
- Update `src/types/Subject.ts` - Add announcementsReference, attendanceSessions subcollection reference
- Update `src/types/Announcement.ts` - Add subjectCode, pinned, attachments fields
- Update `src/types/Notification.ts` - Add subjectCode, deepLink fields
- Update `src/types/Profile.ts` - Add privacyMode, settings fields
- Update `src/types/AI.ts` - Add AICreateMultiResult type for multi-instance creation

### 0.4 Firestore Indexes
- Update `firestore.indexes.json` with new composite indexes for:
  - subjectAnnouncements: subjectCode + createdAt, subjectCode + pinned + createdAt
  - attendanceSessions: subjectCode + date (desc)
  - aiUsage: userId + date
  - notifications: targetUserId + createdAt

---

## Phase 1: Subjects Module Upgrade (Files: ~8)
Goal: Transform subjects into full workspaces with announcements, announcements management, and improved UI.

### 1.1 Subject Announcements System
- Create `src/services/subjectAnnouncementService.ts` (full CRUD with pinning, editing, deleting)
- Add announcement management to Subjects detail view (Activities tab equivalent for announcements)
- Create subject announcement form modal with rich text support
- Add file attachment support for announcements

### 1.2 Subjects Detail View Enhancement
- Update `src/pages/subjects/Subjects.tsx`:
  - Add "Announcements" tab next to Activities, Attendance, QR, Schedule
  - Add announcement creation modal
  - Add announcement listing with pinning
  - Add edit/delete controls for authorized users
- Update `src/pages/subjects/Subjects.css` for new announcement styles

### 1.3 Activity Cards Redesign
- Redesign activity cards with cleaner layout, status badges (Upcoming/Ongoing/Finished/Overdue)
- Add dedicated Activity Details page accessible from subject view
- Add prominent Back button on activity details
- Implement overdue auto-detection and badge

---

## Phase 2: Global Subject Pages (Files: ~4)
Goal: Create centralized pages for activities and announcements across all subjects.

### 2.1 Global Subject Activities Page
- Create `src/pages/activities/SubjectActivities.tsx`
- Create `src/pages/activities/SubjectActivities.css`
- Features: search, subject filter, status filter, due date sort
- Exclude completed activities from display
- Activity detail navigation

### 2.2 Global Subject Announcements Page
- Create `src/pages/announcements/SubjectAnnouncements.tsx`
- Create `src/pages/announcements/SubjectAnnouncements.css`
- Features: search, subject filter, sort, pinned announcements first, detail navigation

### 2.3 Route Integration
- Update `src/App.tsx` to add routes for `/subject-activities` and `/subject-announcements`
- Update Navbar to link to new pages

---

## Phase 3: Attendance System Upgrade (Files: ~6)
Goal: Make attendance fully subject-specific with date flexibility and QR improvements.

### 3.1 Multi-Date Attendance
- Update `src/services/subjectService.ts`:
  - Add `createSessionForDate(subjectCode, date, creatorUid)` - create for any date
  - Add `editSession(subjectCode, date, updates)` - edit existing session
  - Add `getSessionHistory(subjectCode)` - full history
- Update Subjects.tsx attendance tab to support date selection for creation
- Add session editing capability

### 3.2 Subject-Specific QR Attendance
- Update `src/pages/qr/QRAttendance.tsx`:
  - Read subjectCode and sessionId from QR data
  - Validate against correct subject
  - Prevent duplicate scans
  - Record attendance only for that specific session/subject
- Update QR code generation in Subjects.tsx to encode: `{ subjectCode, sessionId, date }`
- Update `src/pages/qr/QRAttendance.css`

---

## Phase 4: Profile & Settings (Files: ~8)
Goal: Modern dashboard-style profile and new Settings page.

### 4.1 Profile Page Redesign
- Complete rewrite of `src/pages/profile/Profile.tsx`:
  - Dashboard-style layout with widgets
  - Profile picture, name, role, section hero
  - Attendance summary per subject
  - Activity completion summary
  - Subject statistics
  - Recent activities list
  - Recent announcements list
- Update `src/pages/profile/Profile.css` for modern dashboard layout

### 4.2 Settings Page
- Create `src/pages/settings/Settings.tsx`
- Create `src/pages/settings/Settings.css`
- Appearance section: Light/Dark/System mode toggle
- Install App section: PWA install button with detection
- Privacy section: Public/Private toggle
- Persist to Firestore `userPreferences` collection and localStorage

### 4.3 Navigation Updates
- Add Settings link to profile dropdown in Navbar
- Add route in App.tsx

### 4.4 Student Directory Upgrade
- Update `src/pages/students/Students.tsx`:
  - Clicking student opens dedicated profile page route
  - Display attendance statistics per subject
  - Privacy check: show "This profile is private" if applicable
- Create dedicated student profile route

---

## Phase 5: Dashboard & Calendar (Files: ~6)
Goal: Transform dashboard into the primary hub with calendar integration.

### 5.1 Dashboard Upgrade
- Major rewrite of `src/pages/dashboard/Dashboard.tsx`:
  - Upcoming activities widget
  - Recent announcements widget
  - Attendance summary widget
  - Subject statistics
  - Quick actions panel
  - Progress widgets (completion rates)
  - Recent notifications feed
- Update `src/pages/dashboard/Dashboard.css`

### 5.2 Calendar Integration
- Update `src/pages/calendar/CalendarPage.tsx` to display:
  - Activities (both global and subject)
  - Activity deadlines
  - Announcements (both global and subject)
  - Attendance sessions
- Click events open detail pages
- Update `src/pages/calendar/CalendarPage.css`

---

## Phase 6: Analytics Page (Files: ~4)
Goal: Create modern analytics dashboard similar to mobile screen-time apps.

### 6.1 Analytics Service
- Create/update `src/services/analyticsService.ts`:
  - Activity load timeline data
  - Announcement timeline data
  - Combined workload graph data
  - Subject breakdown
  - Personal productivity stats
  - Attendance analytics

### 6.2 Analytics UI
- Create `src/pages/analytics/Analytics.tsx`
- Create `src/pages/analytics/Analytics.css`
- Features:
  - Activity Load Timeline (daily/weekly/monthly views)
  - Announcement Timeline (daily/weekly/monthly views)
  - Combined Workload Graph
  - Subject Workload Breakdown (by subject)
  - Personal Productivity Statistics
  - Attendance Analytics (present/late/excused/percentage)
- Use chart library (recharts or chart.js)
- Mobile-first design

### 6.3 Route & Navigation
- Add route in App.tsx
- Add Analytics link in Navbar

---

## Phase 7: AI System Upgrade (Files: ~5)
Goal: Multi-entity generation, usage limits, and improved handling.

### 7.1 Multi-Entity AI
- Update `src/types/AI.ts`:
  - Add `AICreateMultiResult` - array of results
  - Add `AIUsageInfo` type
- Update `src/services/aiService.ts`:
  - Add `aiCreateMultipleInstances(prompt)` returning array
  - Handle batch creation of announcements + activities
- Update AI prompt to intelligently split requests
- Update `src/pages/ai/AI.tsx` to handle multiple results
- Update `src/pages/ai/AI.css`

### 7.2 AI Usage Limits
- Create `src/services/aiUsageService.ts`:
  - Track requests per user per day
  - Check limits before allowing requests
  - Return remaining usage, daily limits, reset time
- Create `src/types/AIUsage.ts`:
  - userId, date, count, dailyLimit, resetAt
- Update AI page to display usage info
- Show friendly limit message when exceeded
- Design for future subscription tiers

---

## Phase 8: Notifications & PWA (Files: ~8)
Goal: Complete notification overhaul with FCM push notifications and PWA support.

### 8.1 Notification Center Upgrade
- Rewrite `src/context/NotificationContext.tsx`:
  - Read/unread tracking
  - Better organization with grouping
  - Infinite scrolling support
  - Mobile responsiveness
  - Subject-based grouping
- Update `src/components/common/Navbar.tsx` notification dropdown

### 8.2 PWA Setup
- Update/verify `vite.config.ts` with vite-plugin-pwa configuration
- Create/update `public/sw.js` - service worker
- Create offline fallback page
- Implement install prompt handling
- Background sync for offline actions

### 8.3 FCM Push Notifications
- Create `src/services/fcmService.ts`:
  - Request notification permission
  - Get FCM token
  - Subscribe to topics (per subject)
  - Handle incoming messages
  - Deep linking from notifications
- Create notification preference management
- Trigger push notifications for:
  - New announcements
  - New activities
  - Activity updates
  - Upcoming deadlines
  - Attendance sessions

### 8.4 Firebase Cloud Functions
- Update `functions/src/index.ts`:
  - On announcement create → send push
  - On activity create → send push  
  - On deadline approaching → send reminder
  - Attendance session notifications

---

## Phase 9: Mobile Responsiveness & Quality of Life (Files: ~12)
Goal: Fix all mobile issues and add polish.

### 9.1 Mobile Fixes
- Fix announcement dropdown overflow in Navbar CSS
- Fix notification dropdown overflow in Navbar CSS
- Fix modal sizing issues
- Fix layout clipping
- Fix spacing issues
- Ensure 320px+ support
- Mobile-first card redesigns
- Touch target sizing
- Responsive tables
- No horizontal overflow
- Responsive navigation hamburger menu fix

### 9.2 QoL Features
- Recently viewed activities (localStorage)
- Recently viewed announcements
- Deadline countdown timers (live)
- Skeleton loaders for all pages
- Error boundaries
- Empty states with illustrations
- Better success/error messages
- Accessibility: aria-labels, roles, keyboard navigation
- Focus management

### 9.3 Global Search Enhancement
- Update search to include:
  - Subject announcements
  - Subject activities
  - Student profiles (with privacy check)
- Instant results with debounce
- Better result display

---

## Phase 10: Role-Based Permissions (Files: ~4)
Goal: Scalable permission system.

### 10.1 Permission Service Expansion
- Rewrite `src/services/permissionService.ts`:
  - Student: view only
  - Beadle: manage attendance
  - Officer: manage activities, announcements (per role)
  - Teacher: full control
  - Admin: full system control
- Permission matrix:
  - canManageAttendance(profile)
  - canCreateAnnouncements(profile, subjectCode?)
  - canManageActivities(profile, subjectCode?)
  - canManageStudents(profile)
  - canAccessAnalytics(profile)
  - canAdministrate(profile)

### 10.2 UI Enforcement
- Update Subjects.tsx, Announcements.tsx, Activities.tsx to use new permissions
- Hide/show controls based on permissions
- Add permission checks in subject detail views

---

## Phase 11: Firestore Rules & Optimization (Files: ~3)
Goal: Database security and performance.

### 11.1 Firestore Rules
- Update `firestore.rules`:
  - Subject-based read/write rules
  - Role-based access control
  - Student data privacy rules
  - Rate limiting for AI usage

### 11.2 Performance
- Batch reads where possible
- Add pagination to large collections
- Optimize real-time listeners
- Add caching layer

---

## Phase 12: Testing & Polish (Files: ~2)
Goal: Verify everything works.

### 12.1 Verification
- Test all existing functionality preserved
- Test new features end-to-end
- Mobile testing at 320px, 375px, 414px, 768px, 1024px
- Test attendance flows
- Test AI multi-entity creation
- Test push notifications

### 12.2 Final Polish
- Review all CSS for consistency
- Ensure no dead code/imports
- Verify TypeScript strict mode
- Final accessibility audit

---

## Implementation Order Summary

| Phase | Description | Priority | Dependencies |
|-------|-------------|----------|--------------|
| 0 | Foundation & Architecture | CRITICAL | None |
| 1 | Subjects Module Upgrade | HIGH | Phase 0 |
| 2 | Global Subject Pages | HIGH | Phase 1 |
| 3 | Attendance System Upgrade | HIGH | Phase 0, 1 |
| 4 | Profile & Settings | HIGH | Phase 0 |
| 5 | Dashboard & Calendar | HIGH | Phase 1, 3 |
| 6 | Analytics Page | MEDIUM | Phase 0 |
| 7 | AI System Upgrade | MEDIUM | Phase 0 |
| 8 | Notifications & PWA | MEDIUM | Phase 0 |
| 9 | Mobile Responsiveness | HIGH | All above |
| 10 | Role-Based Permissions | HIGH | Phase 0 |
| 11 | Firestore Rules | MEDIUM | Phase 0 |
| 12 | Testing & Polish | CRITICAL | All above |

## Estimated Total Files Modified/Created: ~75+