import { MarkdownBlockParser, type MarkdownBlock } from './markdownBlockParser';
import * as Comlink from 'comlink';

/**
 * Worker Medium Markdown Parser
 * For the analysis of large sizes in the back-line process Markdown Documentation
 */
export class MarkdownParserWorker {
  /**
   * Parsing Markdown Contents
   */
  parse(content: string, onProgress?: (progress: number) => void): MarkdownBlock[] {
    try {
      // Simulation progress report
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
   * Streaming Resolution: Split Large Files
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

    // Part Process
    for (let i = 0; i < totalLines; i += chunkSize) {
      const chunkLines = lines.slice(i, Math.min(i + chunkSize, totalLines));
      const chunkContent = chunkLines.join('\n');

      try {
        const chunkBlocks = MarkdownBlockParser.parse(chunkContent);

        // Adjust line offset
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

      // Reporting on progress
      if (onProgress) {
        onProgress(processedLines / totalLines, allBlocks);
      }

      // Get out of control and avoid a long time of jamming.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return allBlocks;
  }
}

// Export Worker Interface
Comlink.expose(new MarkdownParserWorker());
