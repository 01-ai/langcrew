import { describe, it, expect } from 'vitest';
import { appendQueryParam, getFileExtension } from '../parser';

describe('getFileExtension', () => {
  it('Extract General URL Extension and convert to lowercase', () => {
    expect(getFileExtension('https://example.com/file.JPG')).toBe('jpg');
  });

  it('ignores query parameters and hash fragments', () => {
    expect(getFileExtension('https://example.com/archive.tar.gz?v=1#top')).toBe('gz');
  });

  it('Supports file paths containing multi-level directories', () => {
    expect(getFileExtension('/var/log/app/output.log')).toBe('log');
  });

  it('Return empty string when no extension', () => {
    expect(getFileExtension('https://example.com/download/latest')).toBe('');
  });

  it('Point in First Character (Hide File) Return empty string', () => {
    expect(getFileExtension('.env')).toBe('');
  });

  it('Process non-string or empty input', () => {
    expect(getFileExtension(undefined)).toBe('');
    expect(getFileExtension(123 as any)).toBe('');
  });

  it('Only the last paragraph of multiple extensions is returned for', () => {
    expect(getFileExtension('backup.latest.tar.gz')).toBe('gz');
  });

  it('Decoding URL Encoded Filename', () => {
    expect(getFileExtension('https://example.com/My%20File.PDF')).toBe('pdf');
  });

  it('URL Back to original filename when decode failed', () => {
    expect(getFileExtension('https://example.com/file%EF%zz.txt')).toBe('txt');
  });

  it('returns the extension when the path uses backslash separators', () => {
    expect(getFileExtension('C:\\\\Users\\\\demo\\\\document.docx')).toBe('docx');
  });
});

describe('appendQueryParam', () => {
  it('Keep the signature when adding parameters URL Original Encoding for', () => {
    const url =
      'https://example.com/%E6%9D%A1%E4%BB%B6.csv?Signature=abc%2Bdef%3D&Expires=1780478446';

    expect(appendQueryParam(url, 'size', 123)).toBe(
      'https://example.com/%E6%9D%A1%E4%BB%B6.csv?Signature=abc%2Bdef%3D&Expires=1780478446&size=123',
    );
  });

  it('preserves the hash fragment when adding parameters', () => {
    expect(appendQueryParam('https://example.com/file.csv#preview', 'size', 123)).toBe(
      'https://example.com/file.csv?size=123#preview',
    );
  });
});
