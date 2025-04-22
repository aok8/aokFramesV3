const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const INPUT_DIR = path.resolve(__dirname, 'input');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const WEBP_QUALITY = 80;
// Accept jpg, png, webp for input, convert all to webp
const EXT_REGEX = /\.(jpe?g|png|webp)$/i;

async function convertImagesToWebp() {
  console.log('Starting image conversion to WebP...');
  try {
    await fs.ensureDir(OUTPUT_DIR);
    const files = await fs.readdir(INPUT_DIR);

    for (const file of files) {
      if (EXT_REGEX.test(file)) {
        const inputPath = path.join(INPUT_DIR, file);
        const baseName = path.basename(file, path.extname(file));
        const outputPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

        try {
          console.log(`Converting ${file} -> WebP...`);
          await sharp(inputPath)
            .webp({ quality: WEBP_QUALITY })
            .toFile(outputPath);

          console.log(`✔ Saved: ${path.relative(__dirname, outputPath)}`);
        } catch (err) {
          console.error(`✘ Error processing ${file}:`, err.message);
        }
      } else {
        console.log(`Skipping non-image file: ${file}`);
      }
    }
    console.log('Image conversion finished.');
  } catch (error) {
    console.error('Error during image conversion:', error);
  }
}

convertImagesToWebp(); 