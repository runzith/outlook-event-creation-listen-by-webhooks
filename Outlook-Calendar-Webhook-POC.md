# POC: Detect Outlook Calendar Events with Korn Ferry Invitees

## Objective

This POC demonstrates a technical approach to detect Outlook calendar events that include invitees from the `@kornferry.com` domain. The solution leverages Microsoft Graph Webhooks to receive real-time notifications when calendar events are created, enabling immediate identification of meetings involving Korn Ferry personnel.

### Goals

- Listen to Outlook calendar event creation in real-time
- Identify meetings that include attendees with `@kornferry.com` email addresses
- Log matching events for further analysis or integration

---

## High-Level Architecture

```
┌─────────────────────┐
│   Outlook Calendar  │
│   (User creates     │
│    calendar event)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Microsoft Graph    │
│  Subscription       │
│  (Monitors events)  │
└──────────┬──────────┘
           │ Webhook notification
           ▼
┌─────────────────────┐
│  Node.js Webhook    │
│  Listener (Express) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Microsoft Graph    │
│  Event Fetch API    │
│  (Get full details) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Domain Filtering   │
│  (@kornferry.com)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  File Logging       │
│  (kornferry-events) │
└─────────────────────┘
```

## Approach Overview

### 1. Microsoft Graph Calendar Webhooks

Microsoft Graph provides a subscription-based webhook mechanism that pushes notifications when resources change. For this POC, we subscribe to calendar event changes to receive immediate notifications when new events are created.

### 2. Subscribe to Created Events

A subscription is created targeting the user's calendar events resource. The subscription specifies:
- **Change Type**: `created` (new events only)
- **Resource**: User's calendar events endpoint
- **Notification URL**: Public webhook endpoint
- **Expiration**: Maximum 4230 minutes (~3 days) for calendar resources

### 3. Fetch Full Event Details

Webhook notifications contain minimal data (resource ID only). To access attendee information, a follow-up API call retrieves the complete event details including subject, organizer, start/end times, and attendee list.

### 4. Filter Attendees by Email Domain

The attendee list is examined to identify email addresses ending with `@kornferry.com`. This simple string matching approach provides reliable domain identification.

### 5. Log Matching Events

Events with matching attendees are logged to a local file with relevant details for audit and analysis purposes.

---

## Webhook Flow

### 1. Subscription Creation

Before receiving notifications, a subscription must be registered with Microsoft Graph:

- **Endpoint**: `POST https://graph.microsoft.com/v1.0/subscriptions`
- **Payload includes**: notification URL, resource path, change types, expiration time
- **Response**: Subscription ID and confirmation

### 2. Webhook Validation

Microsoft Graph validates webhook endpoints before activating subscriptions:

- Graph sends a `POST` request with `validationToken` query parameter
- The endpoint must respond with HTTP 200 and echo the token as plain text
- This confirms the endpoint is owned by the subscription creator

### 3. Notification Handling

When a calendar event is created:

- Microsoft Graph sends a `POST` request to the notification URL
- Request body contains an array of change notifications
- Each notification includes: subscription ID, change type, resource path, and resource data
- The endpoint must respond within 30 seconds (HTTP 202 recommended)

### 4. Event Detail Retrieval

After acknowledging the notification:

- Extract user ID and event ID from the notification
- Call Microsoft Graph to fetch full event details
- Endpoint: `GET https://graph.microsoft.com/v1.0/users/{userId}/events/{eventId}`
- Response includes complete event metadata and attendee list

---

## Filtering Logic

### Why Full Event Fetch is Required

Webhook notifications are intentionally lightweight and do not include attendee information. This design:
- Reduces payload size and latency
- Ensures sensitive data isn't exposed in transit
- Requires authenticated API calls for detailed data

### Attendee Email Checking

The filtering process:

1. Extract the `attendees` array from the event response
2. Iterate through each attendee object
3. Access `emailAddress.address` property
4. Perform case-insensitive check for `@kornferry.com` suffix
5. Collect all matching attendees for logging

### Match Criteria

An event is considered a match if **any** attendee has an email address ending with `@kornferry.com`. This includes:
- Required attendees
- Optional attendees
- Resources (if email-based)

---

## prepare the Logging Strategy as per requirement
over-engineering

### Required Microsoft Graph Permissions

The application requires the following API permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `Calendars.Read` | Application | Read calendar events for all users |
| `User.Read.All` | Application | Access user information for event queries |

---

## Limitations of the POC

### Subscription Expiration

- Calendar subscriptions expire after a maximum of 4230 minutes (~3 days)
- Production systems must implement automatic renewal
- Lifecycle notifications can signal when renewal is needed

### Possible Duplicate Notifications

- Microsoft Graph may send duplicate notifications for reliability
- The same event creation might trigger multiple webhook calls
- Production systems should implement idempotency checks

### Single Domain Filter

- Currently hardcoded to `@kornferry.com`
- No support for multiple domains or pattern matching
- Configuration changes require code modification

### Limited Error Recovery

- Failed event fetches are logged but not retried
- No dead-letter queue for failed notifications
- Network issues may cause missed events

---

## Future Enhancements

### Database Storage

- store data in database (SQL/NoSQL)
- Enable querying and reporting on historical events
- Support for analytics and trend analysis
- Implement proper data retention policies

### Event Updates & Cancellations

- Extend subscription to include `updated` and `deleted` change types
- Track event lifecycle (created → modified → cancelled)
- Detect when Korn Ferry attendees are added/removed from existing events

### Multiple Domain Support

- Configurable list of target domains
- Support for wildcard patterns (e.g., `*.kornferry.com`)
- Domain groups for organizational units
- External configuration file or environment variables

### Production Hardening

- **High Availability**: Multiple webhook listeners behind load balancer
- **Retry Logic**: Exponential backoff for failed Graph API calls
- **Monitoring**: Health checks, alerting, and observability
- **Rate Limiting**: Handle Graph API throttling gracefully
- **Subscription Management**: Automatic creation, renewal, and recovery
- **Message Queue**: Decouple notification receipt from processing
- **Audit Trail**: Comprehensive logging for compliance
- **Secret Management**: Secure credential storage (Azure Key Vault)

### Additional Features

- Email notifications when matches are detected
- Integration with internal systems (CRM, scheduling tools)
- Dashboard for real-time monitoring
- Support for delegated permissions (user-specific subscriptions)

---

## Summary

This POC validates the technical feasibility of detecting Outlook calendar events involving Korn Ferry personnel using Microsoft Graph Webhooks. The approach provides real-time event detection with minimal latency, enabling immediate action when relevant meetings are scheduled.

The architecture is straightforward and suitable for demonstration purposes, with clear paths for production enhancement including database persistence, multi-domain support, and enterprise-grade reliability features.

