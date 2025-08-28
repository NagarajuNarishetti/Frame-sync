# GLOSSARY

Simple definitions for terms you will see in this project.

- Keycloak: An identity and access management server. Handles login and tokens.
- Realm: A Keycloak space that groups users, clients, and roles. We use realm `framesync`.
- Client (Keycloak): An application registered in Keycloak (e.g., our frontend). Has client roles.
- Role: A permission label (owner, reviewer, viewer). Used for authorization.
- JWT: A signed token used to prove identity to the server.
- Socket.IO: Library for real‑time events between browser and server.
- Room: A Socket.IO channel. Users join a media room to collaborate.
- Annotation: A note tied to a point or time in media (saved in MongoDB).
- Comment: A text message tied to media/time (saved in MongoDB).
- Media metadata: Info about an uploaded file (title, path, owner) stored in Postgres.
- Organization: A group of users managed together. Membership stored in Postgres.
- Invite: A request to add a user to an organization. Tracked in Postgres.
- Access control: Checking if a user can do something based on role.
- Endpoint: A URL on the server that performs an action.
