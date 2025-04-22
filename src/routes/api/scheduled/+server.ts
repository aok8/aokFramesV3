import type { RequestHandler } from '@sveltejs/kit';
import type { KVNamespace } from '@cloudflare/workers-types';

// Define the structure for storing dimensions in KV
interface ImageDimensions {
  width: number;
  height: number;
}

// Path prefixes within the R2 bucket to scan for images
const IMAGE_FOLDER_PATHS = [
  'portfolio/w320/',
  'portfolio/w640/', 
  'portfolio/w1024/',
  'portfolio/w1920/',
  'portfolio/' // Legacy path for backward compatibility
];

// Allow GET requests for testing - returns status only, doesn't run the job
export const GET: RequestHandler = async ({ platform, request }) => {
  try {
    console.log(`[${new Date().toISOString()}] GET request to /api/scheduled`);
    
    if (!platform?.env?.IMAGE_DIMS_KV) {
      return new Response('KV namespace not available', { status: 500 });
    }
    
    // Instead of checking just one prefix, count images from all responsive folders
    let totalProcessedCount = 0;
    const folderCounts = {};
    
    for (const folderPrefix of IMAGE_FOLDER_PATHS) {
      // List existing keys in KV for this folder
      const kvListResponse = await platform.env.IMAGE_DIMS_KV.list({ prefix: folderPrefix });
      const folderCount = kvListResponse.keys.length;
      // @ts-ignore - This is fine for the response 
      folderCounts[folderPrefix] = folderCount;
      totalProcessedCount += folderCount;
    }

    console.log(`Found ${totalProcessedCount} total processed images across all folders in KV storage.`);

    // Return status with folder-specific counts
    return new Response(JSON.stringify({
      status: 'ready',
      message: 'Use POST to run the job',
      processed_images: totalProcessedCount,
      folder_counts: folderCounts
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      } 
    });
  }
};

// This endpoint will run the image dimension extraction process
// and can be triggered via a cron job or manually
export const POST: RequestHandler = async ({ platform, request }) => {
  try {
    console.log(`[${new Date().toISOString()}] POST request to /api/scheduled from ${request.headers.get('User-Agent')}`);
    
    // Ensure platform is defined
    if (!platform) {
      console.error('Platform not available');
      return new Response(JSON.stringify({ 
        status: 'error',
        message: 'Platform not available'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure necessary bindings are available
    if (!platform.env?.IMAGE_DIMS_KV || !platform.env?.R2_BUCKET) {
      console.error('Missing required bindings:', {
        has_kv: !!platform.env?.IMAGE_DIMS_KV,
        has_r2: !!platform.env?.R2_BUCKET,
        env_keys: Object.keys(platform.env || {})
      });
      
      return new Response(JSON.stringify({ 
        status: 'error',
        message: 'Required KV or R2 bindings not available',
        available: Object.keys(platform.env || {})
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for an API key or other authentication (optional)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && !isValidAuthToken(authHeader)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    console.log(`Running scheduled image dimension extraction...`);
    
    // Process each folder path
    let totalProcessedCount = 0;
    let totalExistingCount = 0;
    let totalImageCount = 0;
    const folderResults = {};
    
    for (const folderPath of IMAGE_FOLDER_PATHS) {
      console.log(`Processing folder: ${folderPath}`);
      
      // 1. List existing keys in KV for this folder (representing processed images)
      const kvListResponse = await platform.env.IMAGE_DIMS_KV.list({ prefix: folderPath });
      const processedImageKeys = new Set(kvListResponse.keys.map(k => k.name));
      console.log(`Found ${processedImageKeys.size} images already processed in KV for folder ${folderPath}.`);
      totalExistingCount += processedImageKeys.size;
      
      // 2. List all image objects in the R2 bucket for this folder
      const r2ListResponse = await platform.env.R2_BUCKET.list({
        prefix: folderPath,
      });
      
      console.log(`Found ${r2ListResponse.objects.length} images in R2 for folder ${folderPath}.`);
      totalImageCount += r2ListResponse.objects.length;
      
      // 3. Filter the images to process (only those not already in KV)
      const imagesToProcess = r2ListResponse.objects.filter(obj => {
        // Skip non-image files
        const key = obj.key;
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
          return false;
        }
        
        // Skip already processed images
        if (processedImageKeys.has(key)) {
          return false;
        }
        
        return true;
      });
      
      console.log(`Found ${imagesToProcess.length} new images to process for folder ${folderPath}.`);
      
      // 4. Process each image and extract dimensions
      let folderProcessedCount = 0;
      const maxBytesToRead = 65536; // Read up to 64KB to find dimensions
      
      for (const obj of imagesToProcess) {
        try {
          console.log(`Processing image ${obj.key}...`);
          
          // Get content type to determine image format
          const r2Object = await platform.env.R2_BUCKET.head(obj.key);
          
          if (!r2Object) {
            console.error(`  Object not found: ${obj.key}`);
            continue;
          }
          
          const contentType = r2Object.httpMetadata?.contentType || '';
          const fileExtension = obj.key.split('.').pop()?.toLowerCase();
          
          // Read the first 64KB of the file to determine dimensions
          // This is usually enough for image headers
          const r2Range = await platform.env.R2_BUCKET.get(obj.key);
          
          if (!r2Range) {
            console.error(`  Failed to read object: ${obj.key}`);
            continue;
          }
          
          console.log(`Reading up to ${maxBytesToRead} bytes from ${obj.key} to find dimensions`);
          // Only read the first maxBytesToRead bytes
          const buffer = await r2Range.arrayBuffer();
          const slicedBuffer = buffer.slice(0, maxBytesToRead);
          
          // Safety check for empty files
          if (slicedBuffer.byteLength === 0) {
            console.error(`  Empty file: ${obj.key}`);
            continue;
          }
          
          // Convert to Uint8Array for working with the binary data
          const bytes = new Uint8Array(slicedBuffer);
          
          // Extract dimensions based on image format
          let dimensions: ImageDimensions | null = null;
          
          try {
            if (contentType.includes('jpeg') || fileExtension === 'jpg' || fileExtension === 'jpeg') {
              console.log(`Parsing JPEG dimensions for ${obj.key}`);
              dimensions = parseJpegDimensions(bytes);
            } else if (contentType.includes('png') || fileExtension === 'png') {
              console.log(`Parsing PNG dimensions for ${obj.key}`);
              dimensions = parsePngDimensions(bytes);
            } else if (contentType.includes('webp') || fileExtension === 'webp') {
              console.log(`Parsing WebP dimensions for ${obj.key}`);
              dimensions = parseWebPDimensions(bytes);
            } else {
              console.warn(`  Unsupported image format: ${contentType || fileExtension}`);
            }
          } catch (parseError) {
            console.error(`  Error parsing dimensions for ${obj.key}:`, parseError instanceof Error ? parseError.message : String(parseError));
            console.error(`  Stack trace:`, parseError instanceof Error ? parseError.stack : 'No stack trace available');
            dimensions = null; // Ensure dimensions is null on error
          }
          
          if (dimensions) {
            // Check for wide aspect ratio (greater than 1.8:1)
            if (dimensions.width / dimensions.height > 1.8) {
              console.log(`  ⚠️ Wide image detected: ${obj.key} (${dimensions.width}x${dimensions.height}, ratio: ${(dimensions.width / dimensions.height).toFixed(2)})`);
            }
            
            // Store dimensions in KV, using the R2 object key as the KV key
            await platform.env.IMAGE_DIMS_KV.put(obj.key, JSON.stringify(dimensions));
            console.log(`  Stored dimensions for ${obj.key}: ${dimensions.width}x${dimensions.height}`);
            folderProcessedCount++;
            totalProcessedCount++;
          } else {
            console.warn(`  Could not extract dimensions for ${obj.key}. Skipping.`);
            
            // Additional debug info for the failed image
            try {
              // Try to get file size and other info
              const fileInfo = {
                key: obj.key,
                size: r2Object.size,
                contentType: contentType || 'unknown',
                extension: fileExtension || 'unknown',
                httpMetadata: r2Object.httpMetadata || {}
              };
              console.error(`  Failed image details:`, JSON.stringify(fileInfo));
            } catch (infoError) {
              console.error('  Could not get file info:', infoError);
            }
          }
        } catch (err) {
          console.error(`  Error processing image ${obj.key}:`, err instanceof Error ? err.message : String(err));
        }
      }
      
      console.log(`Successfully processed ${folderProcessedCount} out of ${imagesToProcess.length} images for folder ${folderPath}.`);
      // @ts-ignore - This is fine for the response
      folderResults[folderPath] = {
        total: r2ListResponse.objects.length,
        existing: processedImageKeys.size,
        processed: folderProcessedCount
      };
    }
    
    // Log overall results
    console.log(`Total processed: ${totalProcessedCount}, Total existing: ${totalExistingCount}, Total in R2: ${totalImageCount}`);
    
    // Return success response with stats
    return new Response(JSON.stringify({
      status: 'success',
      message: `Processed ${totalProcessedCount} images`,
      processed: totalProcessedCount,
      existing: totalExistingCount,
      total: totalImageCount,
      folders: folderResults
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing images:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// Helper function to validate auth token
function isValidAuthToken(authHeader: string): boolean {
  // Implement your token validation logic here
  // For example, check against an environment variable or a predefined token
  // return authHeader === 'Bearer ' + process.env.API_SECRET;
  
  // For simplicity, we'll return true here
  return true;
}

// Parser for PNG dimensions
function parsePngDimensions(buffer: Uint8Array): ImageDimensions | null {
  // PNG files start with an 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
  // Followed by a series of chunks, each having:
  // - 4 bytes: chunk length
  // - 4 bytes: chunk type
  // - content bytes (as specified by length)
  // - 4 bytes: CRC
  
  // Check if the buffer is large enough to contain the PNG header and IHDR chunk
  if (buffer.length < 24) {
    console.error('Buffer too small for PNG header');
    return null;
  }
  
  // Verify PNG signature
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== signature[i]) {
      console.error('Invalid PNG signature');
      return null;
    }
  }
  
  // The first chunk should be IHDR
  const ihdrType = [0x49, 0x48, 0x44, 0x52]; // "IHDR"
  for (let i = 0; i < 4; i++) {
    if (buffer[i + 12] !== ihdrType[i]) {
      console.error('First chunk is not IHDR');
      return null;
    }
  }
  
  // Extract width from bytes 16-19 (big-endian)
  const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
  // Extract height from bytes 20-23 (big-endian)
  const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
  
  // Get bit depth and color type for better debugging
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  
  console.log(`  Parsed dimensions: ${width}x${height} (bit depth: ${bitDepth}, color type: ${colorType})`);
  
  if (width <= 0 || height <= 0 || width > 50000 || height > 50000) {
    console.error(`  Invalid dimensions: ${width}x${height}`);
    return null;
  }
  
  return { width, height };
}

// Parser for JPEG dimensions
function parseJpegDimensions(buffer: Uint8Array): ImageDimensions | null {
  // JPEG files start with SOI marker (0xFFD8)
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    console.error('Invalid JPEG signature');
    return null;
  }
  
  let offset = 2; // Skip SOI marker
  let width = 0;
  let height = 0;
  let foundSOF = false; // Start of Frame marker found
  let precision = 0;
  
  // Loop through markers in the JPEG file
  while (offset < buffer.length - 1) {
    // A valid marker must begin with 0xFF
    if (buffer[offset] !== 0xFF) {
      offset++;
      continue;
    }
    
    const marker = buffer[offset + 1];
    offset += 2;
    
    // Skip padding bytes (0xFF 0x00)
    if (marker === 0x00) {
      continue;
    }
    
    // End of Image marker
    if (marker === 0xD9) {
      break;
    }
    
    // For markers without a length field
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD8)) {
      continue;
    }
    
    // Check for Start of Frame markers that contain dimensions
    // SOF0 (Baseline DCT), SOF1 (Extended Sequential DCT), SOF2 (Progressive DCT)
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      // Marker content length is a 2-byte value
      if (offset + 8 > buffer.length) {
        console.error('Buffer too small for SOF marker');
        return null;
      }
      
      const length = (buffer[offset] << 8) | buffer[offset + 1];
      offset += 2;
      
      if (offset + length - 2 > buffer.length) {
        console.error('SOF marker data exceeds buffer');
        return null;
      }
      
      precision = buffer[offset]; // Sample precision
      height = (buffer[offset + 1] << 8) | buffer[offset + 2];
      width = (buffer[offset + 3] << 8) | buffer[offset + 4];
      
      foundSOF = true;
      break; // We have the dimensions, no need to continue
    }
    
    // Skip over this marker to the next one
    if (offset + 2 > buffer.length) {
      break;
    }
    
    const length = (buffer[offset] << 8) | buffer[offset + 1];
    offset += length;
  }
  
  if (!foundSOF) {
    console.error('No Start of Frame marker found in JPEG');
    return null;
  }
  
  console.log(`  Parsed dimensions: ${width}x${height} (precision: ${precision})`);
  
  if (width <= 0 || height <= 0 || width > 50000 || height > 50000) {
    console.error(`  Invalid dimensions: ${width}x${height}`);
    return null;
  }
  
  return { width, height };
}

// Parser for WebP dimensions
function parseWebPDimensions(buffer: Uint8Array): ImageDimensions | null {
  // Check for WebP signature "RIFF" + filesize + "WEBP"
  if (buffer.length < 16 || 
      buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46 || // "RIFF"
      buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50) { // "WEBP"
    console.error('Invalid WebP signature');
    return null;
  }
  
  // Check for VP8 (lossy) or VP8L (lossless) or VP8X (extended) chunks
  if (buffer.length >= 30 && buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
    // Simple lossy WebP (VP8)
    // Width is stored at offset 26-27 and height at offset 28-29, both 16-bit little-endian values
    // Width and height are 14-bit values, i.e., masked with 0x3FFF
    const width = ((buffer[27] << 8) | buffer[26]) & 0x3FFF;
    const height = ((buffer[29] << 8) | buffer[28]) & 0x3FFF;
    return { width, height };
  } else if (buffer.length >= 25 && buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) {
    // Lossless WebP (VP8L)
    // Width and height are encoded as (value-1) in 14-bit values at offset 21 
    const bits = (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
    const width = (bits & 0x3FFF) + 1;
    const height = ((bits >> 14) & 0x3FFF) + 1;
    return { width, height };
  } else if (buffer.length >= 30 && buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
    // Extended WebP (VP8X)
    // Width and height (actually, subtract 1 from the stored values) are at 24-29 as 24-bit little-endian values
    const width = ((buffer[24] << 0) | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
    const height = ((buffer[27] << 0) | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
    return { width, height };
  }
  
  console.error('Unsupported WebP format or corrupted file');
  return null;
} 