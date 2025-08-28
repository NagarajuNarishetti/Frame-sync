# ARCHITECTURE

Simple view of how the system is built and how parts talk to each other.

## Components

- Client (Next.js): UI, calls REST APIs, connects to Socket.IO
- Server (Express): REST APIs, Socket.IO events, integrates with Keycloak
- Databases:
  - PostgreSQL: users, media metadata, organizations, invites
  - MongoDB: comments and annotations
- Auth (Keycloak): login, tokens, roles

## Data ownership

- PostgreSQL holds structured data (owned by the server)
- MongoDB holds collaboration data (comments/annotations)
- Files are stored on disk under `server/uploads/` (served via `/uploads`)

## Important directories

- `client/` — Next.js app
- `server/routes/` — API endpoints
  - `media.js`, `users.js`, `annotations.js`, `organizations.js`, `orgInvites.js`, `mediaShared.js`
- `server/middleware/` — Keycloak integration and helpers
- `server/config/` — Postgres, Mongo, Keycloak setup

## Authentication flow (Keycloak)

1. User clicks Login → redirected to Keycloak
2. Keycloak authenticates and returns tokens
3. Client stores token (via Keycloak JS adapter) and adds `Authorization: Bearer <token>` header
4. Server verifies token on each request using Keycloak public keys

## Roles

- Owner: full access to own org media, can invite/manage
- Reviewer: can view shared media and add comments/annotations
- Viewer: can view shared media only

## WebSockets (Socket.IO)

- Connection from client to server
- Rooms: a user joins a media room to collaborate
- Events:
  - `join-media` — client joins the room for a mediaId
  - `new-comment` — client sends comment; server broadcasts to room
  - `new-annotation` — client sends annotation; server broadcasts to room

Example (conceptual, client):
```javascript
socket.emit('join-media', mediaId);
socket.emit('new-comment', { mediaId, comment: { text: 'Great!' } });
socket.on('new-comment', (comment) => setComments(prev => [...prev, comment]));
```

## Organizations and invites

- Read operations: `/organizations/user/:userId`, `/organizations/:orgId/members`
- Write operations via invites at `/org-invites`
  - `POST /org-invites/send` — send invite with role
  - `POST /org-invites/accept/:inviteId` — accept invite
  - `POST /org-invites/reject/:inviteId` — reject invite
- On accept:
  - Insert membership in Postgres
  - Attempt Keycloak org membership (invite-existing-user or fallback)
  - Attempt client role mapping in Keycloak

## Error handling (high level)

- API: consistent JSON errors and status codes
- Validation: ids validated (UUID checks), required fields enforced
- Security: Keycloak token verification for protected routes
