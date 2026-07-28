import * as Comlink from 'comlink';
import type { MarkdownBlock } from './markdownBlockParser';

export type MarkdownParserWorkerType = {
  parse(content: string, onProgress?: (progress: number) => void): MarkdownBlock[];
  parseInChunks(
    content: string,
    chunkSize?: number,
    onProgress?: (progress: number, blocks: MarkdownBlock[]) => void,
  ): Promise<MarkdownBlock[]>;
};

/**
 * Create Inline Worker Code
 * Will Worker Code Convert to Blob URL，Avoid Packing Paths
 */
function createWorkerBlob(): string {
  // Worker Code String
  const workerCode = `
    // Import Comlink（Needs from CDN (or in-link)
    importScripts('https://unpkg.com/comlink@4.4.1/dist/umd/comlink.js');
    
    // Inner association MarkdownBlockParser Core logic
    class MarkdownBlockParser {
      static parse(content) {
        const lines = content.split('\\n');
        const blocks = [];
        let currentBlock = [];
        let currentType = 'paragraph';
        let startLine = 0;
        let inCodeBlock = false;
        let codeBlockLang = '';
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Block Test
          if (trimmedLine.startsWith('\`\`\`')) {
            if (!inCodeBlock) {
              // Start the code block
              if (currentBlock.length > 0) {
                blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              }
              inCodeBlock = true;
              codeBlockLang = trimmedLine.slice(3).trim();
              currentBlock = [line];
              currentType = 'code';
              startLine = i;
            } else {
              // End the code block
              currentBlock.push(line);
              blocks.push(this.createBlock(currentBlock, startLine, i, currentType));
              inCodeBlock = false;
              currentBlock = [];
              startLine = i + 1;
            }
            continue;
          }

          // In the code block.
          if (inCodeBlock) {
            currentBlock.push(line);
            continue;
          }

          // Title Detection
          const headingMatch = line.match(/^(#{1,6})\\s+(.+)$/);
          if (headingMatch) {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
            }
            blocks.push(this.createBlock([line], i, i, 'heading'));
            currentBlock = [];
            startLine = i + 1;
            inTable = false;
            continue;
          }

          // Table Testing
          if (trimmedLine.includes('|')) {
            if (!inTable) {
              if (currentBlock.length > 0) {
                blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              }
              inTable = true;
              currentBlock = [line];
              currentType = 'table';
              startLine = i;
            } else {
              currentBlock.push(line);
            }
            continue;
          } else if (inTable) {
            // Table End
            blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
            inTable = false;
            currentBlock = [line];
            currentType = 'paragraph';
            startLine = i;
            continue;
          }

          // List Test
          const listMatch = line.match(/^(\\s*)([-*+]|\\d+\\.)\\s+(.+)$/);
          if (listMatch) {
            if (currentType !== 'list') {
              if (currentBlock.length > 0) {
                blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              }
              currentBlock = [line];
              currentType = 'list';
              startLine = i;
            } else {
              currentBlock.push(line);
            }
            continue;
          }

          // Reference Test
          if (trimmedLine.startsWith('>')) {
            if (currentType !== 'blockquote') {
              if (currentBlock.length > 0) {
                blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              }
              currentBlock = [line];
              currentType = 'blockquote';
              startLine = i;
            } else {
              currentBlock.push(line);
            }
            continue;
          }

          // Empty Line Detection
          if (trimmedLine === '') {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              currentBlock = [];
              startLine = i + 1;
              currentType = 'paragraph';
            }
            continue;
          }

          // Normal Paragraph
          currentBlock.push(line);
          if (currentType !== 'paragraph' && currentType !== 'list' && currentType !== 'blockquote') {
            currentType = 'paragraph';
          }
        }

        // Handle the last piece
        if (currentBlock.length > 0) {
          blocks.push(this.createBlock(currentBlock, startLine, lines.length - 1, currentType));
        }

        return blocks;
      }

      static createBlock(lines, startLine, endLine, type) {
        const content = lines.join('\\n');
        const height = this.estimateBlockHeight(type, content);
        return {
          id: \`block-\${startLine}-\${endLine}\`,
          type,
          content,
          startLine,
          endLine,
          estimatedHeight: height,
        };
      }

      static estimateBlockHeight(type, content) {
        const baseLineHeight = 24;
        const lines = content.split('\\n').length;

        switch (type) {
          case 'heading':
            return 40 + baseLineHeight;
          case 'code':
            return Math.max(lines * 20 + 40, 100);
          case 'table':
            return Math.max(lines * 35 + 20, 100);
          case 'list':
            return lines * 28 + 10;
          case 'blockquote':
            return lines * 26 + 20;
          default:
            return lines * baseLineHeight + 10;
        }
      }
    }

    // Worker Category
    class MarkdownParserWorker {
      parse(content, onProgress) {
        try {
          if (onProgress) {
            onProgress(0.3);
          }

          const blocks = MarkdownBlockParser.parse(content);

          if (onProgress) {
            onProgress(1);
          }

          return blocks;
        } catch (error) {
          console.error('Worker parsing error:', error);
          throw error;
        }
      }

      async parseInChunks(content, chunkSize = 10000, onProgress) {
        const lines = content.split('\\n');
        const totalLines = lines.length;
        const allBlocks = [];
        let processedLines = 0;

        for (let i = 0; i < totalLines; i += chunkSize) {
          const chunkLines = lines.slice(i, Math.min(i + chunkSize, totalLines));
          const chunkContent = chunkLines.join('\\n');

          try {
            const chunkBlocks = MarkdownBlockParser.parse(chunkContent);
            const adjustedBlocks = chunkBlocks.map((block) => ({
              ...block,
              id: \`chunk-\${i}-\${block.id}\`,
              startLine: block.startLine + i,
              endLine: block.endLine + i,
            }));

            allBlocks.push(...adjustedBlocks);
          } catch (error) {
            console.error(\`Failed to parse chunk \${i}:\`, error);
          }

          processedLines += chunkLines.length;

          if (onProgress) {
            onProgress(processedLines / totalLines, allBlocks);
          }

          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        return allBlocks;
      }
    }

    // Exposure Worker Interface
    Comlink.expose(new MarkdownParserWorker());
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Worker Manager
 * Responsible for creation, management and destruction Web Worker
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private workerProxy: Comlink.Remote<MarkdownParserWorkerType> | null = null;
  private workerBlobUrl: string | null = null;

  /**
   * Initialize Worker
   */
  async initWorker(): Promise<void> {
    if (this.worker) {
      return; // Initialized
    }

    try {
      // Create Inline Worker
      this.workerBlobUrl = createWorkerBlob();
      this.worker = new Worker(this.workerBlobUrl);

      // Use Comlink Packaging Worker
      this.workerProxy = Comlink.wrap<MarkdownParserWorkerType>(this.worker);
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Use Worker Parsing Markdown
   */
  async parse(content: string, onProgress?: (progress: number) => void): Promise<MarkdownBlock[]> {
    if (!this.workerProxy) {
      await this.initWorker();
    }

    if (!this.workerProxy) {
      throw new Error('Worker not initialized');
    }

    try {
      const progressCallback = onProgress ? Comlink.proxy(onProgress) : undefined;
      return await this.workerProxy.parse(content, progressCallback);
    } catch (error) {
      console.error('Worker parsing failed:', error);
      throw error;
    }
  }

  /**
   * Fluid Parsing Big File
   */
  async parseInChunks(
    content: string,
    chunkSize: number = 10000,
    onProgress?: (progress: number, blocks: MarkdownBlock[]) => void,
  ): Promise<MarkdownBlock[]> {
    if (!this.workerProxy) {
      await this.initWorker();
    }

    if (!this.workerProxy) {
      throw new Error('Worker not initialized');
    }

    try {
      const progressCallback = onProgress ? Comlink.proxy(onProgress) : undefined;
      return await this.workerProxy.parseInChunks(content, chunkSize, progressCallback);
    } catch (error) {
      console.error('Worker chunk parsing failed:', error);
      throw error;
    }
  }

  /**
   * Destruction Worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerProxy = null;
    }
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
  }
}

// Single cases Worker Manager
let workerManagerInstance: WorkerManager | null = null;

/**
 * Access Worker Manager Example
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}

/**
 * Check for support Web Worker
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}
