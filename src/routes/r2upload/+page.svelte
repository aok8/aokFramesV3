<script lang="ts">
  import { onMount } from 'svelte';
  
  // Interface for required files
  interface RequiredFile {
    key: string;
    title: string;
    status: 'checking' | 'exists' | 'missing' | 'error';
    error?: string;
  }
  
  // Required files check
  const requiredFiles: RequiredFile[] = [
    { key: 'constants/bg.jpg', title: 'Background Image', status: 'checking' },
    { key: 'constants/Profile_Pic.jpg', title: 'Profile Picture', status: 'checking' },
    { key: 'portfolio/Ektar100_Mamiya6_09_15_24_11.jpg', title: 'Portfolio Image 1', status: 'checking' },
    { key: 'portfolio/Portra800_R4m_01_03_25_11.jpg', title: 'Portfolio Image 2', status: 'checking' },
    { key: 'portfolio/Acrosii_Bessa_09_12_23_1.jpg', title: 'Portfolio Image 3', status: 'checking' }
  ];
  
  let loading = true;
  let error: string | null = null;
  
  let r2Status = "Checking R2 access...";
  let checkedCount = 0;
  let existingCount = 0;
  
  onMount(async () => {
    try {
      // First, check if R2 is accessible at all
      const diagResponse = await fetch('/api/r2-diagnostics');
      if (!diagResponse.ok) {
        error = `Failed to access R2 diagnostics: ${diagResponse.status} ${diagResponse.statusText}`;
        return;
      }
      
      const diagResult = await diagResponse.json();
      if (!diagResult.r2_binding_exists) {
        r2Status = "R2 bucket binding is not configured correctly.";
        error = "The R2 bucket is not properly bound to your application. Please check Cloudflare Pages settings.";
        requiredFiles.forEach(file => file.status = 'error');
        return;
      }
      
      r2Status = "R2 bucket is connected. Checking individual files...";
      
      // Check each file individually
      const checkPromises = requiredFiles.map(async (file) => {
        try {
          // Try to request the file through our directr2 endpoint
          const response = await fetch(`/directr2/${file.key}`);
          
          // Update the file status based on response
          if (response.ok) {
            file.status = 'exists';
            existingCount++;
          } else {
            file.status = 'missing';
          }
          
          // Update the checked count
          checkedCount++;
          updateStatus();
        } catch (fileError) {
          file.status = 'error';
          file.error = fileError instanceof Error ? fileError.message : String(fileError);
          checkedCount++;
          updateStatus();
        }
      });
      
      // Wait for all checks to complete
      await Promise.all(checkPromises);
      
      // Final status update
      if (existingCount === requiredFiles.length) {
        r2Status = `All required files are present in the R2 bucket.`;
      } else {
        r2Status = `Found ${existingCount} of ${requiredFiles.length} required files. Please upload the missing files.`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      r2Status = "Error checking R2 bucket.";
    } finally {
      loading = false;
    }
  });
  
  function updateStatus() {
    if (existingCount === requiredFiles.length) {
      r2Status = `All required files are present in the R2 bucket.`;
    } else {
      r2Status = `Checked ${checkedCount} of ${requiredFiles.length} files. Found ${existingCount} so far.`;
    }
  }
</script>

<div class="container">
  <h1>R2 Bucket Setup Utility</h1>
  
  <div class="status-box">
    <h2>R2 Bucket Status</h2>
    <p>{r2Status}</p>
    
    {#if loading}
      <div class="loading">Checking files... {checkedCount}/{requiredFiles.length}</div>
    {/if}
    
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
              {#if file.status === 'checking'}
                ⏳ Checking...
              {:else if file.status === 'exists'}
                ✅ Found
              {:else if file.status === 'missing'}
                ❌ Missing
              {:else}
                ⚠️ Error: {file.error || 'Unknown error'}
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
      <h3>Important R2 Usage Notes:</h3>
      <ul>
        <li>Cloudflare Pages with R2 has some limitations - not all R2 methods (like list or getKeys) are available</li>
        <li>However, the core methods like get, put, and delete work properly</li>
        <li>Make sure to upload your files using the exact paths shown in the table above</li>
        <li>The folder structure is important - ensure constants/ and portfolio/ prefixes are used</li>
      </ul>
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
  
  .loading {
    background: #e3f2fd;
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
    color: #0d47a1;
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
  
  .checking {
    color: #3498db;
  }
  
  .error {
    color: #e67e22;
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