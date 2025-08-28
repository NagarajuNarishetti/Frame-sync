# WORKFLOWS

End‑to‑end journeys a junior can follow and test.

## 1) First run and login

- Start server and client (see QUICKSTART.md)
- Open the app → click Login → authenticate in Keycloak
- After login, the app has a token and can call APIs

## 2) Upload media

- Go to Upload page → pick a file → enter title
- Server saves file to `/uploads` and metadata to Postgres
- You can now see it in your media list

## 3) View and collaborate on media

- Open a media item → you join its Socket.IO room
- Add a comment → everyone in the room sees it in real time
- Add an annotation (click on media) → it appears instantly
- Comments and annotations are saved to MongoDB

## 4) Organizations and invites

- Owner invites a user:
  - Call `POST /org-invites/send` (UI does this for you)
  - Invite is stored in Postgres and a Socket.IO notification is emitted
- Invitee accepts:
  - Call `POST /org-invites/accept/:inviteId`
  - Membership is added in Postgres
  - Server attempts to add the user to the Keycloak organization and assign client role

## 5) See who is in your org

- Fetch `GET /organizations/user/:userId` to see your orgs
- Fetch `GET /organizations/:orgId/members` to see member list + roles

## 6) Delete or update media (owner)

- `DELETE /media/:id` — remove media and metadata
- `PATCH /media/:id` — update title

## 7) Troubleshooting steps

- Authentication issues: confirm Keycloak realm/client IDs in `.env`
- Database errors: verify Postgres/Mongo are running and URLs are correct
- Real‑time not working: ensure server is on 5000; client connects to the same origin
