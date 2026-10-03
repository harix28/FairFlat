import { Request, Response } from 'express';

// Your custom verify token for WhatsApp webhook setup
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'roomio_whatsapp_secret_123';

// GET request for Webhook Verification by Meta
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verified successfully!');
      res.status(200).send(challenge);
    } else {
      console.error('[WhatsApp Webhook] Verification failed! Token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

// POST request for receiving WhatsApp Messages
export const handleIncomingMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;
    console.log('[WhatsApp Webhook] Incoming message:', JSON.stringify(body, null, 2));

    // WhatsApp sends messages inside entry -> changes -> value -> messages
    if (body.object === 'whatsapp_business_account') {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // Sender's phone number
        const text = message.text?.body; // The actual message text

        console.log(`[WhatsApp Webhook] Received message from ${from}: ${text}`);
        
        // TODO: Pass text to RoomioBotService and send reply using WhatsApp API
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    res.sendStatus(500);
  }
};
