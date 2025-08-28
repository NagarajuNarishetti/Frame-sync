# Organization Management with Keycloak

FrameSync quick reference (based on current Express routes and mounts in `server/index.js`):

- Read endpoints (mounted at `/organizations`):
  - GET `/organizations/user/:userId` → organizations for internal user UUID (includes role, owner info, member count)
  - GET `/organizations/:orgId/members` → members list with roles
- Write operations happen via invites (mounted at `/org-invites`):
  - POST `/org-invites/send`, POST `/org-invites/accept/:inviteId`, POST `/org-invites/reject/:inviteId`
- On user registration (POST `/users`): server creates a Keycloak organization and persists it in Postgres, adding the user as owner in `organization_users`.


This document explains how to use the Keycloak Admin API to manage organizations and assign users to them in your media review application.

## Implemented Endpoints in FrameSync

These endpoints exist in this repository and should be used by the client:

- `GET /organizations/user/:userId` — organizations for an internal user UUID (includes role, owner info, member count)
- `GET /organizations/:orgId/members` — members list with roles
- `/org-invites` (write operations):
  - `GET /org-invites/test`
  - `POST /org-invites/send`
  - `GET /org-invites/pending/:userId`
  - `POST /org-invites/accept/:inviteId`
  - `POST /org-invites/reject/:inviteId`

Example: send invite
```bash
curl -X POST "http://localhost:5000/org-invites/send" \
  -H "Content-Type: application/json" \
  -d '{
    "invited_user_id": "<invitee-keycloak-id>",
    "invited_by": "<inviter-keycloak-id>",
    "message": "Join our org",
    "role": "reviewer"
  }'
```

Example: accept invite
```bash
curl -X POST "http://localhost:5000/org-invites/accept/<invite-uuid>"
```

## Overview

The application now includes comprehensive organization management capabilities using Keycloak's Organizations feature. This allows you to:

- Get all users in an organization
- Assign users to organizations with specific roles
- Create new organizations
- Manage organization memberships

## API Endpoints

### 1. Get Organization Users

// Note: The following Keycloak Admin endpoints are used internally by the server where needed.
// Direct calls from the client are not required for basic org flows in this repo.
**Endpoint:** `GET /organizations/{orgId}/users` (Keycloak Admin API – informational)

**Description:** Retrieves all users in a specific organization using the Keycloak Admin API.

**Headers:**
```
Authorization: Bearer {access-token}
Accept: application/json
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/organizations/your-org-id/users" \
  -H "Authorization: Bearer your-access-token"
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "username": "john.doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  ]
}
```

### 2. Assign User to Organization

**Endpoint:** `POST /organizations/{orgId}/users` (Keycloak Admin API – informational)

**Description:** Assigns a user to an organization with a specific role.

**Headers:**
```
Authorization: Bearer {access-token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user-uuid-from-keycloak",
  "role": "member"
}
```

**Available Roles:**
- `member` - Basic organization member
- `admin` - Organization administrator
- `owner` - Organization owner

**Example Request:**
```bash
curl -X POST "http://localhost:3000/organizations/your-org-id/users" \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "role": "member"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User successfully assigned to organization",
  "result": {
    "success": true,
    "method": "direct-assignment"
  }
}
```

### 3. Get Organization Details

**Endpoint:** `GET /organizations/{orgId}` (Keycloak Admin API – informational)

**Description:** Retrieves detailed information about a specific organization.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/organizations/your-org-id" \
  -H "Authorization: Bearer your-access-token"
```

## Direct Keycloak API Usage

You can also use the utility functions directly in your code:

### Get Organization Users

```javascript
import { getOrganizationUsers } from './utils/keycloakAdmin.js';

const users = await getOrganizationUsers({ orgId: 'your-org-id' });
console.log('Organization users:', users);
```

### Assign User to Organization

```javascript
import { assignUserToOrganization } from './utils/keycloakAdmin.js';

const result = await assignUserToOrganization({ 
  orgId: 'your-org-id', 
  userId: 'user-uuid', 
  role: 'member' 
});
console.log('Assignment result:', result);
```

### Create Organization and Assign User

```javascript
import { createOrganizationForUser } from './utils/keycloakAdmin.js';

const organization = await createOrganizationForUser({ 
  userId: 'user-uuid', 
  name: 'My Organization' 
});
console.log('Created organization:', organization);
```

## Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=framesync
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

## Keycloak Configuration

### 1. Enable Organizations Feature

Make sure the Organizations feature is enabled in your Keycloak realm:

1. Go to Keycloak Admin Console
2. Select your realm
3. Go to **Realm Settings** → **Features**
4. Enable **Organizations**

### 2. Create Organization

Organizations can be created through:
- Keycloak Admin Console
- API calls using `createOrganizationForUser()`
- Programmatically in your application

### 3. User Management

Users can be assigned to organizations through:
- Keycloak Admin Console
- API calls using `assignUserToOrganization()`
- Invitation system using `inviteUserToOrg()`

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Missing required parameters
- **401 Unauthorized**: Invalid or missing authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Organization or user not found
- **409 Conflict**: User already a member of the organization
- **500 Internal Server Error**: Server-side errors

## Example Usage Scenarios

### Scenario 1: Onboarding New User

```javascript
// 1. Create organization for new user
const org = await createOrganizationForUser({ 
  userId: newUserId, 
  name: `org-${username}` 
});

// 2. Assign user as owner
await assignUserToOrganization({ 
  orgId: org.id, 
  userId: newUserId, 
  role: 'owner' 
});
```

### Scenario 2: Adding Existing User to Organization

```javascript
// Check if user is already a member
const isMember = await isUserInOrg({ orgId, userId });

if (!isMember) {
  // Add user to organization
  await assignUserToOrganization({ orgId, userId, role: 'member' });
}
```

### Scenario 3: Bulk User Assignment

```javascript
const userIds = ['user1', 'user2', 'user3'];

for (const userId of userIds) {
  try {
    await assignUserToOrganization({ orgId, userId, role: 'member' });
    console.log(`User ${userId} assigned successfully`);
  } catch (error) {
    console.error(`Failed to assign user ${userId}:`, error.message);
  }
}
```

## Testing

You can test the organization management features using the example script:

```bash
cd server
node examples/organization-management.js
```

Make sure to update the placeholder IDs in the example script with actual values from your Keycloak instance.

## Security Considerations

1. **Authentication**: All endpoints require valid authentication tokens
2. **Authorization**: Only users with `owner` or `admin` roles can manage organizations
3. **Input Validation**: All input parameters are validated before processing
4. **Error Handling**: Sensitive information is not exposed in error messages

## Troubleshooting

### Common Issues

1. **"Organizations feature not enabled"**
   - Enable Organizations in Keycloak realm features

2. **"User already a member"**
   - Check existing membership before assignment

3. **"Invalid organization ID"**
   - Verify the organization exists in Keycloak

4. **"Permission denied"**
   - Ensure the authenticated user has sufficient privileges

### Debug Mode

Enable debug logging by setting the log level in your environment:

```env
LOG_LEVEL=debug
```

## Support

For issues related to:
- **Keycloak Configuration**: Check Keycloak documentation
- **API Usage**: Review this document and example code
- **Application Integration**: Check the server logs and error messages
