import {
  IMPORT_MAX_BYTES,
  finiteSize,
  utf8ByteLength,
  resolveImportSize,
  importSizeError,
} from '../src/data/importLimit';

describe('import size limit', () => {
  it('is 1MB', () => {
    expect(IMPORT_MAX_BYTES).toBe(1024 * 1024);
  });

  it('prefers file.size, then getInfo size, then UTF-8 length', () => {
    expect(resolveImportSize({ fileSize: 12, infoSize: 99, text: 'abcd' })).toBe(12);
    expect(resolveImportSize({ infoSize: 99, text: 'abcd' })).toBe(99);
    expect(resolveImportSize({ text: 'abcd' })).toBe(4);
    expect(resolveImportSize({})).toBeNull();
  });

  it('rejects missing size and payloads over 1MB', () => {
    expect(importSizeError(null)).toBe('無法確認檔案大小');
    expect(importSizeError(IMPORT_MAX_BYTES)).toBeNull();
    expect(importSizeError(IMPORT_MAX_BYTES + 1)).toBe('檔案太大');
  });

  it('treats non-numeric sizes as unknown', () => {
    expect(finiteSize(undefined)).toBeNull();
    expect(finiteSize('nope')).toBeNull();
    expect(finiteSize(-1)).toBeNull();
    expect(finiteSize(0)).toBe(0);
  });

  it('counts UTF-8 bytes after reading', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('項')).toBe(3);
    expect(utf8ByteLength(null)).toBeNull();
  });
});
