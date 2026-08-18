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
 * Build inline worker source
 * Turn worker source into a blob URL (avoids bundler path issues)
 */
function createWorkerBlob(): string {
  // Worker source string
  const workerCode = `
    // Import Comlink (CDN or inline)
    importScripts('https://unpkg.com/comlink@4.4.1/dist/umd/comlink.js');
    
    // Inline MarkdownBlockParser core
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

          // Detect a code block
          if (trimmedLine.startsWith('\`\`\`')) {
            if (!inCodeBlock) {
              // Start a code block
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

          // Inside a code block
          if (inCodeBlock) {
            currentBlock.push(line);
            continue;
          }

          // Detect a heading
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

          // Detect a table
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
            // Table end
            blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
            inTable = false;
            currentBlock = [line];
            currentType = 'paragraph';
            startLine = i;
            continue;
          }

          // Detect a list
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

          // Detect a quote
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

          // Detect a blank line
          if (trimmedLine === '') {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, startLine, i - 1, currentType));
              currentBlock = [];
              startLine = i + 1;
              currentType = 'paragraph';
            }
            continue;
          }

          // Normal paragraph
          currentBlock.push(line);
          if (currentType !== 'paragraph' && currentType !== 'list' && currentType !== 'blockquote') {
            currentType = 'paragraph';
          }
        }

        // Handle the last block
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

    // Worker class
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

    // Expose the worker interface
    Comlink.expose(new MarkdownParserWorker());
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Worker manager
 * Create, manage, and destroy the Web Worker
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private workerProxy: Comlink.Remote<MarkdownParserWorkerType> | null = null;
  private workerBlobUrl: string | null = null;

  /**
   * Initialize the worker
   */
  async initWorker(): Promise<void> {
    if (this.worker) {
      return; // Already initialized
    }

    try {
      // Create an inline worker
      this.workerBlobUrl = createWorkerBlob();
      this.worker = new Worker(this.workerBlobUrl);

      // Wrap the worker with Comlink
      this.workerProxy = Comlink.wrap<MarkdownParserWorkerType>(this.worker);
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Parse Markdown in a worker
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
   * Stream-parse large files
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
   * Destroy the worker
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

// Singleton worker manager
let workerManagerInstance: WorkerManager | null = null;

/**
 * Get the worker-manager singleton
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}

/**
 * Whether Web Workers are available
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}
