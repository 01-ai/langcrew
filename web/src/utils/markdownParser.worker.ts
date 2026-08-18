import { MarkdownBlockParser, type MarkdownBlock } from './markdownBlockParser';
import * as Comlink from 'comlink';

/**
 * Markdown parser inside the worker
 * Parse large Markdown off the main thread
 */
export class MarkdownParserWorker {
  /**
   * Parse Markdown
   */
  parse(content: string, onProgress?: (progress: number) => void): MarkdownBlock[] {
    try {
      // Mock progress
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

  /**
   * Stream parse: process large files in batches
   */
  async parseInChunks(
    content: string,
    chunkSize: number = 10000,
    onProgress?: (progress: number, blocks: MarkdownBlock[]) => void,
  ): Promise<MarkdownBlock[]> {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const allBlocks: MarkdownBlock[] = [];
    let processedLines = 0;

    // Process in chunks
    for (let i = 0; i < totalLines; i += chunkSize) {
      const chunkLines = lines.slice(i, Math.min(i + chunkSize, totalLines));
      const chunkContent = chunkLines.join('\n');

      try {
        const chunkBlocks = MarkdownBlockParser.parse(chunkContent);

        // Adjust the line-number offset
        const adjustedBlocks = chunkBlocks.map((block) => ({
          ...block,
          id: `chunk-${i}-${block.id}`,
          startLine: block.startLine + i,
          endLine: block.endLine + i,
        }));

        allBlocks.push(...adjustedBlocks);
      } catch (error) {
        console.error(`Failed to parse chunk ${i}:`, error);
      }

      processedLines += chunkLines.length;

      // Report progress
      if (onProgress) {
        onProgress(processedLines / totalLines, allBlocks);
      }

      // Yield so we do not block for too long
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return allBlocks;
  }
}

// Export the worker interface
Comlink.expose(new MarkdownParserWorker());
