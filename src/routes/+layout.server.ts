import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ platform }) => {
    // Verify bucket binding is properly set
    const hasBucketBinding = !!(platform?.env?.ASSETS);
    
    // For debugging during development/deployment
    console.log('R2 bucket binding status:', hasBucketBinding ? 'Available' : 'Not available');
    
    return {
        r2Available: hasBucketBinding
    };
}; 