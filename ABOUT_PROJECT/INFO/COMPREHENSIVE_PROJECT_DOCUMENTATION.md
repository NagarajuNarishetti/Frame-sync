# Media Review Application - Comprehensive Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication & Keycloak](#authentication--keycloak)
3. [Database Layer](#database-layer)
4. [Migration Scripts](#migration-scripts)
5. [Media Upload & Sharing Flow](#media-upload--sharing-flow)
6. [Comments System](#comments-system)
7. [Annotations System](#annotations-system)
8. [Organisation Sharing Flow](#organisation-sharing-flow)
9. [WebSockets in Detail](#websockets-in-detail)
10. [API Layer](#api-layer)
11. [Security Model](#security-model)
12. [Folder Structure](#folder-structure)
13. [Deployment Considerations](#deployment-considerations)
14. [Review Questions & Answers](#review-questions--answers)
15. [Complete Workflow Process](#complete-workflow-process)

---

## Architecture Overview

### 🏗️ System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Node.js       │    │   Keycloak      │
│   Frontend      │◄──►│   Backend       │◄──►│   Auth Server   │
│   (React)       │    │   (Express)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSockets    │    │   PostgreSQL    │    │   MongoDB       │
│   (Socket.io)   │    │   (Metadata)    │    │   (Comments/    │
│                 │    │                 │    │   Annotations)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔄 How Everything Connects

**1. Frontend-Backend Connection:**
- Next.js frontend makes HTTP requests to Express backend
- WebSocket connection for real-time features
- JWT tokens from Keycloak authenticate all requests

**2. Authentication Flow:**
- User logs in via Keycloak
- Keycloak returns JWT tokens
- Frontend stores tokens and sends them with every request
- Backend verifies tokens using Keycloak's public keys

**3. Database Strategy:**
- **PostgreSQL**: Stores structured data (users, media metadata, organizations, permissions)
- **MongoDB**: Stores unstructured data (comments, annotations) for flexibility

**4. Real-time Communication:**
- Socket.io handles real-time updates
- Comments and annotations are broadcast instantly
- Multiple users can collaborate simultaneously

---

## Authentication & Keycloak

### 🔐 How Login/Signup Works

**Step-by-Step Process:**

1. **User clicks "Login"** → Redirected to Keycloak login page
2. **User enters credentials** → Keycloak validates and creates session
3. **Keycloak redirects back** → With authorization code or tokens
4. **Frontend initializes Keycloak session** → Using the Keycloak JS adapter in `client/lib/keycloak.js`
5. **Tokens stored client-side** → Sent as Authorization: Bearer on API/WebSocket requests
6. **User authenticated** → Can access protected features

### 🎭 User Roles & Permissions

**Role Hierarchy:**
```
Owner (Full Access)
├── Can upload media
├── Can share with organizations
├── Can delete any comment/annotation
├── Can manage organization members
└── Can view all media

Reviewer (Limited Access)
├── Can view shared media
├── Can add comments/annotations
├── Can edit/delete own content
└── Cannot delete others' content

Viewer (Read-Only)
├── Can view shared media
├── Can see comments/annotations
└── Cannot add/edit content
```

### 🔑 JWT Token Structure

**Access Token Payload:**
```json
{
  "sub": "user-id-123",
  "preferred_username": "john.doe",
  "email": "john@company.com",
  "realm_access": {
    "roles": ["owner", "reviewer"]
  },
  "resource_access": {
    "framesync-client": {
      "roles": ["owner"]
    }
  },
  "exp": 1640995200,
  "iat": 1640908800
}
```

### 🏢 Organization Sharing Flow

1. **Owner creates organization** → Stored in PostgreSQL
2. **Owner invites users** → Email sent with invitation link
3. **User clicks link** → Redirected to Keycloak registration
4. **User completes registration** → Added to organization
5. **Permissions granted** → Based on organization membership

---

## Database Layer

### 🗄️ Why Two Databases?

**PostgreSQL (Structured Data):**
- **Relational data** with complex relationships
- **ACID compliance** for critical operations
- **SQL queries** for complex joins and aggregations
- **Data integrity** with foreign keys and constraints

**MongoDB (Unstructured Data):**
- **Flexible schema** for comments and annotations
- **JSON-like documents** for easy querying
- **Horizontal scaling** for high-volume data
- **Real-time updates** without schema migrations

### 📊 Database Schema

**PostgreSQL Tables:**

```sql
-- Media metadata
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  thumbnail_path VARCHAR,
  type ENUM('image', 'video') NOT NULL,
  owner_id VARCHAR NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- User access permissions
CREATE TABLE media_access (
  id SERIAL PRIMARY KEY,
  media_id INTEGER REFERENCES media(id),
  user_id VARCHAR NOT NULL,
  role ENUM('reviewer', 'viewer') NOT NULL,
  created_by VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Organizations
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  keycloak_id VARCHAR,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  domains JSONB,
  status ENUM('active', 'inactive', 'suspended'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**MongoDB Collections:**

```javascript
// Comments collection
{
  _id: ObjectId,
  mediaId: "123", // References PostgreSQL media.id
  userId: "user-123",
  userName: "John Doe",
  text: "Great video!",
  timeInMedia: 45, // seconds into video
  createdAt: Date,
  updatedAt: Date
}

// Annotations collection
{
  _id: ObjectId,
  mediaId: "123",
  userId: "user-123",
  username: "John Doe",
  coordinates: { x: 0.5, y: 0.3 }, // percentage positions
  text: "Important point here",
  timestamp: 45, // for video annotations
  createdAt: Date,
  updatedAt: Date
}
```

---

## Migration Scripts

### 🔄 What Are Migration Scripts?

**Migration scripts** are like version control for your database schema. They allow you to:
- Track database changes over time
- Apply changes consistently across environments
- Rollback changes if needed
- Collaborate with team members safely

### 📝 Types of Migrations

**1. Schema Migrations (PostgreSQL):**
```sql
-- Example: Adding created_by column to media_access
ALTER TABLE media_access 
ADD COLUMN created_by VARCHAR;
```

**2. Data Migrations:**
```javascript
// Example: Updating user roles
UPDATE users 
SET role = 'reviewer' 
WHERE organization_id IS NOT NULL;
```

**3. Index Migrations:**
```sql
-- Example: Adding performance indexes
CREATE INDEX idx_media_access_user_id ON media_access(user_id);
```

### 🚀 How Migrations Work

**Migration Process:**
1. **Create migration file** → With timestamp and description
2. **Write up/down functions** → To apply and rollback changes
3. **Run migration** → Against target database
4. **Track migration status** → In migration table
5. **Verify changes** → Check database schema

**Example Migration Script:**
```javascript
// server/migrations/001_add_created_by_to_media_access.sql
-- Up migration
ALTER TABLE media_access ADD COLUMN created_by VARCHAR;

-- Down migration (rollback)
ALTER TABLE media_access DROP COLUMN created_by;
```

---

## Media Upload & Sharing Flow

### 📤 Media Upload Process

**Step-by-Step:**

1. **User selects file** → Frontend validates file type/size
2. **File uploaded** → To server's uploads directory or S3
3. **Thumbnail generated** → For videos/images
4. **Metadata saved** → To PostgreSQL media table
5. **Access permissions set** → Owner gets full access
6. **Success response** → User redirected to media viewer

**Code Flow:**
```javascript
// Frontend upload
const formData = new FormData();
formData.append('file', file);
formData.append('title', title);

const response = await fetch('/api/media/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// Backend processing
app.post('/media/upload', upload.single('file'), async (req, res) => {
  const media = await Media.create({
    title: req.body.title,
    filePath: req.file.path,
    ownerId: req.user.sub,
    type: getFileType(req.file.mimetype)
  });
  
  // Generate thumbnail
  await generateThumbnail(req.file.path);
  
  res.json(media);
});
```

### 🔗 Sharing Mechanisms

**1. Organization Sharing:**
- Owner adds users to organization
- Users automatically get access to organization media
- Role-based permissions (reviewer/viewer)

**2. Direct Sharing:**
- Owner shares specific media with users
- Custom permissions per media item
- Temporary or permanent access

**3. Link Sharing:**
- Generate secure share links
- Token-based access control
- Expiration dates and usage limits

**Share Link Flow:**
```javascript
// Generate share link
const shareLink = await ShareLink.create({
  mediaId: media.id,
  token: generateSecureToken(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  createdBy: req.user.sub
});

// Access via link
app.get('/share/:token', async (req, res) => {
  const shareLink = await ShareLink.findOne({
    token: req.params.token,
    expiresAt: { $gt: new Date() }
  });
  
  if (!shareLink) {
    return res.status(404).json({ error: 'Link expired or invalid' });
  }
  
  // Grant temporary access
  req.user = { sub: 'anonymous', role: 'viewer' };
  next();
});
```

---

## Comments System

### 💬 Complete Comment Flow

**1. Creating a Comment:**
```javascript
// Frontend sends comment
socket.emit('newComment', {
  mediaId: '123',
  text: 'Great video!',
  timeInMedia: 45,
  userName: 'John Doe'
});

// Backend processes
socket.on('newComment', async (data) => {
  // Check permissions
  const { role } = await getUserEffectiveRoleForMedia(socket.user, data.mediaId);
  if (!hasCapability(role, 'comment')) {
    socket.emit('accessDenied', { reason: 'No comment permission' });
    return;
  }
  
  // Save to MongoDB
  const comment = new Comment({
    mediaId: data.mediaId,
    text: data.text,
    timeInMedia: data.timeInMedia,
    userId: socket.user.sub,
    userName: data.userName
  });
  await comment.save();
  
  // Broadcast to all users
  io.to(data.mediaId).emit('commentAdded', comment);
});
```

**2. Real-time Updates:**
- Comment appears instantly for all users
- Typing indicators show when someone is writing
- Comments are synchronized across all clients

**3. Editing Comments:**
```javascript
// Only comment author can edit
socket.on('editComment', async (data) => {
  const comment = await Comment.findById(data.commentId);
  const isCommentAuthor = String(comment.userId) === String(socket.user.sub);
  
  if (isCommentAuthor) {
    comment.text = data.newText;
    await comment.save();
    io.to(data.mediaId).emit('commentEdited', comment);
  } else {
    socket.emit('commentEditError', { error: 'Not authorized' });
  }
});
```

**4. Deleting Comments:**
```javascript
// Author or owner can delete
socket.on('deleteComment', async (data) => {
  const comment = await Comment.findById(data.commentId);
  const isCommentAuthor = String(comment.userId) === String(socket.user.sub);
  const isOwner = socket.user.roles.includes('owner');
  
  if (isCommentAuthor || isOwner) {
    await Comment.findByIdAndDelete(data.commentId);
    io.to(data.mediaId).emit('commentDeleted', { commentId: data.commentId });
  } else {
    socket.emit('commentDeleteError', { error: 'Not authorized' });
  }
});
```

---

## Annotations System

### ✏️ Annotation Implementation

**1. Creating Annotations:**
```javascript
// User clicks on media
const handleClick = (event) => {
  const { x, y } = getRelativePosition(event);
  setClickPosition({ x, y });
  setShowTextInput(true);
};

// Save annotation
const handleSaveAnnotation = () => {
  const payload = {
    mediaId: mediaId,
    text: annotationText,
    coordinates: clickPosition,
    timeInMedia: videoRef?.current?.currentTime || 0,
    userName: user?.name
  };
  
  socket.emit('newAnnotation', payload);
};
```

**2. Visual Representation:**
- Blue dots appear at click positions
- Hover tooltips show annotation text
- Click markers to seek to video timestamp
- Real-time updates for all users

**3. Annotation Storage:**
```javascript
// MongoDB schema
{
  mediaId: "123",
  userId: "user-123",
  username: "John Doe",
  coordinates: { x: 0.5, y: 0.3 }, // percentage positions
  text: "Important point here",
  timestamp: 45, // for video annotations
  createdAt: Date
}
```

**4. Permission System:**
- Users can edit/delete their own annotations
- Owners can delete any annotation
- Real-time synchronization across clients

---

## Organisation Sharing Flow

### 🏢 Organization Management

**1. Creating Organizations:**
```javascript
// Owner creates organization
const organization = await Organization.create({
  name: 'Acme Corp',
  description: 'Marketing team',
  domains: ['acme.com'],
  keycloakId: keycloakGroupId
});
```

**2. Inviting Users:**
```javascript
// Send invitation email
const invite = await Invite.create({
  email: 'user@acme.com',
  organizationId: org.id,
  role: 'reviewer',
  token: generateSecureToken(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

// Email template
const emailContent = `
  You've been invited to join ${org.name}.
  Click here to accept: ${process.env.CLIENT_URL}/invite/${invite.token}
`;
```

**3. User Registration Flow:**
```javascript
// User clicks invitation link
app.get('/invite/:token', async (req, res) => {
  const invite = await Invite.findOne({
    token: req.params.token,
    expiresAt: { $gt: new Date() }
  });
  
  if (!invite) {
    return res.status(404).json({ error: 'Invitation expired' });
  }
  
  // Redirect to Keycloak registration with custom parameters
  const registrationUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/registrations?client_id=${process.env.KEYCLOAK_CLIENT_ID}&redirect_uri=${process.env.CLIENT_URL}/auth/callback&kc_locale=en`;
  
  res.redirect(registrationUrl);
});
```

**4. Post-Registration Processing:**
```javascript
// After successful registration
app.post('/users/sync', async (req, res) => {
  const user = req.user;
  
  // Check for pending invitations
  const invites = await Invite.findAll({
    where: { email: user.email, status: 'pending' }
  });
  
  for (const invite of invites) {
    // Add user to organization
    await UserOrganizationMap.create({
      userId: user.sub,
      organizationId: invite.organizationId,
      role: invite.role
    });
    
    // Update invitation status
    invite.status = 'accepted';
    await invite.save();
  }
  
  res.json({ message: 'User synced successfully' });
});
```

---

## WebSockets in Detail

### 🔌 WebSocket Integration

**1. Server Setup (Node.js):**
```javascript
// server/server.js
import { Server } from "socket.io";

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  
  try {
    const decoded = await verifySocketToken(token);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});
```

**2. Client Connection (Next.js):**
```javascript
// client/components/createSocket.js
import { io } from "socket.io-client";

export function createSocket(token) {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    transports: ["websocket"]
  });
}

// Usage in components
const socket = createSocket(session.accessToken);
socket.emit("joinMediaRoom", mediaId);
```

**3. Real-time Events:**
```javascript
// Server events
socket.on("newComment", handleNewComment);
socket.on("editComment", handleEditComment);
socket.on("deleteComment", handleDeleteComment);
socket.on("newAnnotation", handleNewAnnotation);
socket.on("userTyping", handleUserTyping);

// Client listeners
socket.on("commentAdded", (comment) => {
  setComments(prev => [...prev, comment]);
});

socket.on("annotationAdded", (annotation) => {
  setAnnotations(prev => [...prev, annotation]);
});
```

**4. Room Management:**
```javascript
// Join media-specific room
socket.on("joinMediaRoom", (mediaId) => {
  socket.join(mediaId);
  console.log(`User joined media room: ${mediaId}`);
});

// Leave room
socket.on("leaveMediaRoom", (mediaId) => {
  socket.leave(mediaId);
  console.log(`User left media room: ${mediaId}`);
});
```

---

## API Layer

### 🌐 REST Endpoints

**Authentication Endpoints:**
```javascript
// NextAuth routes (handled by NextAuth.js)
GET  /api/auth/signin     // Sign in page
POST /api/auth/signin     // Sign in process
GET  /api/auth/signout    // Sign out
GET  /api/auth/session    // Get current session
```

**Media Endpoints:**
```javascript
// Media management
POST   /media/upload           // Upload new media
GET    /media                  // List user's media
GET    /media/:id              // Get specific media
DELETE /media/:id              // Delete media
PUT    /media/:id              // Update media metadata

// Media access
POST   /media/:id/share        // Share media with users
GET    /media/:id/access       // Get media access list
DELETE /media/:id/access/:userId // Remove user access
```

**Comments Endpoints:**
```javascript
// Comments (REST fallback)
GET    /comments/:mediaId      // Get comments for media
POST   /comments/:mediaId      // Create comment (WebSocket preferred)
PUT    /comments/:id           // Update comment
DELETE /comments/:id           // Delete comment
```

**Organization Endpoints:**
```javascript
// Organization management
GET    /organizations          // List user's organizations
POST   /organizations          // Create organization
GET    /organizations/:id      // Get organization details
PUT    /organizations/:id      // Update organization
DELETE /organizations/:id      // Delete organization

// Organization members
GET    /organizations/:id/members     // List members
POST   /organizations/:id/members     // Add member
DELETE /organizations/:id/members/:userId // Remove member
```

**User Endpoints:**
```javascript
// User management
GET    /users/profile          // Get user profile
PUT    /users/profile          // Update profile
POST   /users/sync             // Sync user data
GET    /users/search           // Search users
```

**Invitation Endpoints:**
```javascript
// Invitations
POST   /invites                // Create invitation
GET    /invites/:token         // Get invitation details
PUT    /invites/:token/accept  // Accept invitation
DELETE /invites/:token         // Cancel invitation
```

### 🔒 API Security

**Authentication Middleware:**
```javascript
// server/middleware/verifyKeycloakToken.js
export function verifyKeycloakToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  
  jwt.verify(token, getKey, {
    audience: process.env.KEYCLOAK_CLIENT_ID,
    issuer: process.env.KEYCLOAK_ISSUER,
    algorithms: ["RS256"]
  }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
}
```

**Role-based Access Control:**
```javascript
// server/middleware/requireRole.js
export function requireRole(role) {
  return (req, res, next) => {
    const userRoles = req.user.realm_access?.roles || [];
    if (!userRoles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Usage
app.get('/admin', requireRole('owner'), (req, res) => {
  // Only owners can access
});
```

---

## Security Model

### 🛡️ Security Layers

**1. Authentication Layer:**
- JWT tokens from Keycloak
- Token verification on every request
- Automatic token refresh
- Secure session management

**2. Authorization Layer:**
- Role-based access control (RBAC)
- Resource-level permissions
- Organization-based access
- Media-specific permissions

**3. Data Protection:**
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

**4. Network Security:**
- HTTPS/TLS encryption
- CORS configuration
- Rate limiting
- Request validation

### 🔐 JWT Security

**Token Structure:**
```javascript
// Header
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id"
}

// Payload
{
  "sub": "user-id",
  "preferred_username": "john.doe",
  "email": "john@company.com",
  "realm_access": {
    "roles": ["owner", "reviewer"]
  },
  "resource_access": {
    "media-review-app": {
      "roles": ["owner"]
    }
  },
  "exp": 1640995200,
  "iat": 1640908800,
  "iss": "https://keycloak.example.com/realms/media-review"
}

// Signature (RS256)
HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

**Token Verification:**
```javascript
// Verify token signature
const publicKey = await getPublicKey(token.kid);
const decoded = jwt.verify(token, publicKey, {
  algorithms: ["RS256"],
  audience: process.env.KEYCLOAK_CLIENT_ID,
  issuer: process.env.KEYCLOAK_ISSUER
});
```

### 🏢 Organization Security

**Access Control Matrix:**
```
┌─────────────┬─────────┬──────────┬─────────┬──────────┐
│ Resource    │ Owner   │ Reviewer │ Viewer  │ Anonymous│
├─────────────┼─────────┼──────────┼─────────┼──────────┤
│ Own Media   │ Full    │ None     │ None    │ None     │
│ Shared Media│ Full    │ Comment  │ View    │ None     │
│ Org Media   │ Full    │ Comment  │ View    │ None     │
│ Public Media│ Full    │ Comment  │ View    │ View     │
└─────────────┴─────────┴──────────┴─────────┴──────────┘
```

---

## Folder Structure

### 📁 Project Organization

```
media-review-app/
├── client/                          # Next.js Frontend
│   ├── app/                         # App Router (Next.js 13+)
│   │   ├── api/                     # API Routes
│   │   │   └── auth/                # NextAuth.js routes
│   │   ├── dashboard/               # Dashboard pages
│   │   │   ├── owner/               # Owner-specific pages
│   │   │   ├── reviewer/            # Reviewer-specific pages
│   │   │   └── viewer/              # Viewer-specific pages
│   │   ├── share/                   # Share link pages
│   │   ├── globals.css              # Global styles
│   │   ├── layout.js                # Root layout
│   │   └── page.jsx                 # Home page
│   ├── components/                  # React components
│   │   ├── AnnotationCanvas.jsx     # Annotation overlay
│   │   ├── AnnotationsPanel.jsx     # Annotations sidebar
│   │   ├── CommentsPanel.jsx        # Comments sidebar
│   │   ├── MediaViewerClient.jsx    # Main media viewer
│   │   ├── createSocket.js          # WebSocket connection
│   │   └── ...                      # Other components
│   ├── public/                      # Static assets
│   ├── package.json                 # Frontend dependencies
│   └── next.config.mjs              # Next.js configuration
│
├── server/                          # Node.js Backend
│   ├── models/                      # Database models
│   │   ├── Media.js                 # PostgreSQL model
│   │   ├── Comment.js               # MongoDB model
│   │   ├── Annotation.js            # MongoDB model
│   │   ├── Organization.js          # PostgreSQL model
│   │   └── ...                      # Other models
│   ├── routes/                      # Express routes
│   │   ├── media.js                 # Media endpoints
│   │   ├── comments.js              # Comment endpoints
│   │   ├── organizations.js         # Organization endpoints
│   │   └── ...                      # Other routes
│   ├── middleware/                  # Express middleware
│   │   ├── verifyKeycloakToken.js   # JWT verification
│   │   └── requireRole.js           # Role-based access
│   ├── migrations/                  # Database migrations
│   ├── scripts/                     # Utility scripts
│   ├── utils/                       # Helper functions
│   ├── uploads/                     # File uploads
│   ├── server.js                    # Main server file
│   ├── db.js                        # Database connections
│   └── package.json                 # Backend dependencies
│
├── README.md                        # Project documentation
└── .env.example                     # Environment variables template
```

### 📄 Key Files Explained

**Frontend Files:**
- `client/app/layout.js`: Root layout with session provider
- `client/components/MediaViewerClient.jsx`: Main media viewing component
- `client/components/AnnotationCanvas.jsx`: Annotation overlay system
- `client/components/CommentsPanel.jsx`: Comments management
- `client/components/createSocket.js`: WebSocket connection utility

**Backend Files:**
- `server/server.js`: Main Express server with Socket.io
- `server/db.js`: Database connection management
- `server/middleware/verifyKeycloakToken.js`: JWT authentication
- `server/models/`: Database models for both PostgreSQL and MongoDB
- `server/routes/`: REST API endpoints

**Configuration Files:**
- `package.json`: Dependencies and scripts
- `next.config.mjs`: Next.js configuration
- `.env`: Environment variables
- `middleware.js`: Next.js middleware for route protection

---

## Deployment Considerations

### 🚀 Local Development Setup

**1. Environment Setup:**
```bash
# Clone repository
git clone <repository-url>
cd media-review-app

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

**2. Database Setup:**
```bash
# PostgreSQL
createdb media_review_app
psql media_review_app < migrations/001_initial_schema.sql

# MongoDB
mongod --dbpath /data/db
```

**3. Keycloak Setup:**
```bash
# Download and start Keycloak
wget https://github.com/keycloak/keycloak/releases/download/21.1.2/keycloak-21.1.2.tar.gz
tar -xzf keycloak-21.1.2.tar.gz
cd keycloak-21.1.2
./bin/kc.sh start-dev
```

**4. Start Services:**
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### 🌐 Production Deployment

**1. Docker Setup:**
```dockerfile
# Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**2. Environment Variables:**
```bash
# Production .env
NODE_ENV=production
CLIENT_URL=https://your-domain.com
API_URL=https://api.your-domain.com
KEYCLOAK_AUTH_SERVER_URL=https://keycloak.your-domain.com
KEYCLOAK_REALM=media-review
KEYCLOAK_CLIENT_ID=media-review-app
KEYCLOAK_CLIENT_SECRET=your-client-secret
DB_HOST=your-postgres-host
DB_NAME=media_review_app
DB_USER=your-db-user
DB_PASSWORD=your-db-password
MONGODB_URI=mongodb://your-mongo-host/media_review_app
```

**3. Reverse Proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**4. SSL/TLS Setup:**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

---

## Review Questions & Answers

### 🤔 Common Technical Questions

**Q1: Why did you choose to use both PostgreSQL and MongoDB?**

**A:** We use a hybrid approach because:
- **PostgreSQL** stores structured, relational data (users, media metadata, organizations) that benefits from ACID compliance and complex queries
- **MongoDB** stores unstructured data (comments, annotations) that needs flexible schemas and high write performance
- This separation allows us to optimize each database for its specific use case while maintaining data integrity

**Q2: How do you handle real-time updates across multiple users?**

**A:** We use Socket.io for real-time communication:
- Each media item has its own "room" that users join
- When a user creates/edits/deletes a comment or annotation, it's broadcast to all users in that room
- The system maintains consistency by using the server as the single source of truth
- All changes are persisted to the database and then broadcast

**Q3: How do you ensure security in the WebSocket connections?**

**A:** Security is maintained through:
- JWT token authentication for each WebSocket connection
- Server-side permission checks before any operation
- Room-based isolation (users can only access media they have permission to view)
- Input validation and sanitization on all messages

**Q4: What happens if a user loses connection during a session?**

**A:** The system handles disconnections gracefully:
- Users automatically reconnect when connection is restored
- All changes made while offline are lost (by design for simplicity)
- The server maintains the authoritative state
- Users receive the latest data when they reconnect

**Q5: How do you handle file uploads and storage?**

**A:** File handling includes:
- Server-side validation of file types and sizes
- Secure file storage in uploads directory (or S3 for production)
- Automatic thumbnail generation for videos and images
- File serving through Express static middleware
- Cleanup of orphaned files

**Q6: How does the organization sharing system work?**

**A:** The sharing system works as follows:
- Owners create organizations and invite users via email
- Invitations contain secure tokens with expiration dates
- Users click invitation links and are redirected to Keycloak registration
- After registration, users are automatically added to the organization
- Organization membership grants access to shared media

**Q7: How do you handle database migrations in production?**

**A:** We use a migration system that:
- Tracks migration status in a dedicated table
- Runs migrations sequentially with version numbers
- Supports both up and down migrations for rollbacks
- Validates migration success before marking as complete
- Can be run manually or automatically during deployment

**Q8: What's your strategy for handling high traffic?**

**A:** The system can scale through:
- Horizontal scaling of Node.js instances behind a load balancer
- Database connection pooling and optimization
- Redis for session storage and caching
- CDN for static file delivery
- WebSocket clustering for real-time features

**Q9: How do you ensure data consistency between PostgreSQL and MongoDB?**

**A:** Consistency is maintained through:
- Foreign key references (mediaId in MongoDB references PostgreSQL media.id)
- Application-level validation before cross-database operations
- Transaction-like patterns for critical operations
- Regular data integrity checks and cleanup scripts

**Q10: What's your backup and disaster recovery strategy?**

**A:** We implement:
- Regular automated backups of both databases
- Point-in-time recovery capabilities
- Geographic replication for critical data
- Monitoring and alerting for data integrity issues
- Documented recovery procedures

---

## Complete Workflow Process

### 🔄 End-to-End User Journey

**1. User Registration & Onboarding:**
```
User clicks invitation link
    ↓
Redirected to Keycloak registration
    ↓
User completes registration
    ↓
User automatically added to organization
    ↓
User can access shared media
```

**2. Media Upload Process:**
```
Owner selects media file
    ↓
File uploaded to server
    ↓
Thumbnail generated automatically
    ↓
Metadata saved to PostgreSQL
    ↓
Owner gets full access permissions
    ↓
Media appears in owner's dashboard
```

**3. Media Sharing Process:**
```
Owner clicks "Share" on media
    ↓
Owner selects users/organizations
    ↓
Access permissions created in database
    ↓
Users receive notifications
    ↓
Users can access shared media
```

**4. Collaboration Process:**
```
User opens shared media
    ↓
User joins WebSocket room for media
    ↓
User sees existing comments/annotations
    ↓
User adds new comments/annotations
    ↓
Changes broadcast to all users in real-time
    ↓
Changes saved to database
```

**5. Comment/Annotation Workflow:**
```
User clicks to add comment/annotation
    ↓
Frontend validates user permissions
    ↓
User enters text and saves
    ↓
WebSocket event sent to server
    ↓
Server validates permissions
    ↓
Data saved to MongoDB
    ↓
Change broadcast to all users
    ↓
All clients update in real-time
```

**6. Organization Management:**
```
Owner creates organization
    ↓
Owner invites users via email
    ↓
Users receive invitation emails
    ↓
Users click links and register
    ↓
Users automatically join organization
    ↓
Users get access to organization media
```

### 🔧 Technical Workflow

**1. Authentication Flow:**
```
User visits application
    ↓
NextAuth redirects to Keycloak
    ↓
User authenticates with Keycloak
    ↓
Keycloak returns JWT tokens
    ↓
NextAuth stores tokens in session
    ↓
User can access protected features
```

**2. API Request Flow:**
```
Frontend makes API request
    ↓
Request includes JWT token
    ↓
Backend verifies token with Keycloak
    ↓
Backend checks user permissions
    ↓
Backend processes request
    ↓
Backend returns response
```

**3. WebSocket Connection Flow:**
```
User opens media viewer
    ↓
Frontend creates WebSocket connection
    ↓
Connection includes JWT token
    ↓
Server verifies token
    ↓
User joins media-specific room
    ↓
User can send/receive real-time updates
```

**4. Database Operation Flow:**
```
Application needs to save data
    ↓
Application determines data type
    ↓
Structured data → PostgreSQL
    ↓
Unstructured data → MongoDB
    ↓
Data saved with proper relationships
    ↓
Application confirms success
```

### 📊 Data Flow Diagrams

**Comment Creation Flow:**
```
User Input → Frontend Validation → WebSocket Event → Server Validation → MongoDB Save → Broadcast → All Clients Update
```

**Media Upload Flow:**
```
File Selection → Frontend Validation → File Upload → Server Processing → Thumbnail Generation → PostgreSQL Save → Success Response
```

**Organization Invitation Flow:**
```
Owner Invites → Email Sent → User Clicks Link → Keycloak Registration → User Created → Organization Membership → Access Granted
```

This comprehensive documentation covers all aspects of your Media Review Application, from architecture to deployment. The system is well-designed with proper separation of concerns, security measures, and scalability considerations.
