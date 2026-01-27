import { Hono } from 'hono';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { prisma } from '../../lib/prisma';
import { errorResponse, successResponse } from '../../types';

const app = new Hono();

/**
 * Clerk webhook endpoint
 * 
 * Handles webhooks from Clerk, specifically the user.created event.
 * When a new user is created in Clerk, this endpoint creates a corresponding
 * user record in the Supabase users table.
 */
app.post('/clerk', async (c) => {
  try {
    // Get the webhook signing secret from environment
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    
    if (!signingSecret) {
      console.error('CLERK_WEBHOOK_SIGNING_SECRET environment variable is not set');
      return c.json(errorResponse('Webhook configuration error'), 500);
    }

    // Verify the webhook signature
    // Use the raw request object which is compatible with Clerk's verifyWebhook
    let evt;
    try {
      evt = await verifyWebhook(c.req.raw, {
        signingSecret,
      });
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return c.json(errorResponse('Invalid webhook signature'), 401);
    }

    // Handle user.created event
    if (evt.type === 'user.created') {
      const userData = evt.data;
      
      // Extract user information
      const clerkUserId = userData.id;
      
      if (!clerkUserId) {
        console.error('Missing user ID in webhook payload');
        return c.json(errorResponse('Invalid webhook payload: missing user ID'), 400);
      }
      
      // Get primary email address
      // Try to find email by primary_email_address_id first, then fall back to first verified email
      let primaryEmail = userData.email_addresses?.find(
        (email: { id: string; email_address: string; verification?: { status: string } }) =>
          email.id === userData.primary_email_address_id
      )?.email_address;

      // Fallback to first verified email if primary_email_address_id doesn't match
      if (!primaryEmail && userData.email_addresses?.length) {
        primaryEmail = userData.email_addresses.find(
          (email: { email_address: string; verification?: { status: string } }) =>
            email.verification?.status === 'verified'
        )?.email_address || userData.email_addresses[0]?.email_address;
      }

      if (!primaryEmail) {
        console.error('No email found for user:', clerkUserId);
        return c.json(errorResponse('User has no email address'), 400);
      }

      // Extract first and last name
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';

      // Check if user already exists (idempotency)
      const existingUser = await prisma.users.findUnique({
        where: { clerk_user_id: clerkUserId },
      });

      if (existingUser) {
        console.log('User already exists:', clerkUserId);
        return c.json(
          successResponse({
            message: 'User already exists',
            clerk_user_id: clerkUserId,
          }),
          200
        );
      }

      // Create new user in database
      const newUser = await prisma.users.create({
        data: {
          clerk_user_id: clerkUserId,
          email: primaryEmail,
          first_name: firstName,
          last_name: lastName,
          // clerk_organization_id is optional, set to empty string if not provided
          clerk_organization_id: userData.organization_id || '',
        },
      });

      console.log('Created new user:', newUser.id, clerkUserId);

      return c.json(
        successResponse({
          message: 'User created successfully',
          user_id: newUser.id.toString(),
          clerk_user_id: clerkUserId,
          email: primaryEmail,
        }),
        201
      );
    }

    // For other event types, just acknowledge receipt
    console.log('Received webhook event:', evt.type);
    return c.json(
      successResponse({
        message: 'Webhook received',
        event_type: evt.type,
      }),
      200
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to process webhook'
      ),
      500
    );
  }
});

/**
 * GET endpoint for testing/debugging
 */
app.get('/clerk', (c) => {
  return c.json({
    name: 'clerk-webhook',
    description: 'Clerk webhook endpoint for user.created events',
    method: 'POST',
    endpoint: '/webhooks/clerk',
    events: ['user.created'],
  });
});

export default app;
