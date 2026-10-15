'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { mapCameraError, type BlockReason } from '@/lib/camera/support';

export type Facing = 'user' | 'environment';

export type CameraApi = {
  status: 'idle' | 'starting' | 'live' | 'error';
  error: BlockReason | null;
  facing: Facing;
  hasMultiple: boolean;
  torchAvailable: boolean;
  torchOn: boolean;
  flip(): void;
  setTorch(on: boolean): void;
};

const FACING_KEY = 'nf26.facing';
const IDEAL = { width: { ideal: 1920 }, height: { ideal: 1440 }, aspectRatio: { ideal: 4 / 3 } };

function savedFacing(): Facing {
  try {
    return window.localStorage.getItem(FACING_KEY) === 'environment' ? 'environment' : 'user';
  } catch {
    return 'user';
  }
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, active: boolean): CameraApi {
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  // The camera screen only mounts after a tap, never during server rendering, so reading storage here is safe.
  const [facing, setFacing] = useState<Facing>(savedFacing);
  const [status, setStatus] = useState<CameraApi['status']>('idle');
  const [error, setError] = useState<BlockReason | null>(null);
  const [hasMultiple, setHasMultiple] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
  }, [videoRef]);

  const start = useCallback(
    async (want: Facing) => {
      const request = ++requestRef.current;
      stopTracks(); // iOS allows only one camera stream at a time
      setStatus('starting');
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want, ...IDEAL }, audio: false });
      } catch (first) {
        const mapped = mapCameraError(first);
        if (mapped !== 'retry_relaxed') {
          setStatus('error');
          setError(mapped);
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want }, audio: false });
        } catch (second) {
          const again = mapCameraError(second);
          setStatus('error');
          setError(again === 'retry_relaxed' ? 'no_camera' : again);
          return;
        }
      }

      if (request !== requestRef.current) {
        stream.getTracks().forEach((t) => t.stop()); // a newer start() or a stop() won
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
      setHasMultiple(devices.filter((d) => d.kind === 'videoinput').length > 1);
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorchAvailable(want === 'environment' && caps.torch === true);
      try {
        window.localStorage.setItem(FACING_KEY, want);
      } catch {
        // ignore
      }
      setStatus('live');
    },
    [stopTracks, videoRef],
  );

  const stop = useCallback(() => {
    requestRef.current += 1;
    stopTracks();
    setStatus('idle');
  }, [stopTracks]);

  useEffect(() => {
    const sync = () => {
      if (active && !document.hidden) void start(facing);
      else stop();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stop();
    };
  }, [active, facing, start, stop]);

  const flip = useCallback(() => setFacing((f) => (f === 'user' ? 'environment' : 'user')), []);

  const setTorch = useCallback((on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track
      .applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      .then(() => setTorchOn(on))
      .catch(() => setTorchAvailable(false));
  }, []);

  return { status, error, facing, hasMultiple, torchAvailable, torchOn, flip, setTorch };
}
