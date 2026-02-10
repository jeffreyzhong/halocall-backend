/**
 * SMS Endpoints
 *
 * - POST /send       – Start an outbound SMS chat via Retell AI
 * - POST /twilio     – Send an SMS directly via the Twilio REST API
 */

import { Hono } from 'hono';
import { successResponse, errorResponse } from '../../types';

const app = new Hono();

// ============================================================================
// Types
// ============================================================================

interface SendSmsArgs {
  /** The user's phone number (recipient) */
  user_number: string;
  /** The AI voice agent's Retell phone number (sender) */
  agent_number: string;
}

interface TwilioSendArgs {
  /** Phone number to send the SMS from (must be a Twilio-owned number) */
  from: string;
  /** Phone number to send the SMS to */
  to: string;
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  error_code: number | null;
  error_message: string | null;
  [key: string]: unknown;
}

interface RetellCreateSmsChatBody {
  from_number: string;
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

interface RetellSmsChatResponse {
  chat_id: string;
  agent_id: string;
  chat_status: 'ongoing' | 'ended' | 'error';
  transcript?: string;
  [key: string]: unknown;
}

// ============================================================================
// Helpers
// ============================================================================

const RETELL_API_BASE = 'https://api.retellai.com';

/**
 * Get the Retell API key from environment variables.
 */
function getRetellApiKey(): string {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing Retell AI credentials. Set the RETELL_API_KEY environment variable.'
    );
  }
  return apiKey;
}

/**
 * Normalize a phone number to E.164 format.
 */
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return phone;
}

/**
 * Get Twilio credentials from environment variables.
 */
function getTwilioCredentials(): { accountSid: string; authToken: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      'Missing Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
    );
  }
  return { accountSid, authToken };
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * POST /twilio
 *
 * Send a booking-link SMS directly via the Twilio REST API.
 * The message body is hardcoded with the Square booking link.
 *
 * Request body:
 *   {
 *     "from": "+12065559999",       // Twilio-owned sender number
 *     "to":   "+12065551234"        // recipient number
 *   }
 *
 * The arguments may be nested under "args" (Retell AI custom function format),
 * "arguments", or provided directly in the request body.
 */
app.post('/twilio', async (c) => {
  try {
    const reqBody = await c.req.json();
    const args: Partial<TwilioSendArgs> = reqBody.args || reqBody.arguments || reqBody;

    // --- Validate required fields ---
    if (!args.from) {
      return c.json(errorResponse('Missing required parameter: from'), 400);
    }
    if (!args.to) {
      return c.json(errorResponse('Missing required parameter: to'), 400);
    }

    const fromNumber = formatPhoneNumber(args.from);
    const toNumber = formatPhoneNumber(args.to);

    const smsBody =
      'Hello this is Halo Spa. Thanks for inquiring about a booking.';

    // --- Call Twilio Messages API ---
    const { accountSid, authToken } = getTwilioCredentials();

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const formBody = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: smsBody,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Twilio API error (${response.status}):`, errorBody);
      return c.json(
        errorResponse(`Twilio API error (${response.status}): ${errorBody}`),
        response.status as any
      );
    }

    const result: TwilioMessageResponse = await response.json();

    console.log(
      `SMS sent via Twilio: sid=${result.sid} status=${result.status} to=${toNumber} from=${fromNumber}`
    );

    return c.json(
      successResponse({
        message_sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
      })
    );
  } catch (error) {
    console.error('Error sending Twilio SMS:', error);
    const message = error instanceof Error ? error.message : 'Failed to send SMS via Twilio';
    return c.json(errorResponse(message), 500);
  }
});

/**
 * POST /send
 *
 * Start an outbound SMS chat via Retell AI. The Retell chat agent will
 * automatically generate and send the initial message based on its
 * configuration.
 *
 * Request body:
 *   {
 *     "user_number":  "+12065551234",   // recipient
 *     "agent_number": "+12065559999"    // sender (Retell-provisioned number)
 *   }
 *
 * The arguments may be nested under "args" (Retell AI custom function format),
 * "arguments", or provided directly in the request body.
 */
app.post('/send', async (c) => {
  try {
    const body = await c.req.json();
    const args: Partial<SendSmsArgs> = body.args || body.arguments || body;

    // --- Validate required fields ---
    if (!args.user_number) {
      return c.json(errorResponse('Missing required parameter: user_number'), 400);
    }
    if (!args.agent_number) {
      return c.json(errorResponse('Missing required parameter: agent_number'), 400);
    }

    const toNumber = formatPhoneNumber(args.user_number);
    const fromNumber = formatPhoneNumber(args.agent_number);

    // --- Call Retell AI create-sms-chat API ---
    const apiKey = getRetellApiKey();

    const retellBody: RetellCreateSmsChatBody = {
      from_number: fromNumber,
      to_number: toNumber,
    };

    const response = await fetch(`${RETELL_API_BASE}/v2/create-sms-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retellBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Retell API error (${response.status}):`, errorBody);
      return c.json(
        errorResponse(`Retell API error (${response.status}): ${errorBody}`),
        response.status as any
      );
    }

    const result: RetellSmsChatResponse = await response.json();

    console.log(
      `SMS chat created: chat_id=${result.chat_id} agent_id=${result.agent_id} to=${toNumber} from=${fromNumber}`
    );

    return c.json(
      successResponse({
        chat_id: result.chat_id,
        agent_id: result.agent_id,
        chat_status: result.chat_status,
        to: toNumber,
        from: fromNumber,
      })
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    const message = error instanceof Error ? error.message : 'Failed to send SMS';
    return c.json(errorResponse(message), 500);
  }
});

export default app;
