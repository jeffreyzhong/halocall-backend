import { Hono } from 'hono';
import { SquareClient, SquareEnvironment } from 'square';
import { prisma } from '../../lib/prisma';
import { decrypt, encrypt } from '../../lib/encryption';
import { clearMerchantCache } from '../../lib/merchant';
import { successResponse, errorResponse } from '../../types';

const app = new Hono();

/**
 * Get the current timestamp in America/Los_Angeles timezone.
 * Used for updating the updated_at column.
 */
function getCurrentLATimestamp(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
}

/**
 * POST /admin/refresh-tokens
 *
 * Refreshes Square OAuth access tokens for all active merchants
 * that have a stored refresh token. Each merchant is processed
 * independently so a single failure won't block the others.
 *
 * Returns a summary with per-merchant results.
 */
app.post('/refresh-tokens', async (c) => {
  try {
    // Fetch all active merchants that have a refresh token
    const merchants = await prisma.merchant.findMany({
      where: {
        is_active: true,
        square_refresh_token_encrypted: { not: null },
      },
    });

    if (merchants.length === 0) {
      return c.json(successResponse({
        message: 'No active merchants with refresh tokens found',
        refreshed: 0,
        failed: 0,
        total: 0,
        results: [],
      }));
    }

    const results: Array<{
      merchant_id: string;
      status: 'success' | 'failed';
      expires_at?: string;
      error?: string;
    }> = [];

    for (const merchant of merchants) {
      try {
        // Decrypt the stored refresh token
        const refreshToken = decrypt(merchant.square_refresh_token_encrypted!);

        // Determine Square app credentials based on environment
        const clientId = merchant.is_sandbox
          ? process.env.SQUARE_SANDBOX_APPLICATION_ID!
          : process.env.SQUARE_PRODUCTION_APPLICATION_ID!;
        const clientSecret = merchant.is_sandbox
          ? process.env.SQUARE_SANDBOX_APPLICATION_SECRET!
          : process.env.SQUARE_PRODUCTION_APPLICATION_SECRET!;

        // Create an unauthenticated Square client for the OAuth call
        const oauthClient = new SquareClient({
          environment: merchant.is_sandbox
            ? SquareEnvironment.Sandbox
            : SquareEnvironment.Production,
        });

        // Exchange the refresh token for a new access token
        const response = await oauthClient.oAuth.obtainToken({
          clientId,
          clientSecret,
          grantType: 'refresh_token',
          refreshToken,
        });

        if (!response.accessToken) {
          results.push({
            merchant_id: merchant.merchant_id,
            status: 'failed',
            error: 'No access token returned by Square',
          });
          continue;
        }

        // Encrypt the new tokens
        const encryptedAccessToken = encrypt(response.accessToken);
        const encryptedRefreshToken = response.refreshToken
          ? encrypt(response.refreshToken)
          : merchant.square_refresh_token_encrypted;

        // Persist the new tokens
        await prisma.merchant.update({
          where: { merchant_id: merchant.merchant_id },
          data: {
            square_access_token_encrypted: encryptedAccessToken,
            square_refresh_token_encrypted: encryptedRefreshToken,
            updated_at: getCurrentLATimestamp(),
          },
        });

        // Invalidate the cached Square client so it picks up the new token
        clearMerchantCache(merchant.merchant_id);

        results.push({
          merchant_id: merchant.merchant_id,
          status: 'success',
          expires_at: response.expiresAt,
        });

        console.log(`✅ Refreshed token for merchant: ${merchant.merchant_id} (expires ${response.expiresAt})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to refresh token for merchant: ${merchant.merchant_id}:`, message);

        results.push({
          merchant_id: merchant.merchant_id,
          status: 'failed',
          error: message,
        });
      }
    }

    const refreshed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return c.json(successResponse({
      message: `Refreshed ${refreshed} of ${merchants.length} merchant tokens`,
      refreshed,
      failed,
      total: merchants.length,
      results,
    }));
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json(errorResponse('Failed to refresh tokens'), 500);
  }
});

/**
 * GET /admin/refresh-tokens
 *
 * Returns documentation about the refresh-tokens endpoint.
 */
app.get('/refresh-tokens', (c) => {
  return c.json({
    name: 'refresh-tokens',
    description: 'Refresh Square OAuth access tokens for all active merchants with stored refresh tokens',
    method: 'POST',
    parameters: {},
    response: {
      message: 'Summary string',
      refreshed: 'Number of successfully refreshed tokens',
      failed: 'Number of failed refresh attempts',
      total: 'Total merchants processed',
      results: 'Array of per-merchant results with status and expiry or error',
    },
  });
});

export default app;
