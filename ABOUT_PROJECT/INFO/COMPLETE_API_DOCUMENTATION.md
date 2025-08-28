# Complete API Documentation - FrameSync

FrameSync quick reference (based on current Express routes and mounts in `server/index.js`):

- Base mounts: `/media`, `/users`, `/annotations`, `/organizations`, `/org-invites`, `/media-shared`
- Media:
  - POST `/media/upload` (multipart: file + body: title, type, uploaded_by)
  - GET `/media?userId=<uuid>`
  - PATCH `/media/:id` { title }
  - DELETE `/media/:id`
- Annotations (MongoDB):
  - GET `/annotations?media_id=<uuid>`
  - POST `/annotations`
  - GET `/annotations/timeline/:media_id?start=&end=`
- Organizations:
  - GET `/organizations/user/:userId`
  - GET `/organizations/:orgId/members`
- Organization Invites (mounted at `/org-invites`):
  - GET `/org-invites/test`
  - POST `/org-invites/send`
  - GET `/org-invites/pending/:userId`
  - POST `/org-invites/accept/:inviteId`
  - POST `/org-invites/reject/:inviteId`
- Users:
  - GET `/users?keycloak_id=<uuid>` | `/users?search=<q>`
  - POST `/users` (creates KC client/roles/org; stores org and owner membership)

Notes:
- Share-link endpoints are not implemented in the server.
- NextAuth-specific endpoints are not part of this server.
- Protect routes with Keycloak in production.

## 📋 Overview

This document provides a comprehensive list of all APIs used in your Media Review Application, including:
- **Backend REST APIs** (Node.js/Express)
- **Frontend API Calls** (Next.js)
- **WebSocket Events** (Socket.io)
- **External Service APIs** (Keycloak, Email)

---

## 🏗️ API Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • fetch()       │    │ • REST Routes   │    │ • Keycloak      │
│ • WebSocket     │    │ • WebSocket     │    │ • Email (SMTP)  │
│ • (Keycloak JS) │    │ • Middleware    │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔐 Authentication & Authorization APIs

### 1. Keycloak JS Adapter (Frontend)

Tokens are managed via the Keycloak JS adapter in `client/lib/keycloak.js`. The client includes `Authorization: Bearer <token>` in API calls and during Socket.IO initialization.

### 2. Keycloak Admin APIs (Backend)

#### **Organization Management**
```javascript
// Keycloak Admin API calls
inviteUserToOrg({ orgId, email, role })
inviteExistingUserToOrg({ orgId, email, role })
assignRealmRoles({ userId, roles })
createOrganizationForUser({ userId, orgName })
createClientForOrg({ orgId, clientId })
getOrganizationByName({ name })
addUserToOrg({ orgId, userId, role })
isUserInOrg({ orgId, userId })
```

**Why Used**: 
- **Dynamic Organization Creation**: Creates organizations on-demand when users sign up
- **Role Assignment**: Assigns appropriate roles (owner, reviewer, viewer) to users
- **Client Management**: Creates Keycloak clients for each organization
- **Access Control**: Manages user membership in organizations

---

## 📁 Media Management APIs

### 1. Media Upload & Storage

#### **`POST /api/media/upload`**
```javascript
// Request
{
  "file": File,           // Multipart file upload
  "title": "Video Title", // Media title
  "type": "video"         // Media type
}

// Response
{
  "success": true,
  "media": {
    "id": 123,
    "title": "Video Title",
    "filePath": "/uploads/1234567890-video.mp4",
    "type": "video",
    "ownerId": "user-123"
  }
}
```

**Why Used**:
- **File Storage**: Stores media files locally with unique names
- **Metadata Management**: Tracks media information in PostgreSQL
- **Access Control**: Only owners can upload media
- **File Size Limits**: 200MB limit with Multer

#### **`GET /api/media/my-media`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "My Video",
    "filePath": "/uploads/1234567890-video.mp4",
    "type": "video",
    "ownerId": "user-123",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Owner Dashboard**: Shows media owned by the current user
- **Media Management**: Allows owners to view and manage their content
- **Role-Based Access**: Only owners can see their own media

### 2. Media Access & Sharing

#### **`GET /api/media/all`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "Shared Video",
    "ownerId": "owner-123",
    "accessType": "shared" // or "owned"
  }
]
```

**Why Used**:
- **Unified View**: Shows both owned and shared media
- **Access Control**: Filters based on user permissions
- **Dashboard Integration**: Used in main dashboard

#### **`GET /api/media/reviewer`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "Review Video",
    "sharedBy": "John Doe (john@example.com)",
    "sharedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Reviewer Dashboard**: Shows media shared with reviewers
- **Collaboration Tracking**: Shows who shared the media
- **Role-Specific Access**: Only reviewers can access this endpoint

#### **`GET /api/media/viewer`**
```javascript
// Response
[
  {
    "id": 123,
    "title": "View Video",
    "sharedBy": "John Doe (john@example.com)",
    "sharedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Viewer Dashboard**: Shows media shared with viewers
- **Read-Only Access**: Viewers can only view, not edit
- **Permission Management**: Enforces viewer-only permissions

#### **`GET /api/media/:id`**
```javascript
// Response
{
  "id": 123,
  "title": "Video Title",
  "filePath": "/uploads/1234567890-video.mp4",
  "type": "video",
  "ownerId": "user-123"
}
```

**Why Used**:
- **Media Details**: Gets specific media information
- **Access Validation**: Checks if user has permission to view
- **Media Viewer**: Used when opening media for viewing/editing

#### **`DELETE /api/media/:id`**
```javascript
// Response
{
  "success": true,
  "message": "Media deleted successfully"
}
```

**Why Used**:
- **Media Cleanup**: Removes media files and database records
- **Owner Control**: Only media owners can delete
- **Storage Management**: Frees up disk space

---

## 🔗 Sharing & Invitation APIs

### 1. Share Link Generation (Future scope — not implemented in this repo)

#### **`POST /api/media/:id/share-links`**
```javascript
// Request
{
  "role": "reviewer",        // "reviewer" or "viewer"
  "inviteeEmail": "user@example.com", // Optional
  "expiresInDays": 7,        // Optional
  "maxUses": 10              // Optional
}

// Response
{
  "url": "http://localhost:3001/share/abc123def456",
  "link": {
    "id": 456,
    "token": "abc123def456",
    "mediaId": 123,
    "grantedRole": "reviewer",
    "expiresAt": "2024-01-08T00:00:00Z",
    "maxUses": 10,
    "uses": 0
  }
}
```

**Why Used**:
- **Secure Sharing**: Generates cryptographically secure tokens
- **Role-Based Access**: Assigns specific roles to shared media
- **Email Integration**: Can send email invitations automatically
- **Expiration Control**: Links can expire after a set time
- **Usage Limits**: Can limit number of times link is used

#### **`GET /api/media/share-links/:token/check`** (Future scope)
```javascript
// Response
{
  "valid": true,
  "mediaId": 123,
  "grantedRole": "reviewer",
  "inviteeEmail": "user@example.com",
  "shareType": "email",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

**Why Used**:
- **Link Validation**: Checks if share link is still valid
- **Access Verification**: Validates expiration and usage limits
- **User Experience**: Shows appropriate UI based on link status

#### **`POST /api/media/share-links/:token/accept`** (Future scope)
```javascript
// Request
{
  // JWT token in Authorization header
}

// Response
{
  "mediaId": 123,
  "grantedRole": "reviewer",
  "success": true
}
```

**Why Used**:
- **Access Granting**: Gives user access to shared media
- **Database Updates**: Creates MediaAccess records
- **Usage Tracking**: Increments link usage count
- **Email Verification**: Validates email for restricted links

### 2. Organization Invites

#### **`POST /api/invites`**
```javascript
// Request
{
  "email": "user@example.com",
  "role": "reviewer",
  "orgId": "org-123",        // Optional
  "mediaId": 123             // Optional
}

// Response
{
  "url": "http://localhost:3001/share/xyz789abc123",
  "token": "xyz789abc123"
}
```

**Why Used**:
- **Organization Management**: Invites users to join organizations
- **Keycloak Integration**: Creates users and assigns roles in Keycloak
- **Email Notifications**: Sends invitation emails
- **Media Sharing**: Can include specific media access

#### **`GET /api/invites/:token`**
```javascript
// Response
{
  "email": "user@example.com",
  "role": "reviewer",
  "orgId": "org-123",
  "status": "pending"
}
```

**Why Used**:
- **Invite Validation**: Checks invite status and details
- **User Experience**: Shows invite information before acceptance
- **Error Handling**: Validates invite tokens

#### **`POST /api/invites/:token/accept`**
```javascript
// Request
{
  // JWT token in Authorization header
}

// Response
{
  "success": true,
  "organization": {
    "id": "org-123",
    "name": "My Organization"
  },
  "role": "reviewer"
}
```

**Why Used**:
- **Organization Membership**: Adds user to organization
- **Role Assignment**: Assigns appropriate roles in Keycloak
- **Media Access**: Grants access to shared media if included
- **User Setup**: Handles new user registration flow

---

## 🏢 Organization Management APIs

### 1. Organization Creation & Management

#### **`POST /api/organizations/create`**
```javascript
// Request
{
  "orgName": "My Organization",
  "userEmail": "admin@example.com"
}

// Response
{
  "success": true,
  "data": {
    "organization": {
      "id": "org-123",
      "name": "My Organization",
      "keycloakId": "uuid-123"
    },
    "client": {
      "clientId": "client-my-org",
      "secret": "secret-123"
    }
  }
}
```

**Why Used**:
- **Dynamic Organizations**: Creates organizations on-demand
- **Keycloak Integration**: Creates corresponding Keycloak organization
- **Client Management**: Creates Keycloak client for organization
- **Role Setup**: Sets up organization-specific roles

#### **`POST /api/organizations/:orgName/create-client`**
```javascript
// Request
{
  "clientId": "custom-client-id"
}

// Response
{
  "success": true,
  "data": {
    "clientId": "custom-client-id",
    "secret": "generated-secret"
  }
}
```

**Why Used**:
- **Client Management**: Creates Keycloak clients for organizations
- **Custom Configuration**: Allows custom client IDs
- **Security**: Generates secure client secrets

#### **`GET /api/organizations/:orgId/users`**
```javascript
// Response
{
  "success": true,
  "users": [
    {
      "id": "user-123",
      "username": "john.doe",
      "email": "john@example.com",
      "roles": ["reviewer"]
    }
  ]
}
```

**Why Used**:
- **User Management**: Lists all users in an organization
- **Role Visibility**: Shows user roles within organization
- **Administration**: Helps organization admins manage members

#### **`POST /api/organizations/:orgId/users`**
```javascript
// Request
{
  "userId": "user-123",
  "role": "reviewer"
}

// Response
{
  "success": true,
  "message": "User successfully assigned to organization"
}
```

**Why Used**:
- **Member Management**: Adds users to organizations
- **Role Assignment**: Assigns specific roles to users
- **Access Control**: Manages organization membership

---

## 💬 Comments & Annotations APIs

### 1. Comments Management

#### **`GET /api/comments/:mediaId`**
```javascript
// Response
[
  {
    "id": "comment-123",
    "mediaId": 123,
    "userId": "user-123",
    "username": "John Doe",
    "text": "Great video!",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Comment Display**: Shows all comments for a media file
- **Real-time Updates**: Used with WebSocket for live comments
- **User Context**: Shows who wrote each comment

### 2. Annotations Management

#### **`GET /api/annotations?media_id=123`**
```javascript
// Response
[
  {
    "id": "annotation-123",
    "mediaId": 123,
    "userId": "user-123",
    "username": "John Doe",
    "type": "point",
    "coordinates": { "x": 100, "y": 200 },
    "text": "Important point here",
    "timestamp": 30.5, // For video annotations
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Why Used**:
- **Annotation Display**: Shows all annotations on media
- **Spatial Data**: Handles coordinate-based annotations
- **Video Support**: Includes timestamp for video annotations
- **Real-time Collaboration**: Used with WebSocket for live updates

#### **`POST /api/annotations`**
```javascript
// Request
{
  "media_id": 123,
  "user_id": "user-123",
  "username": "John Doe",
  "coordinates": { "x": 100, "y": 200 },
  "text": "Important point here",
  "timestamp": 30.5 // Optional for video
}

// Response
{
  "id": "annotation-123",
  "mediaId": 123,
  "userId": "user-123",
  "coordinates": { "x": 100, "y": 200 },
  "text": "Important point here",
  "timestamp": 30.5
}
```

**Why Used**:
- **Annotation Creation**: Creates new annotations on media
- **Coordinate Storage**: Stores spatial positioning data
- **User Attribution**: Links annotations to specific users
- **Real-time Broadcasting**: Triggers WebSocket events

#### **`GET /api/annotations/timeline/:media_id?start=0&end=30`**
```javascript
// Response
[
  {
    "id": "annotation-123",
    "timestamp": 15.2,
    "text": "Annotation at 15 seconds"
  }
]
```

**Why Used**:
- **Video Timeline**: Shows annotations for specific time ranges
- **Performance**: Filters annotations by time for efficiency
- **Video Player Integration**: Used with video player timeline

---

## 👤 User Management APIs

### 1. User Information & Setup

#### **`GET /api/users/dashboard-info`**
```javascript
// Response
{
  "success": true,
  "data": {
    "username": "John Doe",
    "email": "john@example.com",
    "organizations": [
      {
        "id": "org-123",
        "name": "My Organization",
        "role": "owner"
      }
    ],
    "mediaCount": 5
  }
}
```

**Why Used**:
- **Dashboard Data**: Provides user information for dashboard
- **Organization Context**: Shows user's organization memberships
- **Statistics**: Shows user's media count and activity

#### **`POST /api/users/setup`**
```javascript
// Request
{
  "userEmail": "john@example.com",
  "preferredUsername": "john.doe"
}

// Response
{
  "success": true,
  "message": "User setup completed successfully",
  "data": {
    "organization": {
      "id": "org-123",
      "name": "org-john"
    }
  }
}
```

**Why Used**:
- **First-time Setup**: Handles new user onboarding
- **Organization Creation**: Creates default organization for new users
- **Profile Setup**: Sets up user preferences and settings

#### **`POST /api/users/sync`**
```javascript
// Response
{
  "success": true,
  "message": "User sync completed successfully",
  "data": {
    "synced": true,
    "organizations": [...]
  }
}
```

**Why Used**:
- **Data Synchronization**: Syncs user data from Keycloak
- **Login Handling**: Ensures user data is up-to-date on login
- **Organization Sync**: Updates organization memberships

#### **`GET /api/users/context`**
```javascript
// Response
{
  "success": true,
  "data": {
    "userId": "user-123",
    "organizations": [...],
    "roles": ["owner", "reviewer"],
    "permissions": [...]
  }
}
```

**Why Used**:
- **User Context**: Provides complete user context
- **Permission Checking**: Shows user's roles and permissions
- **UI Adaptation**: Helps frontend adapt based on user context

---

## 🔌 WebSocket APIs (Real-time Communication)

### 1. Connection Management

#### **Socket Connection**
```javascript
// Client-side connection
const socket = io(process.env.NEXT_PUBLIC_API_URL);

// Server-side authentication
socket.on('connection', (socket) => {
  // Verify JWT token
  // Join media-specific rooms
});
```

**Why Used**:
- **Real-time Communication**: Enables live collaboration
- **Authentication**: Secures WebSocket connections with JWT
- **Room Management**: Organizes users by media sessions

### 2. Comment Events (as in `server/index.js`)

#### **`join-media` and `new-comment`**
```javascript
// Client
socket.emit('join-media', mediaId);
socket.emit('new-comment', { mediaId, comment: { text: 'Great video!' } });
socket.on('new-comment', (comment) => { /* update UI */ });
```

**Why Used**:
- **Live Comments**: Shows comments in real-time
- **Collaboration**: Multiple users can see comments instantly
- **User Attribution**: Shows who wrote each comment

#### **`commentEdited`**
```javascript
// Client emits
socket.emit('commentEdited', {
  commentId: 'comment-123',
  text: 'Updated comment text'
});

// Server broadcasts
io.to(mediaId).emit('commentEdited', {
  commentId: 'comment-123',
  text: 'Updated comment text',
  updatedAt: '2024-01-01T00:00:00Z'
});
```

**Why Used**:
- **Comment Updates**: Allows editing comments in real-time
- **Permission Control**: Only comment authors can edit
- **Live Updates**: All users see edits instantly

#### **`commentDeleted`**
```javascript
// Client emits
socket.emit('commentDeleted', {
  commentId: 'comment-123'
});

// Server broadcasts
io.to(mediaId).emit('commentDeleted', {
  commentId: 'comment-123'
});
```

**Why Used**:
- **Comment Removal**: Allows deleting comments
- **Permission Control**: Authors and owners can delete
- **Live Cleanup**: Removes comments from all users' views

### 3. Annotation Events (as in `server/index.js`)

#### **`join-media` and `new-annotation`**
```javascript
// Client
socket.emit('join-media', mediaId);
socket.emit('new-annotation', { mediaId, annotation: { x: 100, y: 200, text: 'Important' } });
socket.on('new-annotation', (annotation) => { /* update UI */ });
```

**Why Used**:
- **Live Annotations**: Shows annotations in real-time
- **Spatial Collaboration**: Multiple users can annotate simultaneously
- **Visual Feedback**: Users see annotations appear instantly

#### **`annotationEdited`**
```javascript
// Client emits
socket.emit('annotationEdited', {
  annotationId: 'annotation-123',
  text: 'Updated annotation text'
});

// Server broadcasts
io.to(mediaId).emit('annotationEdited', {
  annotationId: 'annotation-123',
  text: 'Updated annotation text'
});
```

**Why Used**:
- **Annotation Updates**: Allows editing annotations
- **Permission Control**: Only annotation authors can edit
- **Live Updates**: All users see annotation changes

#### **`annotationDeleted`**
```javascript
// Client emits
socket.emit('annotationDeleted', {
  annotationId: 'annotation-123'
});

// Server broadcasts
io.to(mediaId).emit('annotationDeleted', {
  annotationId: 'annotation-123'
});
```

**Why Used**:
- **Annotation Removal**: Allows deleting annotations
- **Permission Control**: Authors and owners can delete
- **Live Cleanup**: Removes annotations from all users' views

---

## 🔧 External Service APIs

### 1. Keycloak Admin API

#### **User Management**
```javascript
// Create user
POST /admin/realms/{realm}/users
{
  "username": "john.doe",
  "email": "john@example.com",
  "enabled": true
}

// Assign roles
POST /admin/realms/{realm}/users/{userId}/role-mappings/realm
{
  "id": "role-id",
  "name": "reviewer"
}
```

**Why Used**:
- **User Creation**: Creates users in Keycloak
- **Role Assignment**: Assigns realm and client roles
- **Organization Management**: Manages organization memberships

#### **Organization Management**
```javascript
// Create organization
POST /admin/realms/{realm}/groups
{
  "name": "org-123",
  "attributes": {
    "orgType": ["organization"]
  }
}

// Add user to organization
PUT /admin/realms/{realm}/users/{userId}/groups/{groupId}
```

**Why Used**:
- **Dynamic Organizations**: Creates organizations on-demand
- **Membership Management**: Adds/removes users from organizations
- **Hierarchical Structure**: Manages organization hierarchy

### 2. Email Service (SMTP)

#### **Invitation Emails**
```javascript
// Send invitation email
sendShareInvite({
  to: "user@example.com",
  url: "http://localhost:3001/share/token123",
  role: "reviewer",
  mediaTitle: "Video Title",
  inviterName: "John Doe"
});
```

**Why Used**:
- **User Notifications**: Notifies users of invitations
- **Link Sharing**: Sends share links via email
- **Professional Communication**: Provides branded email templates

---

## 🛡️ Security & Middleware APIs

### 1. Authentication Middleware

#### **`verifyKeycloakToken`**
```javascript
// Middleware function
const verifyKeycloakToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    audience: [process.env.KEYCLOAK_CLIENT_ID]
  });
  req.user = decoded;
  next();
};
```

**Why Used**:
- **JWT Validation**: Verifies Keycloak JWT tokens
- **User Context**: Provides user information to routes
- **Security**: Ensures only authenticated users access APIs

#### **`requireRole`**
```javascript
// Middleware function
const requireRole = (roles) => (req, res, next) => {
  const userRoles = req.user.realm_access?.roles || [];
  const hasRole = Array.isArray(roles) 
    ? roles.some(role => userRoles.includes(role))
    : userRoles.includes(roles);
  
  if (!hasRole) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

**Why Used**:
- **Role-Based Access Control**: Enforces role-based permissions
- **API Protection**: Prevents unauthorized access
- **Flexible Authorization**: Supports single or multiple roles

### 2. Access Control Utilities

#### **`getUserEffectiveRoleForMedia`**
```javascript
// Utility function
const getUserEffectiveRoleForMedia = async (user, mediaId) => {
  // Check if user is owner
  const media = await Media.findByPk(mediaId);
  if (media.ownerId === user.sub) {
    return { role: 'owner', media };
  }
  
  // Check shared access
  const access = await MediaAccess.findOne({
    where: { mediaId, userId: user.sub }
  });
  
  return { role: access?.role || null, media };
};
```

**Why Used**:
- **Permission Resolution**: Determines user's effective role for media
- **Access Control**: Checks both ownership and shared access
- **Security**: Ensures proper access control for all operations

---

## 📊 API Usage Statistics

### **Total APIs by Category:**
- **Authentication APIs**: 3 (NextAuth, Keycloak, Logout)
- **Media Management APIs**: 8 (Upload, List, Get, Delete, Share)
- **Sharing & Invitation APIs**: 6 (Share Links, Invites)
- **Organization APIs**: 6 (Create, Manage, Users)
- **Comments & Annotations APIs**: 5 (CRUD operations)
- **User Management APIs**: 5 (Info, Setup, Sync, Context)
- **WebSocket Events**: 6 (Comments & Annotations real-time)
- **External Service APIs**: 4 (Keycloak Admin, Email)
- **Security Middleware**: 3 (JWT, Roles, Access Control)

### **Total: 46 APIs**

---

## 🔄 API Flow Examples

### **Complete Media Sharing Flow:**
1. **Owner uploads media** → `POST /api/media/upload`
2. **Owner creates share link** → `POST /api/media/:id/share-links`
3. **Email sent** → SMTP API call
4. **User clicks link** → `GET /api/media/share-links/:token/check`
5. **User accepts access** → `POST /api/media/share-links/:token/accept`
6. **Real-time collaboration** → WebSocket events

### **Complete Organization Invite Flow:**
1. **Owner creates invite** → `POST /api/invites`
2. **Keycloak user creation** → Keycloak Admin API
3. **Email notification** → SMTP API call
4. **User clicks invite** → `GET /api/invites/:token`
5. **User accepts invite** → `POST /api/invites/:token/accept`
6. **Organization setup** → Keycloak Admin API calls

---

## 🎯 Why These APIs Are Used

### **1. REST APIs (Express)**
- **Standardization**: Follows REST conventions for consistency
- **Stateless**: Each request contains all necessary information
- **Scalability**: Easy to scale and cache
- **Documentation**: Self-documenting through HTTP methods

### **2. WebSocket APIs (Socket.io)**
- **Real-time Communication**: Enables live collaboration
- **Bidirectional**: Both client and server can send messages
- **Room Management**: Organizes users by media sessions
- **Event-Driven**: Responds to user actions instantly

### **3. External Service APIs**
- **Keycloak**: Enterprise-grade authentication and authorization
- **SMTP**: Reliable email delivery for notifications
- **File Storage**: Local file management for media uploads

### **4. Security APIs**
- **JWT Validation**: Secure token-based authentication
- **Role-Based Access**: Granular permission control
- **Middleware**: Reusable security components

This comprehensive API architecture enables your Media Review Application to provide a secure, scalable, and collaborative platform for media sharing and review.
