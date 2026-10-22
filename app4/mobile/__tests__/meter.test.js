import fs from 'fs';
import path from 'path';
import {
  OFFSET_BASE,
  DISPLAY_MIN,
  DISPLAY_MAX,
  OFFSET_MIN,
  OFFSET_MAX,
  DBFS_SILENCE,
  clamp,
  clampOffset,
  isValidDbfs,
  mapDbfsToDisplayDb,
  smoothLevel,
  createSession,
  addDbfsSample,
  sessionDisplayStats,
  gaugeFill,
  gaugeColor,
  formatDb,
  formatOffset,
} from '../src/lib/meter';

describe('meter module isolation', () => {
  it('does not import react, expo, or native modules', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/lib/meter.js'), 'utf8');
    expect(src).not.toMatch(/from ['"]react(?:-native)?['"]/);
    expect(src).not.toMatch(/from ['"]expo/);
    expect(src).not.toMatch(/require\(/);
  });
});

describe('clamp', () => {
  it('clamps to inclusive bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('treats non-finite as min', () => {
    expect(clamp(NaN, 0, 10)).toBe(0);
    expect(clamp(Infinity, 0, 10)).toBe(0);
    expect(clamp(-Infinity, 0, 10)).toBe(0);
    expect(clamp(undefined, 2, 8)).toBe(2);
  });
});

describe('clampOffset', () => {
  it('stays within -20..+20 and rounds to a whole dB', () => {
    expect(clampOffset(0)).toBe(0);
    expect(clampOffset(-20)).toBe(OFFSET_MIN);
    expect(clampOffset(20)).toBe(OFFSET_MAX);
    expect(clampOffset(-21)).toBe(-20);
    expect(clampOffset(21)).toBe(20);
    expect(clampOffset(1.4)).toBe(1);
    expect(clampOffset(1.5)).toBe(2);
    expect(clampOffset('3')).toBe(3);
    expect(clampOffset(NaN)).toBe(0);
    expect(clampOffset(null)).toBe(0);
  });
});

describe('mapDbfsToDisplayDb', () => {
  it('uses displayDb = clamp(dBFS + 100 + offset, 0, 140)', () => {
    expect(OFFSET_BASE).toBe(100);
    expect(DISPLAY_MIN).toBe(0);
    expect(DISPLAY_MAX).toBe(140);
    expect(mapDbfsToDisplayDb(0, 0)).toBe(100);
    expect(mapDbfsToDisplayDb(-40, 0)).toBe(60);
    expect(mapDbfsToDisplayDb(-10, 5)).toBe(95);
    expect(mapDbfsToDisplayDb(-10, -5)).toBe(85);
  });

  it('clamps silence and clipping to the display range', () => {
    expect(mapDbfsToDisplayDb(DBFS_SILENCE, 0)).toBe(0);
    expect(mapDbfsToDisplayDb(-160, 0)).toBe(0);
    expect(mapDbfsToDisplayDb(0, 20)).toBe(120);
    expect(mapDbfsToDisplayDb(50, 0)).toBe(140);
    expect(mapDbfsToDisplayDb(-200, -20)).toBe(0);
  });

  it('returns null for invalid metering samples', () => {
    expect(isValidDbfs(undefined)).toBe(false);
    expect(mapDbfsToDisplayDb(undefined, 0)).toBeNull();
    expect(mapDbfsToDisplayDb(null, 0)).toBeNull();
    expect(mapDbfsToDisplayDb(NaN, 0)).toBeNull();
    expect(mapDbfsToDisplayDb('loud', 0)).toBeNull();
  });

  it('clamps out-of-range offset before mapping', () => {
    expect(mapDbfsToDisplayDb(-40, 99)).toBe(80);
    expect(mapDbfsToDisplayDb(-40, -99)).toBe(40);
  });
});

describe('smoothLevel', () => {
  it('returns the first finite sample', () => {
    expect(smoothLevel(null, 60, 0.35)).toBe(60);
    expect(smoothLevel(undefined, 40)).toBe(40);
  });

  it('blends toward the next sample', () => {
    expect(smoothLevel(0, 100, 0.25)).toBe(25);
    expect(smoothLevel(80, 100, 0.5)).toBe(90);
  });

  it('keeps previous when the next sample is invalid', () => {
    expect(smoothLevel(55, NaN)).toBe(55);
    expect(smoothLevel(55, undefined)).toBe(55);
    expect(smoothLevel(null, undefined)).toBeNull();
  });
});

describe('session max/avg', () => {
  it('starts empty', () => {
    expect(createSession()).toEqual({ count: 0, sum: 0, max: null });
    expect(sessionDisplayStats(createSession(), 0)).toEqual({ max: null, avg: null, count: 0 });
  });

  it('tracks max dBFS and mean dBFS, then maps with offset', () => {
    let session = createSession();
    session = addDbfsSample(session, -40);
    session = addDbfsSample(session, -20);
    session = addDbfsSample(session, -30);
    expect(session.count).toBe(3);
    expect(session.max).toBe(-20);
    expect(session.sum).toBe(-90);
    expect(sessionDisplayStats(session, 0)).toEqual({ max: 80, avg: 70, count: 3 });
    expect(sessionDisplayStats(session, 10)).toEqual({ max: 90, avg: 80, count: 3 });
  });

  it('ignores invalid samples', () => {
    let session = addDbfsSample(createSession(), -40);
    session = addDbfsSample(session, undefined);
    session = addDbfsSample(session, NaN);
    expect(session.count).toBe(1);
    expect(sessionDisplayStats(session, 0).max).toBe(60);
  });
});

describe('gauge and format helpers', () => {
  it('fills 0..1 against the 140 dB scale', () => {
    expect(gaugeFill(null)).toBe(0);
    expect(gaugeFill(0)).toBe(0);
    expect(gaugeFill(70)).toBe(0.5);
    expect(gaugeFill(140)).toBe(1);
    expect(gaugeFill(200)).toBe(1);
  });

  it('uses three functional colors', () => {
    expect(gaugeColor(null)).toBe('#C9C3BB');
    expect(gaugeColor(20)).toBe('#3F8A57');
    expect(gaugeColor(70)).toBe('#C48A1A');
    expect(gaugeColor(100)).toBe('#C65B45');
  });

  it('formats display and offset', () => {
    expect(formatDb(null)).toBe('—');
    expect(formatDb(62.4)).toBe('62');
    expect(formatDb(62.6)).toBe('63');
    expect(formatOffset(0)).toBe('0');
    expect(formatOffset(4)).toBe('+4');
    expect(formatOffset(-3)).toBe('-3');
  });
});
