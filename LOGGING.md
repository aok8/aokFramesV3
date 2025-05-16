# Conditional Logging System for AokFramesV3

This document explains the conditional logging system implemented in AokFramesV3. The system allows for different logging behaviors between development and production environments, with the ability to enable verbose logging in production when needed for debugging.

## Overview

The logging system follows these principles:

1. In development mode, all logs are displayed
2. In production mode, logs are only displayed if `VERBOSE_LOGGING` is enabled
3. Server-side logs are controlled by the `VERBOSE_LOGGING` environment variable in Cloudflare
4. Client-side logs are controlled by the same setting, passed from server to client via SvelteKit's `+layout.ts` system

## Configuration

### Cloudflare Environment Variable

In `wrangler.toml`, the `VERBOSE_LOGGING` environment variable is defined:

```toml
[vars]
VERBOSE_LOGGING = "false" # Set to "true" to enable verbose logs in production
```

To enable verbose logging in production:

1. Update this value to `"true"` in `wrangler.toml`
2. Deploy the updated configuration to Cloudflare

### Local Development

In development mode, all logs are shown regardless of the `VERBOSE_LOGGING` setting. This makes local debugging easier without requiring configuration changes.

## Usage

### Server-Side Logging

For server-side code (hooks, API routes, server load functions):

```typescript
import { createServerLogger } from '$lib/utils/logger';

export const load = async (event) => {
  const serverLogger = createServerLogger(event.platform?.env);
  
  serverLogger.log('This is an informational message');
  serverLogger.warn('This is a warning message');
  serverLogger.error('This is an error message');
  
  // Rest of your code...
};
```

### Client-Side & Component Logging

For Svelte components and client-side code:

```svelte
<script>
  import { logger } from '$lib/utils/logger';
  
  logger.log('This is an informational message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
</script>
```

## Implementation Details

### Files

- `src/lib/utils/logger.ts` - The main logger implementation
- `src/lib/stores/envStore.ts` - Svelte store for environment configuration
- `src/routes/+layout.server.ts` - Passes environment variables from server to client
- `src/routes/+layout.ts` - Initializes the client-side store from server data

### The Logger API

The logger provides these methods:

- `logger.log(...)` - For informational messages
- `logger.warn(...)` - For warning messages
- `logger.error(...)` - For error messages

All methods follow the same visibility rules based on environment and configuration.

## Demo Component

A demo component is available at `src/lib/components/LoggingDemo.svelte` which demonstrates the logging system's functionality and provides UI controls to test it.

## Best Practices

1. Replace all `console.log/warn/error` calls with the appropriate logger methods
2. Use appropriate log levels (log/warn/error) based on message importance
3. Include contextual information in log messages for easier debugging
4. Keep log messages concise but informative
5. Group related logs with common prefixes for easier filtering

## Troubleshooting

If logs are not appearing in production:

1. Verify `VERBOSE_LOGGING` is set to `"true"` in your Cloudflare configuration
2. Check that `envStore.verboseLogging` is properly updated in `+layout.ts`
3. Ensure you're using the correct logger (`logger` for client, `createServerLogger` for server)
4. Confirm that the logger code is being imported correctly in your components/modules

For local development, all logs should appear regardless of configuration. 