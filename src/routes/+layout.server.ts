import type { LayoutServerLoad } from './$types.js';
import { dev } from '$app/environment';

export const load: LayoutServerLoad = async ({ platform }) => {
    // Verify bucket binding is properly set
    const hasBucketBinding = !!(platform?.env?.ASSETSBUCKET);
    
    // Get verbose logging environment variable
    const verboseLoggingEnv = platform?.env?.VERBOSE_LOGGING;
    const verboseLogging = verboseLoggingEnv === 'true';
    
    // For debugging during development/deployment
    if (dev || verboseLogging) {
        console.log('Root layout:', 
            'R2 bucket binding:', hasBucketBinding ? 'Available' : 'Not available',
            'VERBOSE_LOGGING:', verboseLoggingEnv
        );
    }
    
    // Return R2 availability status and logging preference for all routes
    return {
        r2Available: hasBucketBinding,
        verboseLogging
    };
}; 