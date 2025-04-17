/**
 * build.js - Worker Build Script
 * 
 * This script copies worker files to the build output directory
 * for deployment alongside the main SvelteKit application.
 */

import fs from 'fs';
import path from 'path';

// Define paths
const sourceDirs = {
  scheduled: path.resolve('./src/workers/scheduled')
};

const outputDir = path.resolve('./.svelte-kit/cloudflare/workers');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created directory: ${outputDir}`);
}

// Copy scheduled worker files
console.log('Copying scheduled worker files...');
if (fs.existsSync(sourceDirs.scheduled)) {
  const files = fs.readdirSync(sourceDirs.scheduled);

  // Create output subdirectory if needed
  const scheduledOutputDir = path.join(outputDir, 'scheduled');
  if (!fs.existsSync(scheduledOutputDir)) {
    fs.mkdirSync(scheduledOutputDir, { recursive: true });
  }

  // Copy each file
  files.forEach(file => {
    const sourcePath = path.join(sourceDirs.scheduled, file);
    const destPath = path.join(scheduledOutputDir, file);
    
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${sourcePath} -> ${destPath}`);
  });
  
  console.log('Scheduled worker files copied successfully.');
} else {
  console.warn(`Warning: Scheduled worker source directory not found: ${sourceDirs.scheduled}`);
}

console.log('Worker build script completed.'); 