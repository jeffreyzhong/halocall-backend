import { SquareClient, SquareEnvironment } from 'square';

/**
 * Helper to handle Square API errors and extract meaningful messages
 */
export function handleSquareError(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's a Square API error with more details
    const squareError = error as Error & { 
      errors?: Array<{ category: string; code: string; detail?: string }> 
    };
    
    if (squareError.errors && squareError.errors.length > 0) {
      return squareError.errors.map(e => e.detail || e.code).join('; ');
    }
    
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Re-export commonly used Square types for convenience
 */
export { SquareClient, SquareEnvironment } from 'square';

/**
 * Re-export merchant functions for getting per-merchant Square clients
 */
export { getSquareClientForMerchant, getMerchantConfig } from './merchant';
