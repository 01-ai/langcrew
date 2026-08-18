import { describe, it, expect } from 'vitest';
import { appendQueryParam, getFileExtension } from '../parser';

describe('getFileExtension', () => {
  it('extracts a regular URL extension and lowercases it', () => {
    expect(getFileExtension('https://example.com/file.JPG')).toBe('jpg');
  });

  it('ignores query params and hash fragments', () => {
    expect(getFileExtension('https://example.com/archive.tar.gz?v=1#top')).toBe('gz');
  });

  it('supports nested file paths', () => {
    expect(getFileExtension('/var/log/app/output.log')).toBe('log');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getFileExtension('https://example.com/download/latest')).toBe('');
  });

  it('returns empty string when the dot is the first character (hidden file)', () => {
    expect(getFileExtension('.env')).toBe('');
  });

  it('handles non-string or empty input', () => {
    expect(getFileExtension(undefined)).toBe('');
    expect(getFileExtension(123 as any)).toBe('');
  });

  it('returns only the last segment for multi-dot extensions', () => {
    expect(getFileExtension('backup.latest.tar.gz')).toBe('gz');
  });

  it('decodes a URL-encoded filename', () => {
    expect(getFileExtension('https://example.com/My%20File.PDF')).toBe('pdf');
  });

  it('falls back to the original filename when URL decode fails', () => {
    expect(getFileExtension('https://example.com/file%EF%zz.txt')).toBe('txt');
  });

  it('still returns an extension when the path uses backslashes', () => {
    expect(getFileExtension('C:\\\\Users\\\\demo\\\\document.docx')).toBe('docx');
  });
});

describe('appendQueryParam', () => {
  it('keeps original encoding of a signed URL when appending params', () => {
    const url =
      'https://example.com/%E6%9D%A1%E4%BB%B6.csv?Signature=abc%2Bdef%3D&Expires=1780478446';

    expect(appendQueryParam(url, 'size', 123)).toBe(
      'https://example.com/%E6%9D%A1%E4%BB%B6.csv?Signature=abc%2Bdef%3D&Expires=1780478446&size=123',
    );
  });

  it('keeps the hash fragment when appending params', () => {
    expect(appendQueryParam('https://example.com/file.csv#preview', 'size', 123)).toBe(
      'https://example.com/file.csv?size=123#preview',
    );
  });
});
