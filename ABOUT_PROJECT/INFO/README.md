# FrameSync (Documentation Index)

## Doc Map — How, Why, When, Where

- How to set up and run: [QUICKSTART.md](QUICKSTART.md)
- How it works (architecture): [ARCHITECTURE.md](ARCHITECTURE.md)
- Why we chose this design/stack: [COMPREHENSIVE_PROJECT_DOCUMENTATION.md](COMPREHENSIVE_PROJECT_DOCUMENTATION.md)
- When and where actions happen (user flows): [WORKFLOWS.md](WORKFLOWS.md)
- Where all APIs live: [COMPLETE_API_DOCUMENTATION.md](COMPLETE_API_DOCUMENTATION.md)
- Where orgs/invites are handled: [ORGANIZATION_MANAGEMENT.md](ORGANIZATION_MANAGEMENT.md)
- What terms mean (no jargon): [GLOSSARY.md](GLOSSARY.md)

FrameSync is a media collaboration app: upload media, annotate frames, comment in real‑time, and manage organizations/invites. Authentication uses Keycloak; metadata is in PostgreSQL; annotations/comments are in MongoDB. Frontend is Next.js; backend is Express + Socket.IO.

### What to read first

- Start here: QUICKSTART.md — install, configure, run, verify
- Understand the system: ARCHITECTURE.md — components, data, and flows
- See how users work: WORKFLOWS.md — end‑to‑end journeys (upload, share, review)
- Look up terms: GLOSSARY.md — simple definitions for all jargon

### Features

- 🔐 Keycloak authentication with roles
- 📁 Media library and uploads
- 🗺️ Frame/time-based annotations
- 💬 Real-time comments/annotations (Socket.IO)
- 🏢 Organizations and membership invites (owner/reviewer/viewer)

### Tech Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Node.js/Express, Socket.IO
- Databases: PostgreSQL (metadata), MongoDB (annotations/comments)
- AuthZ/AuthN: Keycloak + Admin API integration

### Project Structure (high level)

```
FrameSync/
├── client/           # Next.js frontend (Tailwind)
├── server/           # Express API + Socket.IO
│   ├── routes/       # media, users, org-invites, organizations, annotations
│   ├── models/       # MongoDB models (Annotation, Comment)
│   └── config/       # db (Postgres), mongodb, keycloak
└── ABOUT_PROJECT/    # Documentation & images
```

### Screenshots (see ABOUT_PROJECT/IMAGES)

- HomeScreen.png — Dashboard overview
- Organization_Hub.png — Organization and membership
- InviteNotifications.png — Invite notifications
- InviteToOrg.png — Invite flow
- AddToLibrary.png — Add media to library
- framesync-client-public.png — Client view
- framesync-backend.png — Backend overview
- DockerContainer.png — Docker setup

### Notes

- Ensure Keycloak is running at `http://localhost:8080` (realm `framesync`).
- PostgreSQL and MongoDB must be reachable per your `.env` files.
- Never commit `.env` files.
