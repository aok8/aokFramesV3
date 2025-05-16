import { writable } from 'svelte/store';

export interface EnvStoreConfig {
  verboseLogging: boolean;
}

// Default to false, will be updated by +layout.ts
export const envStore = writable<EnvStoreConfig>({
  verboseLogging: false 
}); 