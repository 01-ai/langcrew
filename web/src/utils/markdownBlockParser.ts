export interface MarkdownBlock {
  id: string;
  type: string;
  content: string;
  startLine: number;
  endLine: number;
  estimatedHeight?: number;
}

/**
 * Markdown block parser
 * Split with regex; avoid DOM-based AST in the worker
 */
export class MarkdownBlockParser {
  /**
   * Parse Markdown into blocks
   * Line-based strategy; no unified/remark
   */
  static parse(content: string): MarkdownBlock[] {
    if (!content || !content.trim()) {
      return [];
    }

    try {
      const lines = content.split('\n');
      const blocks: MarkdownBlock[] = [];
      let currentBlock: string[] = [];
      let currentType = 'paragraph';
      let blockStartLine = 0;
      let inCodeBlock = false;
      let inTable = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect code blocks
        if (trimmedLine.startsWith('```')) {
          if (inCodeBlock) {
            // Code-block end
            currentBlock.push(line);
            blocks.push(this.createBlock(currentBlock, blockStartLine, i, 'code'));
            currentBlock = [];
            blockStartLine = i + 1;
            inCodeBlock = false;
          } else {
            // Code-block start
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            }
            currentBlock = [line];
            currentType = 'code';
            blockStartLine = i;
            inCodeBlock = true;
          }
          continue;
        }

        // Inside a code block: append as-is
        if (inCodeBlock) {
          currentBlock.push(line);
          continue;
        }

        // Detect tables
        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
          if (!inTable) {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            }
            currentBlock = [];
            currentType = 'table';
            blockStartLine = i;
            inTable = true;
          }
          currentBlock.push(line);
          continue;
        } else if (inTable) {
          // Table end
          blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, 'table'));
          currentBlock = [];
          blockStartLine = i;
          inTable = false;
          currentType = 'paragraph';
        }

        // Detect headings
        if (trimmedLine.startsWith('#')) {
          if (currentBlock.length > 0) {
            blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
          }
          const level = trimmedLine.match(/^#+/)?.[0].length || 1;
          blocks.push(this.createBlock([line], i, i, `heading${level}`));
          currentBlock = [];
          blockStartLine = i + 1;
          currentType = 'paragraph';
          continue;
        }

        // Detect a thematic break
        if (/^[-*_]{3,}$/.test(trimmedLine)) {
          if (currentBlock.length > 0) {
            blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
          }
          blocks.push(this.createBlock([line], i, i, 'thematicBreak'));
          currentBlock = [];
          blockStartLine = i + 1;
          currentType = 'paragraph';
          continue;
        }

        // Detect lists
        if (/^[-*+]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine)) {
          if (currentType !== 'list') {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            }
            currentBlock = [];
            currentType = 'list';
            blockStartLine = i;
          }
          currentBlock.push(line);
          continue;
        }

        // Detect quotes
        if (trimmedLine.startsWith('>')) {
          if (currentType !== 'blockquote') {
            if (currentBlock.length > 0) {
              blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            }
            currentBlock = [];
            currentType = 'blockquote';
            blockStartLine = i;
          }
          currentBlock.push(line);
          continue;
        }

        // Blank line: end the current block
        if (trimmedLine === '') {
          if (currentBlock.length > 0) {
            blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            currentBlock = [];
            currentType = 'paragraph';
          }
          blockStartLine = i + 1;
          continue;
        }

        // Normal line
        currentBlock.push(line);
      }

      // Append the last block
      if (currentBlock.length > 0) {
        blocks.push(this.createBlock(currentBlock, blockStartLine, lines.length - 1, currentType));
      }

      return blocks.length > 0
        ? blocks
        : [
            {
              id: 'block-0',
              type: 'paragraph',
              content,
              startLine: 0,
              endLine: lines.length - 1,
              estimatedHeight: Math.max(lines.length * 24, 100),
            },
          ];
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return this.fallbackParse(content);
    }
  }

  /**
   * Create a block object
   */
  private static createBlock(lines: string[], startLine: number, endLine: number, type: string): MarkdownBlock {
    const content = lines.join('\n');
    return {
      id: `block-${startLine}-${endLine}`,
      type,
      content,
      startLine,
      endLine,
      estimatedHeight: this.estimateBlockHeight(type, content),
    };
  }

  /**
   * Estimate block height (px)
   */
  private static estimateBlockHeight(type: string, content: string): number {
    const lineCount = content.split('\n').length;

    switch (type) {
      case 'heading1':
        return 60;
      case 'heading2':
        return 50;
      case 'heading3':
        return 45;
      case 'heading4':
      case 'heading5':
      case 'heading6':
        return 40;

      case 'code':
        return Math.min(lineCount * 20 + 40, 600);

      case 'table':
        return Math.min(lineCount * 40 + 60, 800);

      case 'list':
        return lineCount * 30 + 20;

      case 'blockquote':
        return lineCount * 25 + 30;

      case 'paragraph':
        return lineCount * 24 + 16;

      case 'thematicBreak':
        return 30;

      default:
        return Math.max(lineCount * 24, 50);
    }
  }

  /**
   * Fallback: split by paragraph
   * Used when AST parse fails
   */
  private static fallbackParse(content: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = content.split('\n');
    let currentBlock: string[] = [];
    let blockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Blank lines as separators
      if (line.trim() === '') {
        if (currentBlock.length > 0) {
          blocks.push({
            id: `fallback-block-${blocks.length}`,
            type: 'paragraph',
            content: currentBlock.join('\n'),
            startLine: blockStartLine,
            endLine: i - 1,
            estimatedHeight: currentBlock.length * 24 + 16,
          });
          currentBlock = [];
        }
        blockStartLine = i + 1;
      } else {
        currentBlock.push(line);
      }
    }

    // Append the last block
    if (currentBlock.length > 0) {
      blocks.push({
        id: `fallback-block-${blocks.length}`,
        type: 'paragraph',
        content: currentBlock.join('\n'),
        startLine: blockStartLine,
        endLine: lines.length - 1,
        estimatedHeight: currentBlock.length * 24 + 16,
      });
    }

    return blocks.length > 0
      ? blocks
      : [
          {
            id: 'fallback-block-0',
            type: 'paragraph',
            content,
            startLine: 0,
            endLine: lines.length - 1,
            estimatedHeight: Math.max(lines.length * 24, 100),
          },
        ];
  }
}

/**
 * Compute file size and line count
 */
export function getContentStats(content: string): {
  sizeInBytes: number;
  lineCount: number;
  shouldUseVirtual: boolean;
  parseStrategy: 'direct' | 'main-thread' | 'worker' | 'stream';
} {
  const sizeInBytes = new Blob([content]).size;
  const lineCount = content.split('\n').length;

  // Choose a strategy by file size
  let shouldUseVirtual = false;
  let parseStrategy: 'direct' | 'main-thread' | 'worker' | 'stream' = 'direct';

  if (sizeInBytes < 1024 * 1024) {
    // < 1MB: render directly
    shouldUseVirtual = false;
    parseStrategy = 'direct';
  } else if (sizeInBytes < 5 * 1024 * 1024) {
    // 1-5MB: main-thread parse + virtual scroll
    shouldUseVirtual = true;
    parseStrategy = 'main-thread';
  } else if (sizeInBytes < 20 * 1024 * 1024) {
    // 5-20MB: worker parse + virtual scroll
    shouldUseVirtual = true;
    parseStrategy = 'worker';
  } else {
    // > 20MB: stream parse
    shouldUseVirtual = true;
    parseStrategy = 'stream';
  }

  return {
    sizeInBytes,
    lineCount,
    shouldUseVirtual,
    parseStrategy,
  };
}
