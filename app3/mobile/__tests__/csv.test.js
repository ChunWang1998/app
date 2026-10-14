import { csvEscape, exportFileName } from '../src/data/csv';
import { resetRepositoryForTests, addActivity, exportToCsv } from '../src/data/repository';

describe('csvEscape', () => {
  it('prefixes a quote when a field starts with a formula character', () => {
    for (const ch of ['=', '+', '-', '@', '\t', '\r']) {
      expect(csvEscape(`${ch}1+1`)).toMatch(/^'/);
    }
    expect(csvEscape('hello')).toBe('hello');
  });

  it('quotes fields that contain CR, comma, or quotes', () => {
    expect(csvEscape('a\rb')).toBe('"a\rb"');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('exportFileName', () => {
  it('uses a timestamped been-ages filename', () => {
    const now = new Date('2026-10-14T01:02:03.004Z');
    expect(exportFileName('json', now)).toBe('been-ages-2026-10-14T01-02-03-004Z.json');
    expect(exportFileName('csv', now)).toBe('been-ages-2026-10-14T01-02-03-004Z.csv');
  });
});

describe('exportToCsv formula injection', () => {
  it('neutralizes a title that starts with =', async () => {
    await resetRepositoryForTests();
    await addActivity({ title: '=1+1', notes: '+cmd' });
    const csv = await exportToCsv();
    expect(csv).toMatch(/'=1\+1/);
    expect(csv).toMatch(/'\+cmd/);
    expect(csv).not.toMatch(/(^|,)=1\+1/m);
  });
});
