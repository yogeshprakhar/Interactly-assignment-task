require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

// Twilio credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Endpoint to initiate the IVR call
app.post('/sendCall', (req, res) => {
  const { toPhoneNumber, userName, audioUrl } = req.body;

  client.calls
    .create({
      url: `http://your-ngrok-url.ngrok.io/ivr?name=${encodeURIComponent(userName)}&audioUrl=${encodeURIComponent(audioUrl)}`,
      to: toPhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    })
    .then(call => {
      console.log(`Call initiated with Call SID: ${call.sid}`);
      res.send(`Call initiated to ${toPhoneNumber}`);
    })
    .catch(error => {
      console.error('Error initiating call:', error);
      res.status(500).send('Error initiating call.');
    });
});

// IVR response endpoint (Twilio will hit this when the call is answered)
app.post('/ivr', (req, res) => {
  const userName = req.query.name;
  const audioUrl = req.query.audioUrl;

  const twiml = new twilio.twiml.VoiceResponse();
  
  // Play the personalized message and audio file
  twiml.say(`Hello ${userName}, we have an opportunity for you. Please listen to the following message.`);
  twiml.play(audioUrl);
  
  // Prompt the user to press 1 if they are interested
  twiml.gather({
    action: '/handleResponse', // Where to forward the response
    numDigits: 1,
    timeout: 10
  }).say('Press 1 if you are interested.');

  // If no input is received, repeat the message
  twiml.say('We did not receive your response. Please press 1 if interested.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle response when the user presses 1
app.post('/handleResponse', (req, res) => {
  const digits = req.body.Digits;
  
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (digits === '1') {
    twiml.say('Thank you for your interest. We will send you a personalized interview link via SMS shortly.');

    // Send SMS with the personalized interview/video link
    const { To } = req.body;
    client.messages
      .create({
        body: 'Thank you for your interest! Here is your personalized interview link: https://example.com/interview',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: To,
      })
      .then(message => {
        console.log(`SMS sent with SID: ${message.sid}`);
      })
      .catch(error => {
        console.error('Error sending SMS:', error);
      });
  } else {
    twiml.say('Thank you for your time. Goodbye.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
