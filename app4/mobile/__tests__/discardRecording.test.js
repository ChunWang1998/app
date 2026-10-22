import fs from 'fs';
import path from 'path';
import {
  discardRecordingUri,
  isMissingFileError,
  stopAndDiscardCache,
} from '../src/lib/discardRecording';

function missingErr(message = 'File not found') {
  const err = new Error(message);
  err.code = 'ENOENT';
  return err;
}

describe('isMissingFileError', () => {
  it('recognizes common missing-file shapes', () => {
    expect(isMissingFileError(missingErr())).toBe(true);
    expect(isMissingFileError({ code: 'FileNotFound', message: 'gone' })).toBe(true);
    expect(isMissingFileError(new Error('Directory not exist'))).toBe(true);
    expect(isMissingFileError(new Error('permission denied'))).toBe(false);
    expect(isMissingFileError(null)).toBe(false);
  });
});

describe('discardRecordingUri', () => {
  it('no-ops on empty uri and does not call deleteAsync', async () => {
    const del = jest.fn(async () => {});
    expect(await discardRecordingUri(null, del)).toBe(false);
    expect(await discardRecordingUri('', del)).toBe(false);
    expect(await discardRecordingUri('   ', del)).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes with idempotent: true', async () => {
    const del = jest.fn(async () => {});
    expect(await discardRecordingUri('file:///tmp/rec.m4a', del)).toBe(true);
    expect(del).toHaveBeenCalledWith('file:///tmp/rec.m4a', { idempotent: true });
  });

  it('ignores missing-file errors', async () => {
    const del = jest.fn(async () => {
      throw missingErr();
    });
    await expect(discardRecordingUri('file:///tmp/gone.m4a', del)).resolves.toBe(false);
  });

  it('does not throw when deleteAsync rejects for other reasons', async () => {
    const del = jest.fn(async () => {
      throw new Error('EACCES');
    });
    await expect(discardRecordingUri('file:///tmp/rec.m4a', del)).resolves.toBe(false);
  });
});

describe('stopAndDiscardCache', () => {
  it('stops an active recorder then deletes uri', async () => {
    const del = jest.fn(async () => {});
    const recorder = {
      uri: 'file:///tmp/a.m4a',
      isRecording: true,
      stop: jest.fn(async () => {
        recorder.isRecording = false;
      }),
    };
    await stopAndDiscardCache(recorder, del);
    expect(recorder.stop).toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith('file:///tmp/a.m4a', { idempotent: true });
  });

  it('deletes leftover uri when not recording (before start / after stop)', async () => {
    const del = jest.fn(async () => {});
    const recorder = { uri: 'file:///tmp/leftover.m4a', isRecording: false, stop: jest.fn() };
    await stopAndDiscardCache(recorder, del);
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith('file:///tmp/leftover.m4a', { idempotent: true });
  });

  it('deletes uri assigned only after stop()', async () => {
    const del = jest.fn(async () => {});
    const recorder = {
      uri: null,
      isRecording: true,
      stop: jest.fn(async () => {
        recorder.isRecording = false;
        recorder.uri = 'file:///tmp/after-stop.m4a';
      }),
    };
    await stopAndDiscardCache(recorder, del);
    expect(del).toHaveBeenCalledWith('file:///tmp/after-stop.m4a', { idempotent: true });
  });

  it('still deletes when stop() throws, ignoring missing files', async () => {
    const del = jest.fn(async () => {
      throw missingErr();
    });
    const recorder = {
      uri: 'file:///tmp/x.m4a',
      isRecording: true,
      stop: jest.fn(async () => {
        throw new Error('already stopped');
      }),
      pause: jest.fn(),
    };
    await expect(stopAndDiscardCache(recorder, del)).resolves.toBe(false);
    expect(del).toHaveBeenCalled();
  });

  it('no-ops when recorder has no uri', async () => {
    const del = jest.fn(async () => {});
    await stopAndDiscardCache({ uri: null, isRecording: false }, del);
    expect(del).not.toHaveBeenCalled();
  });
});

describe('useMetering cleanup call sites', () => {
  it('discards cache before start, on stop, and on unmount', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/hooks/useMetering.js'), 'utf8');
    expect(src).toMatch(/import \{ stopAndDiscardCache \} from '\.\.\/lib\/discardRecording'/);
    expect(src).toMatch(/const start = useCallback\(async \(\) => \{[\s\S]*await stopAndDiscardCache\(recorder\)[\s\S]*prepareToRecordAsync/);
    expect(src).toMatch(/const stopRecorder = useCallback\(async \(\) => \{[\s\S]*await stopAndDiscardCache\(recorder\)/);
    expect(src).toMatch(/useEffect\(\(\) => \(\) => \{[\s\S]*stopRecorder\(\)/);
  });
});
