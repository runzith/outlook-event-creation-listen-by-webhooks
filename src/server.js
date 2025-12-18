require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

async function getAccessToken() {
  return `eyJ0eXAiOiJKV1QiLCJub25jZSI6IkdCM1F1cVk0dV96NkZKMGxOVEhzVktzRzJ4cVFJX2ItQkJIVlRJMW9iZTAiLCJhbGciOiJSUzI1NiIsIng1dCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyIsImtpZCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9lOWQyMTM4Ny00M2YxLTRlMDYtYTI1My1mOWVkOTA5NmRjNDgvIiwiaWF0IjoxNzY2MDQ1MTY2LCJuYmYiOjE3NjYwNDUxNjYsImV4cCI6MTc2NjA0OTA2NiwiYWlvIjoiazJKZ1lHaDhuYXo2OFBiRmJ0c1BoN1U3SlFObkFBQT0iLCJhcHBfZGlzcGxheW5hbWUiOiJLRk…cjNSamFnYUtjUWdMOUxMcnRoMjF2dU9fZTN1TF9Nc2hnRTFDVVEwaUFtUUVDRGtCcEFBIiwieG1zX3N1Yl9mY3QiOiIzIDkiLCJ4bXNfdGNkdCI6MTM4ODQ2MjQyMCwieG1zX3RudF9mY3QiOiIxMiAzIn0.WwVwqztEe-2S67TuIBJ7hYc2xDdx0Ttd5yS8vdcseaJB-laZbpE_fGzSa98veFAOUg6Kovp8pyBe_skb7KaVGm96JculN7PD-vs1x968UUWLGPwzdytJQp3LUYePsDHoFYdtjlwSC1_kw5H-pFDoyusIrJEC1V-tkmtD2P_3AbhUWdUtq2WOdG5XxnSEZ2lOTfkEAoV4pIEZgK0VSm18GQII3W4sDuc37MnkVMZRq619pGUDnI5uOrP6UyM0KoYqgcO9XvyuQrhYmid9jXRbO2ELa9W2vfU0ayG6hKuhbUoJhG7W8EO-j88YwBacMnGljm0tVVzJnNYAy_yLBT56jw`;
}

async function fetchEventDetails(userId, eventId) {
  console.log("🚀 ~ fetchEventDetails ~ userId:", userId)
  const accessToken = await getAccessToken();
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

  const userId = 'ranjith@kornferry.com';
  const eventId = resourceData?.id;

  console.log(`Processing event - User: ${userId}, Event: ${eventId}`);

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
    // const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }
    const tunnelUrl = `https://mtv-referenced-accommodate-despite.trycloudflare.com`;
    const userEmail = "ranjith.bandi@kornferry.com";
    // console.log("🚀 ~ userEmail:", userEmail)

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

    // res.status(201).json({
    //     message: 'Subscription created successfully',
    //     subscription: subscription
    // });
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

// POST /api/lifecycle - Handle subscription lifecycle notifications
app.post('/api/lifecycle', (req, res) => {
  try {
    const validationToken = req.query.validationToken;
    if (validationToken) {
      return res.status(200).type('text/plain').send(validationToken);
    }

    const notifications = req.body?.value;
    if (notifications && Array.isArray(notifications)) {
      notifications.forEach(n => console.log(`Lifecycle: ${n.lifecycleEvent} for ${n.subscriptionId}`));
    }

    res.status(200).json({ message: 'Lifecycle notification processed' });
  } catch (error) {
    console.error('Lifecycle error:', error.message);
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
//   console.log(` Lifecycle: POST /api/lifecycle\n`);
});

module.exports = app;
