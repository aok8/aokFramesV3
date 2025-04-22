const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const INPUT_DIR = path.resolve(__dirname, 'input');
const OUTPUT_BASE = path.resolve(__dirname, 'output');
const WIDTHS = [1024, 1920, 3000];
const WEBP_QUALITY = 85;
const EXT_REGEX = /\.(jpe?g|png|webp)$/i; // Accept jpg, png, webp

async function processDirectory(srcDir, rel = '') {
  try {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      // Correctly calculate relative path for subdirectories
      const currentRel = path.join(rel, entry.isDirectory() ? entry.name : '');
      if (entry.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(srcPath, currentRel);
      } else if (entry.isFile() && EXT_REGEX.test(entry.name)) {
        // Process image files, passing the correct relative path `rel`
        await resizeImage(srcPath, rel, entry.name);
      }
    }
  } catch (error) {
    // Ignore errors for missing input directory, otherwise log
    if (error.code !== 'ENOENT' || !srcDir.endsWith('input')) {
        console.error(`Error reading directory ${srcDir}:`, error);
    }
  }
}

async function resizeImage(srcPath, rel, filename) {
  try {
    const img = sharp(srcPath);
    const meta = await img.metadata();
    const baseName = path.basename(filename, path.extname(filename));

    await Promise.all(
      WIDTHS.map(async (w) => {
        // Log warning if upscaling, but DO NOT skip
        if (meta.width && w >= meta.width) {
          console.log(`⚠ Upscaling ${filename} to width ${w}px (image original width: ${meta.width}px)`);
        }

        // Output directory structure mirrors input structure
        const outDir = path.join(OUTPUT_BASE, `w${w}`, rel);
        await fs.ensureDir(outDir);
        const outPath = path.join(outDir, `${baseName}.webp`);

        try {
          await img
            .clone() // Use clone to avoid modifying the original sharp instance
            .resize({ width: w }) // height adjusts automatically, will upscale if needed
            .webp({ quality: WEBP_QUALITY })
            .toFile(outPath);
          // Log relative path within the output structure
          console.log(`✔ ${path.join(`w${w}`, rel, `${baseName}.webp`)}`);
        } catch (resizeError) {
          console.error(`✘ Error resizing ${filename} to ${w}px:`, resizeError.message);
        }
      })
    );
  } catch (err) {
    console.error(`✘ Error processing ${filename}:`, err.message);
  }
}

(async () => {
  console.log('Starting general image resizing...');
  // Ensure base output directory exists
  await fs.ensureDir(OUTPUT_BASE);
  await processDirectory(INPUT_DIR);
  console.log('General image resizing finished.');
})().catch(console.error); 