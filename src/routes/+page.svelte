<script lang="ts">
    import Cover from "./Cover.svelte";
    import MainContent from "./MainContent.svelte";
    import { onMount } from 'svelte';
    
    // Define types for R2 diagnostics
    interface R2DiagnosticResult {
      r2_binding_exists: boolean;
      platform_available: boolean;
      platform_env_available: boolean;
      context_available: boolean;
      request_headers: Record<string, string>;
      r2_bucket_test?: {
        success: boolean;
        error?: string;
      };
      methods_available?: Record<string, boolean>;
      r2_fetch_test?: {
        attempted: boolean;
        success: boolean;
        error?: string;
      };
    }
    
    let mainContent: MainContent;
    
    // Diagnostic state with proper types
    let r2DiagnosticResult: R2DiagnosticResult | null = null;
    let r2DiagnosticError: string | null = null;
    let loadingDiagnostics = false;
    
    // Load diagnostics information when component mounts
    onMount(async () => {
      try {
        loadingDiagnostics = true;
        const response = await fetch('/api/r2-diagnostics');
        if (response.ok) {
          r2DiagnosticResult = await response.json();
        } else {
          r2DiagnosticError = `Error: ${response.status} ${response.statusText}`;
        }
      } catch (error: unknown) {
        r2DiagnosticError = error instanceof Error ? error.message : String(error);
      } finally {
        loadingDiagnostics = false;
      }
    });
</script>

<Cover on:coverScrolledAway={() => mainContent.handleCoverScrolledAway()} />

<!-- Add a diagnostic banner for development -->
{#if import.meta.env.DEV || (r2DiagnosticResult || r2DiagnosticError)}
  <div style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); color: white; z-index: 9999; padding: 10px; font-family: monospace; font-size: 12px; max-height: 200px; overflow: auto;">
    <div>
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <a href="/api/r2-diagnostics" target="_blank" style="color: #66ccff;">R2 Diagnostics</a>
        <a href="/r2test" target="_blank" style="color: #66ccff;">R2 Test</a>
        <a href="/r2list" target="_blank" style="color: #66ccff;">R2 List Files</a>
        <a href="/r2upload" target="_blank" style="color: #66ccff;">R2 Upload Utility</a>
        <a href="/directr2/constants/bg.jpg" target="_blank" style="color: #66ccff;">Direct R2 Background</a>
        <a href="/directr2/portfolio/Ektar100_Mamiya6_09_15_24_11.jpg" target="_blank" style="color: #66ccff;">Direct R2 Portfolio</a>
      </div>
      
      {#if loadingDiagnostics}
        Checking R2 connection...
      {:else if r2DiagnosticError}
        <div style="color: #ff6b6b;">R2 diagnostics error: {r2DiagnosticError}</div>
      {:else if r2DiagnosticResult}
        <div style="color: {r2DiagnosticResult.r2_binding_exists ? '#6bff6b' : '#ff6b6b'}">
          R2 Bucket: {r2DiagnosticResult.r2_binding_exists ? 'Connected ✓' : 'Not Connected ✗'}
        </div>
        {#if r2DiagnosticResult.r2_bucket_test}
          <div>
            API Test: {r2DiagnosticResult.r2_bucket_test.success ? 'Success ✓' : 'Failed ✗'} 
            {#if !r2DiagnosticResult.r2_bucket_test.success && r2DiagnosticResult.r2_bucket_test.error}
              - {r2DiagnosticResult.r2_bucket_test.error}
            {/if}
          </div>
        {/if}
        
        {#if r2DiagnosticResult.methods_available}
          <div style="margin-top: 8px;">
            <div>Available R2 Methods:</div>
            <div style="font-size: 11px; margin-left: 8px;">
              {Object.keys(r2DiagnosticResult.methods_available).join(', ')}
            </div>
          </div>
        {/if}
        
        {#if r2DiagnosticResult.r2_fetch_test?.attempted}
          <div style="margin-top: 8px;">
            <div>
              R2 Fetch API: {r2DiagnosticResult.r2_fetch_test.success ? 'Available ✓' : 'Unavailable ✗'}
              {#if !r2DiagnosticResult.r2_fetch_test.success && r2DiagnosticResult.r2_fetch_test.error}
                - {r2DiagnosticResult.r2_fetch_test.error}
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<MainContent bind:this={mainContent} />
