import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppEvent, type AppState } from '@/lib/app/machine';

const run = (events: AppEvent[], from: AppState = initialState) => events.reduce(reduce, from);

describe('screen machine', () => {
  it('first visit: welcome → notice → access → camera', () => {
    expect(run([{ type: 'START', consentOk: false }]).screen).toBe('notice');
    expect(run([{ type: 'START', consentOk: false }, { type: 'CONSENT_ACCEPTED' }]).screen).toBe('access');
    expect(
      run([{ type: 'START', consentOk: false }, { type: 'CONSENT_ACCEPTED' }, { type: 'ACCESS_CONTINUE' }]).screen,
    ).toBe('camera');
  });

  it('returning visit skips the notice', () => {
    expect(run([{ type: 'START', consentOk: true }]).screen).toBe('access');
  });

  it('shoot loop: camera → preview → camera', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(reduce(cam, { type: 'CAPTURED' }).screen).toBe('preview');
    expect(run([{ type: 'CAPTURED' }, { type: 'RETAKE' }], cam).screen).toBe('camera');
    expect(run([{ type: 'CAPTURED' }, { type: 'CONFIRMED' }], cam).screen).toBe('camera');
  });

  it('roll returns to where it was opened', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(run([{ type: 'OPEN_ROLL' }, { type: 'CLOSE_ROLL' }], cam).screen).toBe('camera');
    const closed = reduce(initialState, { type: 'BLOCK', reason: 'closed' });
    const back = run([{ type: 'OPEN_ROLL' }, { type: 'CLOSE_ROLL' }], closed);
    expect(back).toMatchObject({ screen: 'blocked', blockReason: 'closed' });
  });

  it('blocked screens carry their reason and can retry the camera', () => {
    const denied = reduce(initialState, { type: 'BLOCK', reason: 'denied' });
    expect(denied).toMatchObject({ screen: 'blocked', blockReason: 'denied' });
    expect(reduce(denied, { type: 'RETRY_CAMERA' }).screen).toBe('access');
  });

  it('a consent request mid-event shows the notice, then goes straight back to the camera', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    const notice = reduce(cam, { type: 'CONSENT_REQUIRED' });
    expect(notice.screen).toBe('notice');
    expect(reduce(notice, { type: 'CONSENT_ACCEPTED' }).screen).toBe('camera');
  });

  it('exit returns to welcome from anywhere', () => {
    const cam = run([{ type: 'START', consentOk: true }, { type: 'ACCESS_CONTINUE' }]);
    expect(reduce(cam, { type: 'EXIT' })).toEqual(initialState);
  });
});
