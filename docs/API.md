# API Reference

All endpoints require authentication via session cookie unless noted.

## Authentication

### POST /api/auth/register
Register a new user.
- Body: `{ email, password, displayName?, ageConfirmed, locale }`
- Response: `{ user }` + session cookie

### POST /api/auth/login
Log in.
- Body: `{ email, password }`
- Response: `{ user }` + session cookie

### POST /api/auth/logout
Log out. Destroys session.

### GET /api/auth/me
Get current authenticated user.

## Groups

### GET /api/groups
List current user's groups.

### POST /api/groups
Create a new group. Creator becomes owner.
- Body: `{ name, description?, networkVisibility? }`

### GET /api/groups/:groupId
Get group details (requires membership).

### POST /api/groups/join
Join a group via invite code.
- Body: `{ code }`

### POST /api/groups/:groupId/leave
Leave a group (cannot leave if last admin).

### POST /api/groups/:groupId/invite
Generate invite code (owner/admin only).

### GET /api/groups/:groupId/invite
List active invite codes (owner/admin only).

## Persons

### GET /api/groups/:groupId/persons
List persons in group.

### POST /api/groups/:groupId/persons
Add a person alias.
- Body: `{ alias, contactToken? }`

### POST /api/groups/:groupId/persons/:personId/link
Link current user to a person alias (with merge rules).

### POST /api/groups/:groupId/persons/:personId/unlink
Unlink current user from a person alias.

## Relationships

### GET /api/groups/:groupId/relationships
List relationships in group.

### POST /api/relationships
Create a relationship event.
- Body: `{ personAId, personBId, eventDate?, protectionStatus?, notes? }`

### POST /api/relationships/:relationshipId/verify
Verify a relationship (must be linked to one of the persons).

### POST /api/relationships/:relationshipId/confirm
Confirm a relationship (per-person confirmation).

### POST /api/relationships/:relationshipId/unconfirm
Unconfirm a relationship (admin only).

### GET /api/groups/:groupId/graph
Get graph data (nodes + edges) for visualization.
- Query: `verifiedOnly?, from?, to?, protection?`

## Alerts

### POST /api/alerts
Create an exposure alert.
- Body: `{ personAliasId, isAnonymous?, message?, notifyAll? }`

### GET /api/groups/:groupId/alerts
List exposure alerts visible to the user (1-year retention).

## Notifications

### GET /api/notifications
Get user's notifications.

### PATCH /api/notifications
Mark notifications as read.
- Body: `{ notificationIds?: string[], markAllRead?: boolean }`

## Privacy

### GET /api/privacy/export
Download all user data as JSON.

### POST /api/privacy/delete
Soft-delete user account.

### GET /api/privacy/delete-options
List groups with linked persons for delete choices.

## Members

### GET /api/groups/:groupId/members
List group members.

### PATCH /api/groups/:groupId/members
Update member role (admin/owner only).

### DELETE /api/groups/:groupId/members
Remove member (admin/owner only).
