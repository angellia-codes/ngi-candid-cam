import type { BlockReason } from '@/lib/camera/support';

export type Screen = 'welcome' | 'notice' | 'access' | 'camera' | 'preview' | 'roll' | 'blocked';

export type AppState = {
  screen: Screen;
  blockReason?: BlockReason;
  rollReturn: 'camera' | 'blocked';
  afterNotice: 'access' | 'camera';
};

export type AppEvent =
  | { type: 'START'; consentOk: boolean }
  | { type: 'CONSENT_ACCEPTED' }
  | { type: 'ACCESS_CONTINUE' }
  | { type: 'BLOCK'; reason: BlockReason }
  | { type: 'RETRY_CAMERA' }
  | { type: 'CAPTURED' }
  | { type: 'RETAKE' }
  | { type: 'CONFIRMED' }
  | { type: 'OPEN_ROLL' }
  | { type: 'CLOSE_ROLL' }
  | { type: 'CONSENT_REQUIRED' }
  | { type: 'EXIT' };

export const initialState: AppState = { screen: 'welcome', rollReturn: 'camera', afterNotice: 'access' };

export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'START':
      return { ...state, screen: event.consentOk ? 'access' : 'notice', afterNotice: 'access', blockReason: undefined };
    case 'CONSENT_ACCEPTED':
      return { ...state, screen: state.afterNotice };
    case 'ACCESS_CONTINUE':
    case 'RETAKE':
    case 'CONFIRMED':
      return { ...state, screen: 'camera' };
    case 'BLOCK':
      return { ...state, screen: 'blocked', blockReason: event.reason };
    case 'RETRY_CAMERA':
      return { ...state, screen: 'access', blockReason: undefined };
    case 'CAPTURED':
      return { ...state, screen: 'preview' };
    case 'OPEN_ROLL':
      return { ...state, screen: 'roll', rollReturn: state.screen === 'blocked' ? 'blocked' : 'camera' };
    case 'CLOSE_ROLL':
      return { ...state, screen: state.rollReturn };
    case 'CONSENT_REQUIRED':
      return { ...state, screen: 'notice', afterNotice: 'camera' };
    case 'EXIT':
      return initialState;
  }
}
