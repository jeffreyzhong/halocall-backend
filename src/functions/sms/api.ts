/**
 * SMS Endpoints
 *
 * Webhook endpoint for AI voice agents to send outbound SMS via Retell AI's
 * create-sms-chat API. The Retell chat agent handles generating and sending
 * the initial message based on its configuration.
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

// ============================================================================
// Endpoints
// ============================================================================

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
