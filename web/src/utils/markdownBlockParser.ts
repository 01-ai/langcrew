export interface MarkdownBlock {
  id: string;
  type: string;
  content: string;
  startLine: number;
  endLine: number;
  estimatedHeight?: number;
}

/**
 * Markdown Block Parser
 * Split with simple regular expression to avoid being in Worker Use DOM Dependency AST Parsing
 */
export class MarkdownBlockParser {
  /**
   * Parsing Markdown Content is block array
   * Use simple line analysis strategy, not dependent unified/remark
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

        // Detect the code block
        if (trimmedLine.startsWith('```')) {
          if (inCodeBlock) {
            // End of code block
            currentBlock.push(line);
            blocks.push(this.createBlock(currentBlock, blockStartLine, i, 'code'));
            currentBlock = [];
            blockStartLine = i + 1;
            inCodeBlock = false;
          } else {
            // Code Block Start
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

        // Add directly to the code block
        if (inCodeBlock) {
          currentBlock.push(line);
          continue;
        }

        // Test Table
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
          // Table End
          blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, 'table'));
          currentBlock = [];
          blockStartLine = i;
          inTable = false;
          currentType = 'paragraph';
        }

        // Detecting Title
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

        // Test the partition line
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

        // , and then click the %1
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

        // Test Reference
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

        // Empty line: End the current block
        if (trimmedLine === '') {
          if (currentBlock.length > 0) {
            blocks.push(this.createBlock(currentBlock, blockStartLine, i - 1, currentType));
            currentBlock = [];
            currentType = 'paragraph';
          }
          blockStartLine = i + 1;
          continue;
        }

        // Normal
        currentBlock.push(line);
      }

      // Add Last Block
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
   * Create Block Object
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
   * Height of estimation blocks (pixels)
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
   * Decreasing Resolution: Split By Paragraph
   * When? AST Use when parsing failed
   */
  private static fallbackParse(content: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = content.split('\n');
    let currentBlock: string[] = [];
    let blockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Empty Line as Separator
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

    // Add Last Block
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
 * Calculate file size and lines
 */
export function getContentStats(content: string): {
  sizeInBytes: number;
  lineCount: number;
  shouldUseVirtual: boolean;
  parseStrategy: 'direct' | 'main-thread' | 'worker' | 'stream';
} {
  const sizeInBytes = new Blob([content]).size;
  const lineCount = content.split('\n').length;

  // Which policy to use depending on the file size
  let shouldUseVirtual = false;
  let parseStrategy: 'direct' | 'main-thread' | 'worker' | 'stream' = 'direct';

  if (sizeInBytes < 1024 * 1024) {
    // < 1MB: Direct Rendering
    shouldUseVirtual = false;
    parseStrategy = 'direct';
  } else if (sizeInBytes < 5 * 1024 * 1024) {
    // 1-5 MB: main-thread parsing with virtual scrolling.
    shouldUseVirtual = true;
    parseStrategy = 'main-thread';
  } else if (sizeInBytes < 20 * 1024 * 1024) {
    // 5-20MB: Worker Parsing + Virtual Scroll
    shouldUseVirtual = true;
    parseStrategy = 'worker';
  } else {
    // > 20 MB: streaming parsing.
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
