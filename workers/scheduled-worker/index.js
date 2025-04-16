/**
 * Scheduled Cloudflare Worker that calls the image dimension extraction API
 * 
 * This worker should be deployed separately from your SvelteKit app
 * and configured with a cron trigger in the Cloudflare dashboard.
 */

// Configuration (adjust these values as needed)
const CONFIG = {
  // The URL to your SvelteKit app's scheduled API endpoint
  // Update this to your actual site URL once deployed
  TARGET_URL: 'https://your-app-domain.com/api/scheduled',
  
  // Secret token for authentication (should match what's in your SvelteKit endpoint)
  AUTH_TOKEN: 'your-secret-token-here'
};

export default {
  /**
   * Main worker handler - will be triggered on the cron schedule
   */
  async scheduled(event, env, ctx) {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled task...`);
      
      // Call the SvelteKit API endpoint to process images
      const response = await fetch(CONFIG.TARGET_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}`,
          'User-Agent': 'Cloudflare-Worker-Scheduler',
          'Content-Type': 'application/json'
        },
        // Optional request body - you can add parameters here if needed
        body: JSON.stringify({
          source: 'cloudflare-scheduler',
          timestamp: new Date().toISOString()
        })
      });
      
      // Parse response
      const result = await response.json();
      
      // Log results
      if (response.ok) {
        console.log(`Task completed successfully. Processed ${result.processed} images.`);
      } else {
        console.error(`Task failed with status ${response.status}: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error in scheduled task: ${error.message}`);
      // Return error info for logging
      return { error: error.message, stack: error.stack };
    }
  },
  
  /**
   * Optional handler for direct HTTP requests to the worker
   * Useful for manual triggering or checking status
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Allow manual triggering via POST
    if (request.method === 'POST' && url.pathname === '/trigger') {
      try {
        // Check authorization (optional but recommended)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ') || 
            authHeader.slice(7) !== CONFIG.AUTH_TOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        // Manually trigger the scheduled function
        const result = await this.scheduled({
          scheduledTime: Date.now(),
          cron: 'manual'
        }, env, ctx);
        
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default response for other requests
    return new Response(JSON.stringify({
      status: 'ready',
      message: 'This worker runs on a schedule. Use POST to /trigger to run manually.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 