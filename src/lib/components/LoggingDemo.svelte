<script lang="ts">
  import { onMount } from 'svelte';
  import { logger } from '$lib/utils/logger';
  import { envStore } from '$lib/stores/envStore';
  import { dev } from '$app/environment';
  import type { EnvStoreConfig } from '$lib/stores/envStore';

  // Use $props for Svelte 5 runes mode
  let { title = 'Logging Demo' } = $props();
  
  let verboseLogging = $state(false);
  
  function toggleVerboseLogging() {
    envStore.update((state: EnvStoreConfig) => ({
      ...state,
      verboseLogging: !state.verboseLogging
    }));
  }
  
  $: {
    // Access store directly within the component to get reactive updates
    verboseLogging = $envStore.verboseLogging;
  }
  
  onMount(() => {
    logger.log('LoggingDemo component mounted');
    logger.warn('This is a warning that will only show in dev or if VERBOSE_LOGGING is true');
    
    // This error message will only appear in dev or when verbose logging is true
    logger.error('This is an error message with the same visibility rules as regular logs');
  });
</script>

<div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
  <h2 class="text-xl font-bold mb-4">{title}</h2>
  
  <div class="mb-4">
    <p class="text-sm">
      Current environment: <span class="font-bold">{dev ? 'Development' : 'Production'}</span>
    </p>
    <p class="text-sm mt-1">
      Verbose logging: <span class="font-bold">{verboseLogging ? 'Enabled' : 'Disabled'}</span>
    </p>
  </div>
  
  <div class="space-y-2">
    <button 
      class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
      on:click={() => logger.log('Regular log message clicked at', new Date().toISOString())}
    >
      Trigger Log Message
    </button>
    
    <button 
      class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
      on:click={() => logger.warn('Warning message clicked at', new Date().toISOString())}
    >
      Trigger Warning
    </button>
    
    <button 
      class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
      on:click={() => logger.error('Error message clicked at', new Date().toISOString())}
    >
      Trigger Error
    </button>
    
    {#if !dev}
      <button 
        class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded"
        on:click={toggleVerboseLogging}
      >
        {verboseLogging ? 'Disable' : 'Enable'} Verbose Logging (Client-only)
      </button>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Note: This only changes the client-side setting. Server-side logging is controlled by the VERBOSE_LOGGING environment variable.
      </p>
    {/if}
  </div>
  
  <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
    <p>Open your browser console to see the logs based on your current settings.</p>
    <p class="mt-1">In production, logs will only appear if:</p>
    <ul class="list-disc list-inside ml-2">
      <li>The VERBOSE_LOGGING environment variable is set to "true" in wrangler.toml for server logs</li>
      <li>The client-side verboseLogging state is enabled for client logs</li>
    </ul>
  </div>
</div> 