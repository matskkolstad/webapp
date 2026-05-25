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

## Relationships

### GET /api/groups/:groupId/relationships
List relationships in group.

### POST /api/relationships
Create a relationship event.
- Body: `{ personAId, personBId, eventDate?, protectionStatus?, notes? }`

### POST /api/relationships/:relationshipId/verify
Verify a relationship (must be linked to one of the persons).

### GET /api/groups/:groupId/graph
Get graph data (nodes + edges) for visualization.
- Query: `verifiedOnly?, from?, to?, protection?`

## Alerts

### POST /api/alerts
Create an exposure alert.
- Body: `{ personAliasId, isAnonymous?, message? }`

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
