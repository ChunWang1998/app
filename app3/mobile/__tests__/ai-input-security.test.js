import fs from 'fs';
import path from 'path';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { startSpeech, __setOnDeviceSpeechForTests, speechLocale } from '../src/lib/ai/speech';
import { TOAST_MS } from '../src/components/UndoToast';

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
    startSpeech({ locale: 'zh-Hant' });
    expect(ExpoSpeechRecognitionModule.start.mock.calls[2][0]).toMatchObject({
      lang: 'zh-TW',
      requiresOnDeviceRecognition: true,
    });
    startSpeech({ locale: 'de' });
    expect(ExpoSpeechRecognitionModule.start.mock.calls[3][0]).toMatchObject({
      lang: 'de-DE',
      requiresOnDeviceRecognition: true,
    });
    startSpeech({ locale: 'fr-FR' });
    expect(ExpoSpeechRecognitionModule.start.mock.calls[4][0]).toMatchObject({
      lang: 'fr-FR',
      requiresOnDeviceRecognition: true,
    });
  });

  it('maps de to de-DE and fr to fr-FR', () => {
    expect(speechLocale('de')).toBe('de-DE');
    expect(speechLocale('de-AT')).toBe('de-DE');
    expect(speechLocale('fr')).toBe('fr-FR');
    expect(speechLocale('fr-CA')).toBe('fr-FR');
  });
});

describe('AI add in-flight guard', () => {
  it('add button ignores a second tap and the card leaves the add state', () => {
    let locked = false;
    const onAdd = jest.fn();
    const press = () => {
      if (locked) return;
      locked = true;
      onAdd();
    };
    press();
    press();
    expect(onAdd).toHaveBeenCalledTimes(1);

    const card = read('../src/components/AiIntentCard.js');
    expect(card).toMatch(/addLock/);
    expect(card).toMatch(/if \(addLock\.current\) return/);
    expect(card).toMatch(/addLock\.current = true/);
    expect(card).toMatch(/state === 'added'/);
    expect(card).toMatch(/testID="ai-add"/);

    const src = read('../src/screens/AiChatScreen.js');
    expect(src).toMatch(/addingIds/);
    expect(src).toMatch(/msg\.state === 'added'/);
    expect(src).toMatch(/patchMsg\(msg\.id, \{ state: 'added'/);
    const addAt = src.indexOf("patchMsg(msg.id, { state: 'added'");
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
    const card = read('../src/components/AiIntentCard.js');
    expect(card).toMatch(/\{onUndo \? \(/);
    expect(card).toMatch(/testID="ai-undo"/);
  });
});

describe('AI paywall reply', () => {
  it('always leaves an assistant reply and retries after Pro', () => {
    const src = read('../src/screens/AiChatScreen.js');
    expect(src).not.toMatch(/text:\s*''/);
    expect(src).toMatch(/ai\.limitReached/);
    expect(src).toMatch(/useFocusEffect/);
    expect(src).toMatch(/pendingPaywall/);
    expect(src).toMatch(/isProUnlocked/);
    expect(src).toMatch(/logActivityOnDay/);
    expect(src).toMatch(/itemId/);
    expect(src).toMatch(/ai\.gone/);
    expect(src).toMatch(/PAYWALL_RETRY_MS/);
    expect(src).toMatch(/pendingPaywall\.current = null/);
    expect(src).toMatch(/retry\?\.at/);
  });
});
