import type { R2Bucket, KVNamespace, ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';

interface Env {
  // Binding for the R2 bucket containing the images
  R2_BUCKET: R2Bucket;
  // Binding for the KV namespace to store dimensions
  IMAGE_DIMS_KV: KVNamespace;
}

// Define the structure for storing dimensions in KV
interface ImageDimensions {
  width: number;
  height: number;
}

// Path within the R2 bucket to scan for images
const IMAGE_FOLDER_PATH = 'photos/mainImages/';

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[${new Date(event.scheduledTime).toISOString()}] Running scheduled image dimension extraction...`);

    try {
      // 1. List existing keys in KV (representing processed images)
      const kvListResponse = await env.IMAGE_DIMS_KV.list({ prefix: IMAGE_FOLDER_PATH });
      const processedImageKeys = new Set(kvListResponse.keys.map(k => k.name));
      console.log(`Found ${processedImageKeys.size} images already processed in KV.`);

      // 2. List objects in R2 Bucket folder
      const r2Objects = await env.R2_BUCKET.list({ prefix: IMAGE_FOLDER_PATH });
      console.log(`Found ${r2Objects.objects.length} total objects in R2 folder: ${IMAGE_FOLDER_PATH}`);

      let processedCount = 0;
      const processingPromises: Promise<void>[] = [];

      // 3. Identify and process new/unprocessed images
      for (const obj of r2Objects.objects) {
        // Skip if already processed or if it's a 'folder' object
        if (!obj.key.endsWith('/') && !processedImageKeys.has(obj.key)) {
          // Limit concurrent processing to avoid overwhelming resources
          // Simple approach: process sequentially within the loop for clarity,
          // but could be optimized with Promise.allSettled and concurrency limits.
          
          processingPromises.push(
              (async () => {
                try {
                  console.log(`Processing new image: ${obj.key}`);
                  const r2Object = await env.R2_BUCKET.get(obj.key);

                  if (!r2Object) {
                    console.warn(`Could not retrieve object ${obj.key} from R2.`);
                    return;
                  }
                    
                  // *** Actual Dimension Extraction Logic ***
                  let dimensions: ImageDimensions | null = null;
                  try {
                    const contentType = r2Object.httpMetadata?.contentType?.toLowerCase();
                    const fileExtension = obj.key.split('.').pop()?.toLowerCase();
                    
                    // Read the first ~32KB, which should be enough for headers
                    const reader = r2Object.body.getReader();
                    let receivedLength = 0;
                    const chunks = [];
                    const maxBytes = 32 * 1024;
                    while (receivedLength < maxBytes) {
                      const { done, value } = await reader.read();
                      if (done || !value) {
                        break;
                      }
                      chunks.push(value);
                      receivedLength += value.length;
                      // Optimization: If we have enough bytes for a specific format, 
                      // we could potentially break early, but 32KB is generally safe.
                    }
                    reader.releaseLock(); // Release lock ASAP
                    // Combine the chunks into a single buffer
                    const buffer = new Uint8Array(receivedLength);
                    let position = 0;
                    for (const chunk of chunks) {
                      buffer.set(chunk, position);
                      position += chunk.length;
                    }
                    
                    // Determine type and parse
                    if (contentType === 'image/jpeg' || (!contentType && fileExtension === 'jpg') || (!contentType && fileExtension === 'jpeg')) {
                      dimensions = parseJpegDimensions(buffer);
                    } else if (contentType === 'image/png' || (!contentType && fileExtension === 'png')) {
                      dimensions = parsePngDimensions(buffer);
                    } else {
                      console.warn(`  Unsupported content type or extension for ${obj.key}: ${contentType || fileExtension}`);
                    }
                  } catch (parseError) {
                     console.error(`  Error parsing dimensions for ${obj.key}:`, parseError instanceof Error ? parseError.message : String(parseError));
                     dimensions = null; // Ensure dimensions is null on error
                  }

                  // *** End of Dimension Extraction Logic ***

                  if (dimensions) {
                    // Store dimensions in KV, using the R2 object key as the KV key
                    await env.IMAGE_DIMS_KV.put(obj.key, JSON.stringify(dimensions));
                    console.log(`  Stored dimensions for ${obj.key}: ${dimensions.width}x${dimensions.height}`);
                    processedCount++;
                  } else {
                    console.warn(`  Could not extract dimensions for ${obj.key}. Skipping.`);
                  }
                } catch (err) {
                  console.error(`  Error processing image ${obj.key}:`, err instanceof Error ? err.message : String(err));
                }
              })()
          );
        }
      }
      
      // Wait for all processing promises to settle
      await Promise.allSettled(processingPromises);

      console.log(`Scheduled task finished. Processed ${processedCount} new images.`);

    } catch (error) {
      console.error('Error during scheduled image dimension extraction:', error instanceof Error ? error.message : String(error));
      // Depending on the error, you might want to throw it to indicate failure
      // throw error;
    }
  },
};

// --- Dimension Parsing Helpers ---

function parsePngDimensions(buffer: Uint8Array): ImageDimensions | null {
  // Check PNG signature
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47 ||
      buffer[4] !== 0x0D || buffer[5] !== 0x0A || buffer[6] !== 0x1A || buffer[7] !== 0x0A) {
    console.warn('  Not a valid PNG file (invalid signature).');
    return null;
  }

  // Find IHDR chunk (usually the first chunk)
  // Chunk structure: 4 bytes length, 4 bytes type ('IHDR'), data, 4 bytes CRC
  let offset = 8;
  while (offset < buffer.length) {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
    const length = view.getUint32(0, false); // Network byte order (big-endian)
    const type = String.fromCharCode(view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7));

    if (type === 'IHDR') {
      if (offset + 8 + length > buffer.length) {
        console.warn('  Found IHDR chunk but not enough data in buffer.');
        return null; // Not enough data for the full chunk
      }
      const ihdrView = new DataView(buffer.buffer, buffer.byteOffset + offset + 8);
      const width = ihdrView.getUint32(0, false);
      const height = ihdrView.getUint32(4, false);
      return { width, height };
    }

    // Move to the next chunk (length + type + data + crc)
    offset += 4 + 4 + length + 4;
    if (offset < 0) break; // Avoid infinite loop on corrupt data
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

  let offset = 2;
  while (offset < buffer.length) {
    // Find next marker (starts with 0xFF)
    if (buffer[offset] !== 0xFF) {
       console.warn(`  Expected JPEG marker (0xFF) at offset ${offset}, found ${buffer[offset].toString(16)}.`);
      return null; // Not a valid marker structure
    }

    const marker = buffer[offset + 1];
    offset += 2;

    // Skip fill bytes (0xFF) if any
    while (marker === 0xFF) {
        if (offset >= buffer.length) return null; // Reached end unexpectedly
        // marker = buffer[offset++]; // This line seems wrong, should check buffer[offset] === 0xFF and increment offset
        if (buffer[offset] !== 0xFF) break; // Found start of actual marker data or next marker
        offset++;
    }
    if (marker === 0xFF) continue; // Found consecutive 0xFF, continue search
    if (offset >= buffer.length) return null; // Reached end unexpectedly
    
    // Check for Start of Frame (SOF) markers (SOF0, SOF1, SOF2 common)
    // SOF markers contain dimension info
    if (marker >= 0xC0 && marker <= 0xC3) { // SOF0, SOF1, SOF2, SOF3
       if (offset + 7 > buffer.length) { // Need at least 7 bytes for length, precision, height, width
           console.warn(' Found SOF marker but not enough data in buffer.');
           return null;
       }
      const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
      const length = view.getUint16(0, false); // Big-endian
      // const precision = view.getUint8(2);
      const height = view.getUint16(3, false);
      const width = view.getUint16(5, false);
      return { width, height };
    }

    // Check for markers without size fields (RSTm, SOI, EOI, TEM)
    if ((marker >= 0xD0 && marker <= 0xD9) || marker === 0x01 || marker === 0xD8 || marker === 0xD9) {
      // These markers have no length field, just continue to the next marker
      continue; 
    } 
    
    // For other markers, read the length field and skip the segment
    if (offset + 2 > buffer.length) {
        console.warn(' Reached end of buffer while looking for segment length.');
        return null;
    }
    const length = new DataView(buffer.buffer, buffer.byteOffset + offset).getUint16(0, false); // Big-endian
    offset += length; // Move offset past this segment (length includes the 2 bytes for the length field itself)
  }

  console.warn('  SOF marker not found within the read buffer.');
  return null;
}

// Removed placeholder helper function 