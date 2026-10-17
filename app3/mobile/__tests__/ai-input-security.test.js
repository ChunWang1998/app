import fs from 'fs';
import path from 'path';
import renderer from 'react-test-renderer';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { startSpeech, __setOnDeviceSpeechForTests, speechLocale } from '../src/lib/ai/speech';
import { AiIntentCard } from '../src/components/AiIntentCard';
import { TOAST_MS } from '../src/components/UndoToast';
import { setLocale } from '../src/i18n';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

describe('on-device-only speech', () => {
  afterEach(() => {
    __setOnDeviceSpeechForTests(undefined);
    ExpoSpeechRecognitionModule.start.mockClear();
  });

  it('never calls start when on-device speech is unsupported', () => {
    __setOnDeviceSpeechForTests(false);
    const onError = jest.fn();
    startSpeech({ locale: 'zh-Hant', onError });
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({ reason: 'on-device-unavailable' });
  });

  it('always passes requiresOnDeviceRecognition true', () => {
    __setOnDeviceSpeechForTests(true);
    startSpeech({ locale: 'ja' });
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.start.mock.calls[0][0]).toMatchObject({
      lang: speechLocale('ja'),
      requiresOnDeviceRecognition: true,
    });
    startSpeech({ locale: 'en' });
    expect(ExpoSpeechRecognitionModule.start.mock.calls[1][0].requiresOnDeviceRecognition).toBe(true);
  });
});

describe('AI add in-flight guard', () => {
  it('add button ignores a second tap and switches to added', () => {
    const onAdd = jest.fn();
    const tree = renderer.create(
      <AiIntentCard item={{ title: 'Filter' }} state="new" onAdd={onAdd} />,
    );
    const btn = tree.root.findByProps({ testID: 'ai-add' });
    btn.props.onPress();
    btn.props.onPress();
    expect(onAdd).toHaveBeenCalledTimes(1);

    tree.update(
      <AiIntentCard item={{ title: 'Filter' }} state="added" onAdd={onAdd} />,
    );
    expect(() => tree.root.findByProps({ testID: 'ai-add' })).toThrow();
    expect(tree.root.findByProps({ testID: 'ai-card' })).toBeTruthy();
  });

  it('AiChatScreen guards onAdd and flips to added before awaiting', () => {
    const src = read('../src/screens/AiChatScreen.js');
    expect(src).toMatch(/addingIds/);
    expect(src).toMatch(/msg\.state === 'added'/);
    expect(src).toMatch(/patchMsg\(msg\.id, \{ state: 'added' \}\)/);
    expect(src).toMatch(/await addActivity/);
    const addAt = src.indexOf("patchMsg(msg.id, { state: 'added' })");
    const awaitAt = src.indexOf('await addActivity');
    expect(addAt).toBeGreaterThan(-1);
    expect(awaitAt).toBeGreaterThan(addAt);
  });
});

describe('AI undo is per-record and expires', () => {
  it('removes only this log through undoLogAt and hides undo after 2s', () => {
    const src = read('../src/screens/AiChatScreen.js');
    expect(src).toMatch(/undoLogAt\(msg\.item\.id, msg\.undo\.loggedAt\)/);
    expect(src).not.toMatch(/undoLogActivity/);
    expect(src).toMatch(/TOAST_MS/);
    expect(src).toMatch(/undo: null/);
    expect(src).toMatch(/result\.skipped/);
    expect(src).toMatch(/onUndo=\{m\.undo \? \(\) => onUndo\(m\) : undefined\}/);
    expect(TOAST_MS).toBe(2000);
  });

  it('skipped same-day check-off has no undo button', () => {
    setLocale('en');
    const tree = renderer.create(
      <AiIntentCard item={{ title: 'Car' }} state="logged" />,
    );
    expect(() => tree.root.findByProps({ testID: 'ai-undo' })).toThrow();
    tree.update(
      <AiIntentCard item={{ title: 'Car' }} state="logged" onUndo={() => {}} />,
    );
    expect(tree.root.findByProps({ testID: 'ai-undo' })).toBeTruthy();
  });
});
