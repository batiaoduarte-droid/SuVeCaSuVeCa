import { describe, expect, it, beforeEach } from 'vitest';
import {
  LOCAL_DEV_TOKEN,
  LOCAL_TEST_USER,
  LOCAL_TEST_USER_ID,
  isLocalAuthActive,
  setLocalAuthActive,
  toggleLocalAuth,
} from '../localDevAuth';

describe('localDevAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fornece usuário de teste com token de desenvolvimento estático', async () => {
    expect(LOCAL_TEST_USER.uid).toBe(LOCAL_TEST_USER_ID);
    expect(LOCAL_TEST_USER.displayName).toContain('Eu');
    const token = await LOCAL_TEST_USER.getIdToken();
    expect(token).toBe(LOCAL_DEV_TOKEN);
  });

  it('permite alternar e consultar o estado do modo local', () => {
    expect(isLocalAuthActive()).toBe(false);

    setLocalAuthActive(true);
    expect(isLocalAuthActive()).toBe(true);

    const toggled = toggleLocalAuth();
    expect(toggled).toBe(false);
    expect(isLocalAuthActive()).toBe(false);
  });
});
