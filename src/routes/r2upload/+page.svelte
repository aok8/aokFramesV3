<script lang="ts">
  import { onMount } from 'svelte';
  
  // Track the R2 bucket structure
  interface BucketFile {
    key: string;
    size?: number;
    uploaded?: string;
  }

  // Interface for required files
  interface RequiredFile {
    key: string;
    title: string;
    status?: 'missing' | 'exists';
  }
  
  // Required files check
  const requiredFiles: RequiredFile[] = [
    { key: 'constants/bg.jpg', title: 'Background Image' },
    { key: 'constants/Profile_Pic.jpg', title: 'Profile Picture' },
    { key: 'portfolio/Ektar100_Mamiya6_09_15_24_11.jpg', title: 'Portfolio Image 1' },
    { key: 'portfolio/Portra800_R4m_01_03_25_11.jpg', title: 'Portfolio Image 2' },
    { key: 'portfolio/Acrosii_Bessa_09_12_23_1.jpg', title: 'Portfolio Image 3' }
  ];
  
  let bucketFiles: BucketFile[] = [];
  let loading = true;
  let error: string | null = null;
  
  let bucketListResult: any = null;
  let r2Status = "Checking R2 bucket...";
  
  onMount(async () => {
    try {
      // Get list of files in the R2 bucket
      const response = await fetch('/r2list');
      if (!response.ok) {
        error = `Failed to list R2 files: ${response.status} ${response.statusText}`;
        return;
      }
      
      bucketListResult = await response.json();
      
      if (bucketListResult.error) {
        r2Status = `Error accessing R2 bucket: ${bucketListResult.error}`;
      } else if (!bucketListResult.bucket_contents?.objects?.length) {
        r2Status = "R2 bucket appears to be empty. You need to upload the required files.";
      } else {
        r2Status = `R2 bucket contains ${bucketListResult.bucket_contents.objects.length} files.`;
        
        // Get the list of files currently in the bucket
        bucketFiles = bucketListResult.bucket_contents.objects;
        
        // Check for required files
        for (const required of requiredFiles) {
          const existingFile = bucketFiles.find(f => f.key === required.key);
          required.status = existingFile ? 'exists' : 'missing';
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  });
</script>

<div class="container">
  <h1>R2 Bucket Setup Utility</h1>
  
  <div class="status-box">
    <h2>R2 Bucket Status</h2>
    <p>{r2Status}</p>
    
    {#if error}
      <div class="error-message">
        Error: {error}
      </div>
    {/if}
  </div>
  
  <div class="required-files">
    <h2>Required Files</h2>
    <p>Your website needs the following files in the R2 bucket:</p>
    
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each requiredFiles as file}
          <tr>
            <td>{file.key}</td>
            <td class={file.status}>
              {#if file.status === 'exists'}
                ✅ Found
              {:else}
                ❌ Missing
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  <div class="guidance">
    <h2>How to Upload Files to R2</h2>
    
    <div class="guidance-section">
      <h3>1. Using Cloudflare Dashboard:</h3>
      <ol>
        <li>Go to <a href="https://dash.cloudflare.com/" target="_blank">Cloudflare Dashboard</a></li>
        <li>Select <strong>R2</strong> from the left menu</li>
        <li>Click on your bucket: <strong>aokframes-website-assets</strong></li>
        <li>Use the <strong>Upload</strong> button to add files</li>
        <li>Make sure to place them in the correct folders (constants/ and portfolio/)</li>
      </ol>
    </div>
    
    <div class="guidance-section">
      <h3>2. Using Wrangler CLI:</h3>
      <ol>
        <li>Install Wrangler if you haven't already: <code>npm install -g wrangler</code></li>
        <li>Log in to Cloudflare: <code>wrangler login</code></li>
        <li>For each file, run the command:</li>
        <li><code>wrangler r2 object put aokframes-website-assets/constants/bg.jpg --file /path/to/bg.jpg</code></li>
        <li>Repeat for each required file, adjusting the paths accordingly</li>
      </ol>
    </div>
    
    <div class="guidance-section">
      <h3>3. Using Cloudflare API:</h3>
      <ol>
        <li>Set up API tokens with R2 access in the Cloudflare dashboard</li>
        <li>Use the R2 API to upload objects as outlined in the <a href="https://developers.cloudflare.com/r2/api/workers/workers-api-reference/" target="_blank">Cloudflare R2 documentation</a></li>
      </ol>
    </div>
  </div>
  
  <div class="file-structure">
    <h2>Required File Structure</h2>
    <pre>
aokframes-website-assets/ (R2 bucket root)
├── constants/
│   ├── bg.jpg
│   └── Profile_Pic.jpg
└── portfolio/
    ├── Ektar100_Mamiya6_09_15_24_11.jpg
    ├── Portra800_R4m_01_03_25_11.jpg
    └── ... (other portfolio images)
    </pre>
  </div>
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1 {
    color: #2c3e50;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
  }
  
  h2 {
    color: #3498db;
    margin-top: 30px;
  }
  
  .status-box {
    background: #f8f9fa;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }
  
  th, td {
    padding: 10px;
    border: 1px solid #ddd;
    text-align: left;
  }
  
  th {
    background-color: #f2f2f2;
  }
  
  .exists {
    color: #2ecc71;
  }
  
  .missing {
    color: #e74c3c;
  }
  
  .guidance-section {
    background: #f1f9ff;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 15px;
  }
  
  code {
    background: #f1f1f1;
    padding: 3px 5px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
  }
  
  pre {
    background: #f8f8f8;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
  }
  
  a {
    color: #3498db;
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
</style> 