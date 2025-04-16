/**
 * Scheduled Cloudflare Worker that calls the image dimension extraction API
 * 
 * This worker runs on a cron schedule and automatically processes image dimensions.
 */

export default {
  /**
   * Main worker handler - will be triggered on the cron schedule
   */
  async scheduled(event, env, ctx) {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled image dimension extraction...`);
      
      // Get the URL of the current site
      const targetUrl = getTargetUrl(env);
      console.log(`Target API URL: ${targetUrl}`);
      
      // Call the SvelteKit API endpoint to process images
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Scheduled-Worker-Internal',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'cloudflare-worker-scheduler',
          timestamp: new Date().toISOString()
        })
      });
      
      // Check if the request was successful
      if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`);
        const text = await response.text();
        console.error(`Response: ${text}`);
        return { 
          error: `Failed with status ${response.status}`,
          details: text
        };
      }
      
      // Parse the JSON response
      const result = await response.json();
      
      // Log the result
      console.log(`Task completed successfully. Processed ${result.processed || 0} images.`);
      console.log(`Status: ${result.status}, Total in R2: ${result.total}, Existing: ${result.existing}`);
      
      return result;
    } catch (error) {
      console.error(`Error in scheduled task: ${error.message}`);
      // Return error info for logging
      return { error: error.message, stack: error.stack };
    }
  },
  
  /**
   * HTTP handler for direct requests to the worker
   * Useful for manual triggering or checking status
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Allow manual triggering via POST
    if (request.method === 'POST' && url.pathname === '/trigger') {
      try {
        // Manually trigger the scheduled function
        const result = await this.scheduled({
          scheduledTime: Date.now(),
          cron: 'manual'
        }, env, ctx);
        
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to trigger scheduled task',
          message: error.message,
          stack: error.stack
        }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Allow status check via GET
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/status')) {
      return new Response(JSON.stringify({
        status: 'ready',
        message: 'Image dimension extraction worker is ready',
        targetUrl: getTargetUrl(env),
        help: 'Use POST to /trigger to run the job manually'
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Default response for other requests
    return new Response(JSON.stringify({
      error: 'Not found',
      message: 'Unknown endpoint requested',
      help: 'Available endpoints: GET / or /status, POST /trigger'
    }, null, 2), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Dynamically determine the target API URL based on the request URL
 * This avoids hardcoding URLs and makes the worker portable across environments
 */
function getTargetUrl(env) {
  // Try to get the current domain from CF variable or fallback to API URL
  const domain = env.CF_PAGES_URL || env.CF_DOMAIN || 'https://your-domain.com';
  
  // Ensure the domain doesn't have a trailing slash
  const baseUrl = domain.replace(/\/$/, '');
  
  // Construct the full URL to the scheduled endpoint
  return `${baseUrl}/api/scheduled`;
} 