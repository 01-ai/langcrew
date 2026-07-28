import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const LOSSLESS_EXTENSIONS = new Set(['.png', '.webp']);
const SKIPPED_LOSSY_EXTENSIONS = new Set(['.jpg', '.jpeg']);
const SUPPORTED_EXTENSIONS = new Set([...LOSSLESS_EXTENSIONS, ...SKIPPED_LOSSY_EXTENSIONS]);

function runGit(args) {
  return execFileSync('git', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
}

function parseNullSeparatedList(output) {
  return output
    .split('\0')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCandidateFiles() {
  const cliFiles = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (cliFiles.length > 0) {
    return cliFiles;
  }

  return parseNullSeparatedList(runGit(['ls-files', '-z']));
}

function normalizeFilePath(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);
  return path.relative(ROOT_DIR, absolutePath);
}

function isSupportedImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(extension);
}

async function optimizeImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (SKIPPED_LOSSY_EXTENSIONS.has(extension)) {
    // JPEG re-encoding is lossy by default, so keep original quality unchanged.
    return { status: 'skipped-lossy' };
  }

  const absolutePath = path.join(ROOT_DIR, filePath);
  const originalBuffer = await fs.readFile(absolutePath);
  const pipeline = sharp(originalBuffer, { animated: true });

  if (typeof pipeline.keepMetadata === 'function') {
    pipeline.keepMetadata();
  }

  const optimizedBuffer =
    extension === '.png'
      ? await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer()
      : await pipeline.webp({ lossless: true, effort: 6 }).toBuffer();

  if (optimizedBuffer.length >= originalBuffer.length) {
    return {
      status: 'unchanged',
      beforeSize: originalBuffer.length,
      afterSize: optimizedBuffer.length,
    };
  }

  await fs.writeFile(absolutePath, optimizedBuffer);

  return {
    status: 'compressed',
    beforeSize: originalBuffer.length,
    afterSize: optimizedBuffer.length,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

async function main() {
  const files = [...new Set(getCandidateFiles().map(normalizeFilePath))]
    .filter(Boolean)
    .filter(isSupportedImage);

  if (files.length === 0) {
    console.log('No matching images to compress.');
    return;
  }

  const updatedFiles = [];
  const skippedLossyFiles = [];
  let savedBytes = 0;

  for (const filePath of files) {
    try {
      const result = await optimizeImage(filePath);

      if (result.status === 'compressed') {
        updatedFiles.push(filePath);
        savedBytes += result.beforeSize - result.afterSize;
        console.log(`compressed ${filePath} (${formatBytes(result.beforeSize)} -> ${formatBytes(result.afterSize)})`);
      } else if (result.status === 'skipped-lossy') {
        skippedLossyFiles.push(filePath);
        console.log(`skipped ${filePath} (jpeg lossless optimization is disabled)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`failed ${filePath}: ${message}`);
    }
  }

  console.log(
    `done: ${updatedFiles.length} compressed, ${skippedLossyFiles.length} skipped, saved ${formatBytes(savedBytes)}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
