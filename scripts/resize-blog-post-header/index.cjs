const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const INPUT_DIR = path.resolve(__dirname, 'input');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 80;
const EXT_REGEX = /\.jpe?g$/i; // Only process JPG/JPEG files

async function resizeBlogPostHeaderImages() {
  console.log('Starting blog post header image processing...');
  try {
    await fs.ensureDir(OUTPUT_DIR);
    const files = await fs.readdir(INPUT_DIR);

    for (const file of files) {
      if (EXT_REGEX.test(file)) {
        const inputPath = path.join(INPUT_DIR, file);
        const baseName = path.basename(file, path.extname(file));
        const outputPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

        try {
          const image = sharp(inputPath);
          const metadata = await image.metadata();

          if (metadata.width > MAX_WIDTH) {
            console.log(`Resizing ${file} (width: ${metadata.width}) -> ${MAX_WIDTH}px width...`);
            await image
              .resize({ width: MAX_WIDTH }) // height adjusted automatically
              .webp({ quality: WEBP_QUALITY })
              .toFile(outputPath);
          } else {
            console.log(`Converting ${file} (width: ${metadata.width}) -> WebP (no resize needed)...`);
            await image
              .webp({ quality: WEBP_QUALITY })
              .toFile(outputPath);
          }
          console.log(`✔ Saved: ${path.relative(__dirname, outputPath)}`);
        } catch (err) {
          console.error(`✘ Error processing ${file}:`, err.message);
        }
      } else {
        console.log(`Skipping non-JPEG file: ${file}`);
      }
    }
    console.log('Blog post header image processing finished.');
  } catch (error) {
    console.error('Error during blog post header image processing:', error);
  }
}

resizeBlogPostHeaderImages(); 