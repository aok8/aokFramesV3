import type { RequestHandler } from '@sveltejs/kit';
import type { KVNamespace } from '@cloudflare/workers-types';

// Define the structure for storing dimensions in KV
interface ImageDimensions {
  width: number;
  height: number;
}

// Path within the R2 bucket to scan for images
const IMAGE_FOLDER_PATH = 'portfolio/';

// Allow GET requests for testing - returns status only, doesn't run the job
export const GET: RequestHandler = async ({ platform, request }) => {
  try {
    console.log(`[${new Date().toISOString()}] GET request to /api/scheduled`);
    
    if (!platform?.env?.IMAGE_DIMS_KV) {
      return new Response('KV namespace not available', { status: 500 });
    }

    // List existing keys in KV to get count
    const kvListResponse = await platform.env.IMAGE_DIMS_KV.list({ prefix: IMAGE_FOLDER_PATH });
    const processedCount = kvListResponse.keys.length;
    console.log(`Found ${processedCount} processed images in KV storage.`);

    // Return status only
    return new Response(JSON.stringify({
      status: 'ready',
      message: 'Use POST to run the job',
      processed_images: processedCount
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

    // 1. List existing keys in KV (representing processed images)
    const kvListResponse = await platform.env.IMAGE_DIMS_KV.list({ prefix: IMAGE_FOLDER_PATH });
    const processedImageKeys = new Set(kvListResponse.keys.map(k => k.name));
    console.log(`Found ${processedImageKeys.size} images already processed in KV.`);

    // 2. List objects in R2 Bucket folder
    const r2Objects = await platform.env.R2_BUCKET.list({ prefix: IMAGE_FOLDER_PATH });
    console.log(`Found ${r2Objects.objects.length} total objects in R2 folder: ${IMAGE_FOLDER_PATH}`);

    // Filter out already processed images and 'folder' objects
    const imagesToProcess = r2Objects.objects.filter(obj => 
      !obj.key.endsWith('/') && !processedImageKeys.has(obj.key)
    );
    
    console.log(`Found ${imagesToProcess.length} new images to process.`);
    
    // Process images sequentially to avoid type issues
    let processedCount = 0;
    for (const obj of imagesToProcess) {
      try {
        console.log(`Processing image: ${obj.key}`);
        const r2Object = await platform.env.R2_BUCKET.get(obj.key);

        if (!r2Object) {
          console.warn(`Could not retrieve object ${obj.key} from R2.`);
          continue;
        }
          
        // *** Actual Dimension Extraction Logic ***
        let dimensions: ImageDimensions | null = null;
        const contentType = r2Object.httpMetadata?.contentType?.toLowerCase();
        const fileExtension = obj.key.split('.').pop()?.toLowerCase();
        
        try {
          // Read at least 300KB to ensure we can find the SOF marker in files with lots of metadata
          const reader = r2Object.body.getReader();
          let receivedLength = 0;
          const chunks = [];
          const maxBytes = 300 * 1024; // Increased to 300KB to capture more of the file
          console.log(`Reading up to ${maxBytes} bytes from ${obj.key} to find dimensions`);
          while (receivedLength < maxBytes) {
            const { done, value } = await reader.read();
            if (done || !value) {
              break;
            }
            chunks.push(value);
            receivedLength += value.length;
          }
          reader.releaseLock(); // Release lock ASAP
          
          console.log(`Read ${receivedLength} bytes from ${obj.key}`);
          
          // Combine the chunks into a single buffer
          const buffer = new Uint8Array(receivedLength);
          let position = 0;
          for (const chunk of chunks) {
            buffer.set(chunk, position);
            position += chunk.length;
          }
          
          // Debug: show content type and extension for troubleshooting
          console.log(`Processing ${obj.key} - Content type: ${contentType}, Extension: ${fileExtension}, Size: ${r2Object.size} bytes`);
          
          // Determine type and parse
          if (contentType === 'image/jpeg' || (!contentType && fileExtension === 'jpg') || (!contentType && fileExtension === 'jpeg')) {
            console.log(`Parsing JPEG dimensions for ${obj.key}`);
            dimensions = parseJpegDimensions(buffer);
          } else if (contentType === 'image/png' || (!contentType && fileExtension === 'png')) {
            console.log(`Parsing PNG dimensions for ${obj.key}`);
            dimensions = parsePngDimensions(buffer);
          } else {
            console.warn(`  Unsupported content type or extension for ${obj.key}: ${contentType || fileExtension}`);
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
          processedCount++;
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
    
    // Log detailed results
    console.log(`Successfully processed ${processedCount} out of ${imagesToProcess.length} images.`);

    return new Response(JSON.stringify({
      status: 'success',
      processed: processedCount,
      total: r2Objects.objects.length,
      existing: processedImageKeys.size
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error during scheduled image dimension extraction:', error instanceof Error ? error.message : String(error));
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

// Simple auth token validation (replace with your own logic)
function isValidAuthToken(authHeader: string): boolean {
  // Add your authentication logic here, e.g., check against an environment variable
  // This is just a placeholder implementation
  const token = authHeader.replace('Bearer ', '');
  return token === 'your-secret-token-here';
}

// --- Dimension Parsing Helpers ---

function parsePngDimensions(buffer: Uint8Array): ImageDimensions | null {
  // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  
  // For debugging - show the first few bytes
  const firstBytes = Array.from(buffer.slice(0, Math.min(20, buffer.length)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`  First bytes: ${firstBytes}`);
  
  // Verify signature
  for (let i = 0; i < pngSignature.length; i++) {
    if (i >= buffer.length || buffer[i] !== pngSignature[i]) {
      console.warn('  Not a valid PNG file (invalid signature).');
      return null;
    }
  }

  console.log('  PNG signature valid, searching for IHDR chunk...');

  // Find IHDR chunk (should be the first chunk)
  // Chunk structure: 4 bytes length, 4 bytes type ('IHDR'), data, 4 bytes CRC
  let offset = 8; // Start after signature
  
  while (offset + 12 <= buffer.length) { // Need at least 12 bytes for chunk header + minimum data
    // Read chunk length (4 bytes)
    const lengthBytes = [buffer[offset], buffer[offset+1], buffer[offset+2], buffer[offset+3]];
    const length = (lengthBytes[0] << 24) | (lengthBytes[1] << 16) | (lengthBytes[2] << 8) | lengthBytes[3];
    
    // Read chunk type (4 bytes)
    const type = String.fromCharCode(buffer[offset+4], buffer[offset+5], buffer[offset+6], buffer[offset+7]);
    
    console.log(`  Found chunk: ${type}, length: ${length} at offset ${offset}`);
    
    if (type === 'IHDR') {
      // IHDR must be at least 13 bytes (width=4, height=4, bit depth=1, color type=1, compression=1, filter=1, interlace=1)
      if (length < 13) {
        console.warn(`  IHDR chunk too small: ${length} bytes`);
        return null;
      }
      
      // Check if we have enough data for the full chunk
      if (offset + 8 + length > buffer.length) {
        console.warn(`  IHDR chunk found but not enough data in buffer. Need ${offset + 8 + length} bytes, have ${buffer.length}.`);
        return null;
      }
      
      // Read width and height (4 bytes each)
      const widthBytes = [buffer[offset+8], buffer[offset+9], buffer[offset+10], buffer[offset+11]];
      const width = (widthBytes[0] << 24) | (widthBytes[1] << 16) | (widthBytes[2] << 8) | widthBytes[3];
      
      const heightBytes = [buffer[offset+12], buffer[offset+13], buffer[offset+14], buffer[offset+15]];
      const height = (heightBytes[0] << 24) | (heightBytes[1] << 16) | (heightBytes[2] << 8) | heightBytes[3];
      
      // Additional data (not strictly needed but useful for debugging)
      const bitDepth = buffer[offset+16]; // 1, 2, 4, 8, or 16
      const colorType = buffer[offset+17]; // 0, 2, 3, 4, 6
      
      console.log(`  Parsed dimensions: ${width}x${height} (bit depth: ${bitDepth}, color type: ${colorType})`);
      
      return { width, height };
    }
    
    // Move to the next chunk (length + type + data + crc)
    offset += 4 + 4 + length + 4;
    
    // Safety check to avoid infinite loops
    if (offset < 0 || offset > buffer.length) {
      console.warn(`  Invalid chunk offset: ${offset}`);
      break;
    }
  }

  console.warn('  IHDR chunk not found within the read buffer.');
  return null;
}

function parseJpegDimensions(buffer: Uint8Array): ImageDimensions | null {
  // Check JPEG SOI marker
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    console.warn('  Not a valid JPEG file (invalid SOI marker).');
    return null;
  }

  console.log('  JPEG signature valid, searching for dimension markers...');
  
  let offset = 2;
  let markerFound = false;
  
  // For debugging - show the first few bytes
  const firstBytes = Array.from(buffer.slice(0, Math.min(20, buffer.length)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`  First bytes: ${firstBytes}`);
  
  while (offset < buffer.length) {
    // Find next marker (starts with 0xFF)
    if (buffer[offset] !== 0xFF) {
      console.warn(`  Expected JPEG marker (0xFF) at offset ${offset}, found ${buffer[offset].toString(16)}. Moving to next byte.`);
      offset++;
      continue;
    }

    // Skip padding bytes (0xFF)
    while (offset < buffer.length && buffer[offset] === 0xFF) {
      offset++;
    }
    
    // Check if we reached the end
    if (offset >= buffer.length) {
      console.warn('  Reached end of buffer unexpectedly.');
      return null;
    }
    
    // Read marker
    const marker = buffer[offset];
    offset++;
    
    console.log(`  Found marker: 0x${marker.toString(16)} at offset ${offset-1}`);
    
    // Check for Start of Frame (SOF) markers that contain dimensions
    if (marker >= 0xC0 && marker <= 0xC3) { // SOF0, SOF1, SOF2, SOF3
      markerFound = true;
      console.log(`  Found SOF marker: 0x${marker.toString(16)}`);
      
      // Need at least 7 more bytes for length(2), precision(1), height(2), width(2)
      if (offset + 7 > buffer.length) {
        console.warn('  Found SOF marker but not enough data in buffer.');
        return null;
      }
      
      // Get segment length (includes the 2 bytes for length itself)
      const lengthBytes = [buffer[offset], buffer[offset+1]];
      const length = (lengthBytes[0] << 8) + lengthBytes[1];
      console.log(`  SOF segment length: ${length}`);
      
      // Skip length bytes
      offset += 2;
      
      // Get precision (1 byte)
      const precision = buffer[offset];
      offset += 1;
      
      // Get height and width (2 bytes each)
      const heightBytes = [buffer[offset], buffer[offset+1]];
      const height = (heightBytes[0] << 8) + heightBytes[1];
      offset += 2;
      
      const widthBytes = [buffer[offset], buffer[offset+1]];
      const width = (widthBytes[0] << 8) + widthBytes[1];
      
      console.log(`  Parsed dimensions: ${width}x${height} (precision: ${precision})`);
      return { width, height };
    }
    
    // If not SOF, skip this segment using the length field
    if (marker !== 0xD8 && marker !== 0xD9 && marker !== 0x01 && !(marker >= 0xD0 && marker <= 0xD7)) {
      // These markers have a length field
      if (offset + 2 > buffer.length) {
        console.warn('  Reached end of buffer while looking for segment length.');
        return null;
      }
      
      // Get segment length (includes the 2 bytes for length itself)
      const lengthBytes = [buffer[offset], buffer[offset+1]];
      const length = (lengthBytes[0] << 8) + lengthBytes[1];
      console.log(`  Skipping segment with marker 0x${marker.toString(16)}, length ${length}`);
      
      // Skip the segment
      offset += length;
    } else {
      // Marker without length field
      console.log(`  Marker 0x${marker.toString(16)} has no length field, continuing search.`);
    }
  }

  if (!markerFound) {
    console.warn('  No SOF marker found within the buffer.');
  }
  return null;
} 