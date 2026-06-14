//Firestore Database rule

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function isAdmin() {
      return signedIn()
        && request.auth.token.email in [
          "rreobaldez@gbox.adnu.edu.ph"
        ];
    }

    function isGbox() {
      return signedIn()
        && request.auth.token.email.matches('.*@gbox\\.adnu\\.edu\\.ph$');
    }

    function hasProfile() {
      return signedIn()
        && exists(/databases/$(database)/documents/classCA1B_Profiles/$(request.auth.uid));
    }

    function myProfile() {
      return get(/databases/$(database)/documents/classCA1B_Profiles/$(request.auth.uid));
    }

    function canManageAttendance() {
      return signedIn()
        && (
          isAdmin()
          || (
            hasProfile()
            && (
              myProfile().data.officerRole == "beadle"
              || myProfile().data.role == "teacher"
            )
          )
        );
    }

    function canManageActivities() {
      return signedIn()
        && (
          isAdmin()
          || (
            hasProfile()
            && (
              myProfile().data.role == "teacher"
              || myProfile().data.officerRole in [
                "president",
                "vp",
                "beadle"
              ]
            )
          )
        );
    }

    function canManageEvents() {
      return signedIn()
        && (
          isAdmin()
          || (
            hasProfile()
            && (
              myProfile().data.role == "teacher"
              || myProfile().data.officerRole in [
                "president",
                "vp",
                "pio",
                "beadle"
              ]
            )
          )
        );
    }

    function canCreateAnnouncements() {
      return signedIn()
        && (
          isAdmin()
          || (
            hasProfile()
            && (
              myProfile().data.role == "teacher"
              || myProfile().data.officerRole in [
                "beadle",
                "president",
                "vp",
                "secretary",
                "pio"
              ]
            )
          )
        );
    }

    function canCreatePersonalTasks() {
      return signedIn()
        && hasProfile()
        && isGbox();
    }

    function validActivityType() {
      return request.resource.data.type in [
        "assignment",
        "project",
        "activity"
      ];
    }

    function validActivityFile() {
      return !request.resource.data.keys().hasAny(["file"])
        || (
          request.resource.data.file is map
          && request.resource.data.file.keys().hasOnly([
            "name",
            "url"
          ])
          && request.resource.data.file.name is string
          && request.resource.data.file.url is string
        );
    }

    function validActivityShape(activityId) {
      return request.resource.data.id == activityId
        && request.resource.data.title is string
        && request.resource.data.type is string
        && validActivityType()
        && request.resource.data.details is string
        && request.resource.data.deadline is string
        && request.resource.data.items is list
        && request.resource.data.completedBy is map
        && request.resource.data.createdBy is string
        && request.resource.data.updatedBy == request.auth.uid
        && validActivityFile()
        && request.resource.data.keys().hasOnly([
          "id",
          "title",
          "type",
          "details",
          "deadline",
          "items",
          "file",
          "completedBy",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy"
        ]);
    }

    function validActivityCreate(activityId) {
      return validActivityShape(activityId)
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.completedBy == {};
    }

    function validActivityManagerUpdate(activityId) {
      return validActivityShape(activityId)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt;
    }

    function validActivityCompletionUpdate(activityId) {
      return signedIn()
        && hasProfile()
        && request.resource.data.id == resource.data.id
        && request.resource.data.id == activityId
        && request.resource.data.title == resource.data.title
        && request.resource.data.type == resource.data.type
        && request.resource.data.details == resource.data.details
        && request.resource.data.deadline == resource.data.deadline
        && request.resource.data.items == resource.data.items
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.updatedBy == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          "completedBy",
          "updatedAt",
          "updatedBy"
        ])
        && request.resource.data.completedBy.diff(resource.data.completedBy).affectedKeys().hasOnly([
          request.auth.uid
        ])
        && (
          !request.resource.data.completedBy.keys().hasAny([request.auth.uid])
          || (
            request.resource.data.completedBy[request.auth.uid].keys().hasOnly([
              "uid",
              "name",
              "email",
              "completedAt"
            ])
            && request.resource.data.completedBy[request.auth.uid].uid == request.auth.uid
            && request.resource.data.completedBy[request.auth.uid].email == myProfile().data.email
            && request.resource.data.completedBy[request.auth.uid].name == myProfile().data.name
          )
        );
    }

    function validEventType() {
      return request.resource.data.type in [
        "class",
        "school",
        "deadline",
        "reminder"
      ];
    }

    function validEventShape(eventId) {
      return request.resource.data.id == eventId
        && request.resource.data.title is string
        && request.resource.data.type is string
        && validEventType()
        && request.resource.data.date is string
        && request.resource.data.time is string
        && request.resource.data.location is string
        && request.resource.data.details is string
        && request.resource.data.createdBy is string
        && request.resource.data.updatedBy == request.auth.uid
        && request.resource.data.keys().hasOnly([
          "id",
          "title",
          "type",
          "date",
          "time",
          "location",
          "details",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy"
        ]);
    }

    function validEventCreate(eventId) {
      return validEventShape(eventId)
        && request.resource.data.createdBy == request.auth.uid;
    }

    function validEventUpdate(eventId) {
      return validEventShape(eventId)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt;
    }

    function validAttendanceCreate(dateId) {
      return request.resource.data.id == dateId
        && request.resource.data.date == dateId
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.updatedBy == request.auth.uid
        && request.resource.data.keys().hasOnly([
          "id",
          "date",
          "records",
          "summary",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy"
        ]);
    }

    function validAttendanceUpdate(dateId) {
      return request.resource.data.id == resource.data.id
        && request.resource.data.date == resource.data.date
        && request.resource.data.id == dateId
        && request.resource.data.date == dateId
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.updatedBy == request.auth.uid
        && request.resource.data.keys().hasOnly([
          "id",
          "date",
          "records",
          "summary",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy"
        ]);
    }

    function validAnnouncementShape(announcementId) {
      return request.resource.data.id == announcementId
        && request.resource.data.title is string
        && request.resource.data.content is string
        && request.resource.data.category is string
        && request.resource.data.category in ["major", "minor"]
        && request.resource.data.createdBy is string
        && request.resource.data.creatorName is string
        && request.resource.data.creatorRole is string
        && request.resource.data.creatorPhotoURL is string
        && request.resource.data.keys().hasOnly([
          "id",
          "title",
          "content",
          "category",
          "createdBy",
          "creatorName",
          "creatorRole",
          "creatorPhotoURL",
          "createdAt",
          "updatedAt"
        ]);
    }

    function validPersonalTaskShape() {
      return request.resource.data.id is string
        && request.resource.data.uid is string
        && request.resource.data.title is string
        && request.resource.data.description is string
        && request.resource.data.date is string
        && request.resource.data.time is string
        && request.resource.data.completed is bool
        && request.resource.data.createdBy is string
        && request.resource.data.keys().hasOnly([
          "id",
          "uid",
          "title",
          "description",
          "date",
          "time",
          "deadline",
          "completed",
          "createdBy",
          "createdAt",
          "updatedAt"
        ]);
    }

    match /classCA1B_Profiles/{uid} {
      allow create: if isOwner(uid)
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.id == request.auth.uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.keys().hasOnly([
          "id",
          "uid",
          "name",
          "email",
          "number",
          "numberVerified",
          "birthday",
          "role",
          "class",
          "officerRole",
          "status",
          "section",
          "bio",
          "photoURL",
          "createdAt",
          "updatedAt"
        ])
        && (
          (
            isGbox()
            && request.resource.data.role == "student"
            && request.resource.data.status == "active"
            && request.resource.data.class == "CA1B"
            && request.resource.data.section == "CA1B"
          )
          ||
          (
            !isGbox()
            && request.resource.data.role == "visitor"
            && request.resource.data.status == "pending"
          )
        );

      allow read: if signedIn();

      allow update: if isAdmin()
        || (
          isOwner(uid)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            "name",
            "number",
            "numberVerified",
            "birthday",
            "bio",
            "photoURL",
            "updatedAt"
          ])
          && request.resource.data.email == resource.data.email
          && request.resource.data.role == resource.data.role
          && request.resource.data.officerRole == resource.data.officerRole
          && request.resource.data.status == resource.data.status
          && request.resource.data.class == resource.data.class
          && request.resource.data.section == resource.data.section
          && request.resource.data.uid == resource.data.uid
          && request.resource.data.id == resource.data.id
          && request.resource.data.createdAt == resource.data.createdAt
        );

      allow delete: if isAdmin();
    }

    match /classCA1B/{documentId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /classCA1B_Attendance/{dateId} {
      allow read: if signedIn();

      allow create: if canManageAttendance()
        && validAttendanceCreate(dateId);

      allow update: if canManageAttendance()
        && validAttendanceUpdate(dateId);

      allow delete: if canManageAttendance();
    }

    match /classCA1B_Activities/{activityId} {
      allow read: if signedIn();

      allow create: if canManageActivities()
        && validActivityCreate(activityId);

      allow update: if (
        canManageActivities()
        && validActivityManagerUpdate(activityId)
      ) || validActivityCompletionUpdate(activityId);

      allow delete: if canManageActivities();
    }

    match /classCA1B_Events/{eventId} {
      allow read: if signedIn();

      allow create: if canManageEvents()
        && validEventCreate(eventId);

      allow update: if canManageEvents()
        && validEventUpdate(eventId);

      allow delete: if canManageEvents();
    }

    // NEW: Announcements collection
    match /classCA1B_Announcements/{announcementId} {
      allow read: if signedIn();

      allow create: if canCreateAnnouncements()
        && validAnnouncementShape(announcementId)
        && request.resource.data.createdBy == request.auth.uid;

      allow update: if canCreateAnnouncements()
        && validAnnouncementShape(announcementId);

      allow delete: if canCreateAnnouncements();
    }

    // NEW: Personal Tasks collection (private per user, GBOX only)
    match /classCA1B_UserTasks/{taskId} {
      allow read: if signedIn()
        && request.auth.uid == resource.data.uid;

      allow create: if canCreatePersonalTasks()
        && validPersonalTaskShape()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.createdBy == request.auth.uid;

      allow update: if canCreatePersonalTasks()
        && request.auth.uid == resource.data.uid
        && request.resource.data.uid == resource.data.uid;

      allow delete: if canCreatePersonalTasks()
        && request.auth.uid == resource.data.uid;
    }
  }
}