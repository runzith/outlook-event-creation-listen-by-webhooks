require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

async function getAccessToken() {
  try {
    return ''; // get from KFA / hardcode
  } catch (error) {
    console.error('Failed to get access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Microsoft Graph');
  }
}

async function fetchEventDetails(userId, eventId) {
  const accessToken = await getAccessToken();
  console.log("🚀 ~ fetchEventDetails ~ userId:", {userId, eventId, accessToken})
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${userId}/events/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  console.log("🚀 ~ fetchEventDetails ~ response:", response.data);
  return response.data;
}

// Process calendar event notification
async function processNotification(notification) {
  const { changeType, resourceData } = notification;

  if (changeType !== 'created') {
    console.log(`Skipping ${changeType} event`);
    return;
  }

  const userId = 'attendee.surname@kornferry.com';
  const eventId = resourceData?.id;


  await new Promise(resolve => setTimeout(resolve, 1000));

  const event = await fetchEventDetails(userId, eventId);
  console.log("🚀 ~ event:", event);
  const attendees = event.attendees || [];
  const kornferryAttendees = attendees.filter(attendee => 
    attendee.emailAddress?.address?.toLowerCase().endsWith('@kornferry.com')
  );

  const logKornferryEvent = [];
  if (kornferryAttendees.length > 0) {
    logKornferryEvent.push({
      subject: event.subject,
      organizer: event.organizer?.emailAddress?.address,
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
      matchingEmails: kornferryAttendees.map(a => a.emailAddress.address)
    });
  } else {
    console.log(`No @kornferry.com attendees in: ${event.subject}`);
  }
}

app.post("/api/create-subscription", async (req, res) => {
  const accessToken = await msGraphV1Service.getAccessToken();
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }
    const tunnelUrl = `https://mtv-referenced-accommodate-despite.trycloudflare.com`;
    const userEmail = "ranjith.bandi@kornferry.com";

    const clientState = uuidv4();
    const webhookUrl = `${tunnelUrl}/api/notifications`;
    console.log("🚀 ~ webhookUrl:", webhookUrl);
    const expirationDateTime = new Date();
    expirationDateTime.setDate(expirationDateTime.getDate() + 1);
    const subscriptionRequest = {
      changeType: "created",
      notificationUrl: webhookUrl,
      resource: `/users/${userEmail}/events`,
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: clientState,
    };

    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/subscriptions`,
      subscriptionRequest,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const subscription = response.data;

  } catch (error) {
    console.error(
      "Error creating subscription:",
      error?.response?.data || error.message
    );
    res.status(error?.response?.status || 500).json({
      error: "Failed to create subscription",
      message: error?.response?.data?.error?.message || error.message,
      details: error?.response?.data,
    });
  }
}); 

// POST /api/notifications - Handle webhook notifications
app.post('/api/notifications', async (req, res) => {
  try {
    const validationToken = req.query.validationToken;
    if (validationToken) {
      console.log("api got hit for ~ validationToken:", validationToken)
      return res.status(200).type('text/plain').send(validationToken);
    }

    const notifications = req.body?.value;
    console.log("🚀 ~ notifications:", notifications)
    if (!notifications || !Array.isArray(notifications)) {
        console.log("api got hit for ~ notifications:", notifications)
      return res.status(400).json({ error: 'Invalid notification payload' });
    }

    console.log(`Received ${notifications.length} notification(s)`);
    res.status(202).json({ message: 'Accepted', count: notifications.length });

    for (const notification of notifications) {
      processNotification(notification).catch(err => console.error('Error:', err.message));
    }
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n Outlook Webhook POC running on port ${PORT}`);
  console.log(` Notifications: POST /api/notifications`);
});

module.exports = app;
