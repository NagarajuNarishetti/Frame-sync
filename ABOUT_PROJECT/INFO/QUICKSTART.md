# QUICKSTART

This guide gets you from zero to running locally.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- MongoDB 6+
- Keycloak 21+ (dev mode is fine)

## 2) Clone and install

```bash
git clone <your-repo-url>
cd FrameSync

# Client
cd client && npm install

# Server
cd ../server && npm install
```

## 3) Environment variables

Create these files and fill in values:

Client — `client/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=framesync
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=framesync-client
```

Server — `server/.env`
```env
PORT=5000
POSTGRES_CONNECTION_STRING=postgres://user:pass@localhost:5432/framesync
MONGODB_URI=mongodb://localhost:27017/framesync
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=framesync
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

## 4) Start services

- Start Keycloak (dev): open `http://localhost:8080` and create realm `framesync`
- Start PostgreSQL and MongoDB locally

## 5) Run the apps

Server
```bash
cd server
npm start
```

Client
```bash
cd client
npm run dev
```

Open `http://localhost:3000`.

## 6) Verify

- Upload media → it appears in library
- Open media → can add comments/annotations in real time
- Organizations page → your org listed
- Send an invite → invitee sees notification

## 7) Common issues

- 401s: check Keycloak realm/client IDs match `.env`
- DB errors: verify `POSTGRES_CONNECTION_STRING` and `MONGODB_URI`
- Socket issues: ensure server runs on 5000 and CORS allows 3000

## 8) Next steps

- Read ARCHITECTURE.md to understand internals
- See COMPLETE_API_DOCUMENTATION.md for endpoints
