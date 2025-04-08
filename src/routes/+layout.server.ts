import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ platform }) => {
    // Verify bucket binding is properly set
    const hasBucketBinding = !!(platform?.env?.ASSETSBUCKET);
    
    // For debugging during development/deployment
    console.log('Root layout: R2 bucket binding status:', hasBucketBinding ? 'Available' : 'Not available');
    
    // Return R2 availability status for all routes
    return {
        r2Available: hasBucketBinding
    };
}; 