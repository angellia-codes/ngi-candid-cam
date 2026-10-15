'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { PendingBanner } from '@/components/PendingBanner';
import { Access } from '@/components/screens/Access';
import { Blocked } from '@/components/screens/Blocked';
import { Camera } from '@/components/screens/Camera';
import { Notice } from '@/components/screens/Notice';
import { Preview } from '@/components/screens/Preview';
import { Roll } from '@/components/screens/Roll';
import { Welcome } from '@/components/screens/Welcome';
import { initialState, reduce } from '@/lib/app/machine';
import { preflight } from '@/lib/app/preflight';
import type { BlockReason } from '@/lib/camera/support';
import { acceptConsent, clearConsent, hasConsent } from '@/lib/client/consent';
import { initIdentity } from '@/lib/client/identity';
import { useNow } from '@/lib/client/useNow';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { useQueue } from '@/lib/queue/useQueue';
import type { PublicStatus } from '@/lib/shared/status';

type Capture = { photo: HTMLCanvasElement; capturedAt: Date; id: number };

export default function CandidCamApp() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ hasKey: boolean; keyLink: string | null }>({ hasKey: false, keyLink: null });
  const [capture, setCapture] = useState<Capture | null>(null);
  const clockOffset = useRef(0);
  const captureCount = useRef(0);
  const tick = useNow(30_000);

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const s = (await res.json()) as PublicStatus;
      clockOffset.current = Date.parse(s.now) - Date.now();
      setStatus(s);
    } catch {
      setStatusError("Can't reach the server. Check your connection, then tap Start again.");
    }
  }, []);

  useEffect(() => {
    setIdentity(initIdentity());
    void loadStatus();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [loadStatus]);

  const consentVersion = status?.consentVersion ?? null;
  const queue = useQueue({
    consentVersion,
    uploadCloseAt: status ? Date.parse(status.uploadCloseAt) : null,
    onConsentRequired: () => {
      clearConsent();
      dispatch({ type: 'CONSENT_REQUIRED' });
    },
  });

  const total = status?.shotsPerDevice ?? 15;
  const shotsLeft = Math.max(0, total - queue.shotsUsed);
  const serverNow = () => Date.now() + clockOffset.current;
  const last = queue.records.at(-1) ?? null;
  const lastPhotoUrl = useObjectUrl(last?.photoId ?? null, last?.bytes ?? null);

  // Lock the camera when the event ends while someone is shooting.
  useEffect(() => {
    if (status && (state.screen === 'camera' || state.screen === 'preview') && serverNow() > Date.parse(status.cameraCloseAt)) {
      setCapture(null);
      dispatch({ type: 'BLOCK', reason: 'closed' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, state.screen, status]);

  const start = () => {
    if (!status) return void loadStatus();
    const reason = preflight({
      ua: navigator.userAgent,
      hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
      hasKey: identity.hasKey,
      now: serverNow(),
      cameraOpenAt: Date.parse(status.cameraOpenAt),
      cameraCloseAt: Date.parse(status.cameraCloseAt),
    });
    if (reason) return dispatch({ type: 'BLOCK', reason });
    dispatch({ type: 'START', consentOk: hasConsent(status.consentVersion) });
  };

  const onBlock = useCallback((reason: BlockReason) => dispatch({ type: 'BLOCK', reason }), []);

  const onCaptured = useCallback((photo: HTMLCanvasElement, capturedAt: Date) => {
    captureCount.current += 1;
    setCapture({ photo, capturedAt, id: captureCount.current });
    dispatch({ type: 'CAPTURED' });
  }, []);

  const screen = state.screen;
  const showCamera = screen === 'camera' || screen === 'preview';

  return (
    <>
      <PendingBanner count={queue.pending} />

      {screen === 'welcome' && (
        <Welcome onStart={start} disabled={false} message={statusError ?? queue.storageError} />
      )}

      {screen === 'notice' && (
        <Notice
          onAccept={() => {
            if (consentVersion) acceptConsent(consentVersion);
            dispatch({ type: 'CONSENT_ACCEPTED' });
            queue.retryNow();
          }}
        />
      )}

      {screen === 'access' && <Access onContinue={() => dispatch({ type: 'ACCESS_CONTINUE' })} />}

      {showCamera && (
        <div hidden={screen !== 'camera'}>
          <Camera
            active={showCamera}
            shotsLeft={shotsLeft}
            total={total}
            lastPhotoUrl={lastPhotoUrl}
            onCaptured={onCaptured}
            onOpenRoll={() => dispatch({ type: 'OPEN_ROLL' })}
            onBlock={onBlock}
            onExit={() => dispatch({ type: 'EXIT' })}
          />
        </div>
      )}

      {screen === 'preview' && capture && (
        <Preview
          key={capture.id}
          photo={capture.photo}
          capturedAt={capture.capturedAt}
          shotNumber={queue.shotsUsed + 1}
          total={total}
          onRetake={() => {
            setCapture(null);
            dispatch({ type: 'RETAKE' });
          }}
          onConfirm={async ({ photoId, bytes }) => {
            await queue.add({ photoId, capturedAt: capture.capturedAt.toISOString(), bytes });
            setCapture(null);
            dispatch({ type: 'CONFIRMED' });
          }}
        />
      )}

      {screen === 'roll' && (
        <Roll
          records={queue.records}
          total={total}
          progress={queue.progress}
          onClose={() => dispatch({ type: 'CLOSE_ROLL' })}
          onRetryNow={queue.retryNow}
        />
      )}

      {screen === 'blocked' && state.blockReason && (
        <Blocked
          reason={state.blockReason}
          cameraOpenAt={status ? new Date(status.cameraOpenAt) : null}
          uploadCloseAt={status ? new Date(status.uploadCloseAt) : null}
          keyLink={identity.keyLink}
          onRetry={() => dispatch({ type: 'RETRY_CAMERA' })}
          onOpenRoll={() => dispatch({ type: 'OPEN_ROLL' })}
        />
      )}
    </>
  );
}
