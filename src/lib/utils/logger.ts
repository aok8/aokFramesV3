import { dev, browser } from '$app/environment';
import { envStore } from '$lib/stores/envStore';
import { get } from 'svelte/store';

function isLoggingEnabled(isServerErrorLog: boolean = false, platformEnv?: App.Platform['env']): boolean {
  if (dev) {
    return true; // Always log in development
  }

  // Production environment
  if (isServerErrorLog) { // For server-side specific logger calls
    return platformEnv?.VERBOSE_LOGGING === 'true';
  }
  
  // For client-side or Svelte components (SSR/client)
  // This relies on envStore being initialized from LayoutData
  return get(envStore).verboseLogging;
}

/**
 * Logger for Svelte components and client-side logic.
 * Relies on `envStore` which is populated from `LayoutData`.
 */
export const logger = {
  log: (...args: any[]): void => {
    if (isLoggingEnabled()) {
      console.log(...args);
    }
  },
  warn: (...args: any[]): void => {
    if (isLoggingEnabled()) {
      console.warn(...args);
    }
  },
  error: (...args: any[]): void => {
    // Consistent with user request: errors only appear if verbose logging is enabled
    if (isLoggingEnabled()) {
      console.error(...args);
    }
  }
};

/**
 * Factory for a server-side logger.
 * Use this in `hooks.server.ts` or `+server.ts` files.
 * @param platformEnv - The `event.platform.env` object.
 */
export const createServerLogger = (platformEnv?: App.Platform['env']) => ({
  log: (...args: any[]): void => {
    if (isLoggingEnabled(true, platformEnv)) {
      console.log('[SERVER]', ...args);
    }
  },
  warn: (...args: any[]): void => {
    if (isLoggingEnabled(true, platformEnv)) {
      console.warn('[SERVER]', ...args);
    }
  },
  error: (...args: any[]): void => {
    if (isLoggingEnabled(true, platformEnv)) {
      console.error('[SERVER]', ...args);
    }
  }
}); 