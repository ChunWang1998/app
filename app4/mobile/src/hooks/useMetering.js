import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  addDbfsSample,
  createSession,
  mapDbfsToDisplayDb,
  sessionDisplayStats,
  smoothLevel,
} from '../lib/meter';

const POLL_MS = 100;

const RECORDING_OPTIONS = {
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
  numberOfChannels: 1,
};

export function useMetering(offset) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, POLL_MS);

  const [running, setRunning] = useState(false);
  const [permission, setPermission] = useState('undetermined');
  const [dbfs, setDbfs] = useState(null);
  const [smoothed, setSmoothed] = useState(null);
  const [session, setSession] = useState(createSession);

  const runningRef = useRef(false);
  const pausedByBackgroundRef = useRef(false);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getRecordingPermissionsAsync();
        if (!cancelled) {
          setPermission(status.granted ? 'granted' : status.status || 'denied');
        }
      } catch {
        if (!cancelled) setPermission('undetermined');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prevOffsetRef = useRef(offset);

  useEffect(() => {
    if (!running) return;
    const sample = recorderState?.metering;
    if (!Number.isFinite(sample)) return;
    setDbfs(sample);
    setSession((prev) => addDbfsSample(prev, sample));
  }, [recorderState?.metering, running]);

  useEffect(() => {
    const mapped = mapDbfsToDisplayDb(dbfs, offset);
    const offsetChanged = prevOffsetRef.current !== offset;
    prevOffsetRef.current = offset;
    if (offsetChanged || !running) {
      setSmoothed(mapped);
      return;
    }
    setSmoothed((prev) => smoothLevel(prev, mapped));
  }, [dbfs, offset, running]);

  const stopRecorder = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      try {
        recorder.pause();
      } catch {
        // already stopped
      }
    }
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // audio mode is best-effort
    }
  }, [recorder]);

  const start = useCallback(async () => {
    const status = await requestRecordingPermissionsAsync();
    if (!status.granted) {
      setPermission(status.status || 'denied');
      return false;
    }
    setPermission('granted');
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      pausedByBackgroundRef.current = false;
      setSession(createSession());
      setDbfs(null);
      setSmoothed(null);
      setRunning(true);
      return true;
    } catch {
      setPermission('denied');
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    setRunning(false);
    pausedByBackgroundRef.current = false;
    await stopRecorder();
  }, [stopRecorder]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        if (runningRef.current && recorder.isRecording) {
          try {
            recorder.pause();
            pausedByBackgroundRef.current = true;
          } catch {
            // pause may throw if already stopped
          }
        }
        return;
      }
      if (pausedByBackgroundRef.current && runningRef.current) {
        try {
          recorder.record();
          pausedByBackgroundRef.current = false;
        } catch {
          pausedByBackgroundRef.current = false;
        }
      }
    });
    return () => sub.remove();
  }, [recorder]);

  useEffect(() => () => {
    runningRef.current = false;
    stopRecorder().catch(() => {});
  }, [stopRecorder]);

  const stats = sessionDisplayStats(session, offset);
  const displayDb = running || smoothed != null ? smoothed : null;

  return {
    running,
    permission,
    displayDb,
    max: stats.max,
    avg: stats.avg,
    start,
    stop,
  };
}
