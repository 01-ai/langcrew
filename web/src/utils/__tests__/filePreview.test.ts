import { describe, expect, it } from 'vitest';
import { canPreviewFile, shouldFetchFileContentForPreview } from '../filePreview';

describe('canPreviewFile', () => {
  it('returns true for supported image files', () => {
    expect(canPreviewFile({ filename: 'photo.png' })).toBe(true);
    expect(canPreviewFile({ contentType: 'image/jpeg' })).toBe(true);
  });

  it('returns true for supported office files', () => {
    expect(canPreviewFile({ filename: 'report.docx' })).toBe(true);
    expect(canPreviewFile({ contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe(
      true,
    );
    expect(canPreviewFile({ detectedFileType: 'pptx' })).toBe(true);
  });

  it('returns true for pdf and text files', () => {
    expect(canPreviewFile({ filename: 'guide.pdf' })).toBe(true);
    expect(canPreviewFile({ filename: 'notes.txt' })).toBe(true);
    expect(canPreviewFile({ filename: 'data.csv' })).toBe(true);
    expect(canPreviewFile({ filename: 'script.py' })).toBe(true);
    expect(canPreviewFile({ detectedFileType: 'pdf' })).toBe(true);
  });

  it('returns true for video files', () => {
    expect(canPreviewFile({ filename: 'clip.mp4' })).toBe(true);
    expect(canPreviewFile({ contentType: 'video/webm' })).toBe(true);
  });

  it('returns false for archive and unknown binary files', () => {
    expect(canPreviewFile({ filename: 'bundle.zip' })).toBe(false);
    expect(canPreviewFile({ filename: 'archive.rar' })).toBe(false);
    expect(canPreviewFile({ filename: 'binary.exe' })).toBe(false);
    expect(canPreviewFile({ detectedFileType: 'zip' })).toBe(false);
  });
});

describe('shouldFetchFileContentForPreview', () => {
  it('skips fetch for office, image, video, and known unsupported files', () => {
    expect(shouldFetchFileContentForPreview({ filename: 'sheet.xlsx' })).toBe(false);
    expect(shouldFetchFileContentForPreview({ filename: 'photo.jpg' })).toBe(false);
    expect(shouldFetchFileContentForPreview({ filename: 'clip.mp4' })).toBe(false);
    expect(shouldFetchFileContentForPreview({ filename: 'bundle.zip' })).toBe(false);
    expect(
      shouldFetchFileContentForPreview({
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe(false);
  });

  it('fetches content for text, pdf, and extensionless files', () => {
    expect(shouldFetchFileContentForPreview({ filename: 'readme.md' })).toBe(true);
    expect(shouldFetchFileContentForPreview({ filename: 'guide.pdf' })).toBe(true);
    expect(shouldFetchFileContentForPreview({ url: 'https://example.com/file' })).toBe(true);
  });
});

describe('resolveOfficeFileTypeFromContentType', () => {
  it('maps openxml office MIME types to preview file types', async () => {
    const { resolveOfficeFileTypeFromContentType } = await import('../filePreview');

    expect(
      resolveOfficeFileTypeFromContentType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx');
    expect(
      resolveOfficeFileTypeFromContentType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe('xlsx');
    expect(
      resolveOfficeFileTypeFromContentType(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    ).toBe('pptx');
    expect(resolveOfficeFileTypeFromContentType('application/pdf')).toBeNull();
  });
});
