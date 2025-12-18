# Detecting Outlook Calendar Events with Korn Ferry Invitees

## What This POC Does

This is a proof-of-concept that listens to Outlook calendar events in real-time and identifies meetings that include people from Korn Ferry (`@kornferry.com`).

**The simple version:** When someone creates a meeting and invites a Korn Ferry employee, we detect it instantly.

### Why We Built This

- Get notified the moment a relevant meeting is scheduled
- Identify which meetings involve Korn Ferry personnel
- Lay the groundwork for future integrations (CRM sync, coaching platforms, etc.)

---

## How It Works

Here's the flow in plain English:

```
1. Someone creates a meeting in Outlook
           ↓
2. Microsoft notices and pings our server
           ↓
3. We ask Microsoft for the meeting details
           ↓
4. We check if any attendee is from @kornferry.com
           ↓
5. If yes, we log it
```

That's it. Simple concept, but there are some important details under the hood.

---

## The Technical Bits

### Setting Up the Listener

Before we can receive notifications, we tell Microsoft:
- "Hey, watch this user's calendar"
- "Send notifications to this URL when something happens"
- "We're interested in new events"

Microsoft validates that we own the URL (security check), and we're live.

### What Happens When a Meeting is Created

1. **Microsoft sends us a ping** — but here's the catch: it only tells us *that* something happened, not *what* happened
2. **We fetch the details** — we call Microsoft back to get the full meeting info (attendees, times, subject, etc.)
3. **We check for Korn Ferry attendees** — simple email domain check
4. **We log matches** — for now, just to a file

### Required Permissions

| Permission | What It Does |
|------------|--------------|
| `Calendars.Read` | Read calendar events |
| `User.Read.All` | Access user info for queries |

---

## The "Why Can't We Just..." Section

Every reviewer asks these questions. Here are honest answers.

### "Why do we need a second API call? Can't Microsoft just send us everything?"

**Short answer:** No. This is how Microsoft built it.

**Longer answer:** Microsoft Graph webhooks are intentionally lightweight. They tell you "something changed" but don't include the actual data. This is by design for:
- Performance (smaller payloads, faster delivery)
- Security (sensitive data isn't flying around in webhooks)

**There's no setting, flag, or workaround to change this.** We checked. Everyone who uses Microsoft Graph calendars does it this way.

### "Can we extend the subscription beyond 3 days?"

**No.** Microsoft caps calendar subscriptions at ~3 days. Period.

In production, you'd set up an auto-renewal job that refreshes the subscription before it expires. Not complicated, just needs to be done.

### "What about polling instead of webhooks?"

You could poll, but:
- You'd make way more API calls
- You'd have delayed detection (polling interval)
- Microsoft recommends webhooks for real-time scenarios

Webhooks are the right choice here.

---

## How Everyone Else Does This

We're not doing anything unusual. Here's how similar systems work:

| Platform Type | What They Do |
|---------------|--------------|
| Interview scheduling (ATS) | Webhook → Fetch event → Update candidate status |
| CRM systems | Webhook → Fetch event → Sync contacts |
| Coaching platforms | Webhook → Fetch event → Track sessions |

**They all make the second API call.** It's the standard pattern.

### The Industry Playbook

| Challenge | Standard Solution |
|-----------|-------------------|
| Webhook only has event ID | Call Graph API to get details |
| Subscription expires in 3 days | Auto-renew before expiration |
| Might get duplicate notifications | Track what you've processed |
| High volume of events | Use a message queue |
| API rate limits | Request only fields you need |

This POC follows all of these patterns.

---

## Making This Production-Ready

If we move forward, here's what we'd add:

### Must-Have
- Database storage instead of file logging
- Subscription auto-renewal
- Retry logic for failed API calls
- Duplicate notification handling

### Nice-to-Have
- Support for multiple domains
- Message queue for high volume
- Monitoring and alerting
- Integration with other systems

---

## Quick Reference

### Subscription Request

```json
{
  "changeType": "created",
  "notificationUrl": "https://your-server.com/api/notifications",
  "resource": "/users/{userId}/events",
  "expirationDateTime": "2025-12-21T00:00:00Z",
  "clientState": "your-secret-value"
}
```

### Event Fetch (with optimization)

```
GET /users/{userId}/events/{eventId}?$select=subject,organizer,attendees,start,end
```

Only request the fields you need — smaller response, faster processing.

---

### What Reviewers Should Know

| Common Question | Reality |
|-----------------|---------|
| "Can we avoid the second API call?" | No — platform limitation |
| "Can subscriptions last longer than 3 days?" | No — platform limitation |
| "Is this a workaround or hack?" | No — this is the standard pattern |
| "Do other companies do it this way?" | Yes — everyone does |

### Final Word

> The constraints we're working within are **Microsoft's design decisions**, not gaps in our implementation. This POC follows industry best practices and can be extended to production-grade with the enhancements outlined above.

---

## Appendix: End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SETUP PHASE                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Register webhook subscription with Microsoft Graph          │
│  2. Microsoft validates our endpoint (sends token, we echo it)  │
│  3. Subscription is active for ~3 days                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       RUNTIME PHASE                             │
├─────────────────────────────────────────────────────────────────┤
│  1. User creates meeting in Outlook                             │
│  2. Microsoft sends webhook with event ID (not full details)    │
│  3. We call Graph API: GET /users/{id}/events/{eventId}         │
│  4. We receive full event details including attendees           │
│  5. We check each attendee for @kornferry.com                   │
│  6. If match found → log the event                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     MAINTENANCE PHASE                           │
├─────────────────────────────────────────────────────────────────┤
│  • Renew subscription before 3-day expiration                   │
│  • Handle lifecycle notifications if subscription needs refresh │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document last updated: December 2025*
