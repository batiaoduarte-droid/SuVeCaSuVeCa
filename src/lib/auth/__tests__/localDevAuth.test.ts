import { describe, expect, it, beforeEach } from 'vitest';
import {
  LOCAL_DEV_TOKEN,
  LOCAL_TEST_USER,
  LOCAL_TEST_USER_ID,
  isLocalAuthActive,
  setLocalAuthActive,
  toggleLocalAuth,
  createLocalAccount,
  loginLocalAccount,
  loginAsTestUser,
  getActiveLocalUser,
  ensureDefaultLocalAuth,
  getLocalAccounts,
  isTestUser,
  isPersonalLocalUser,
  hashPassword,
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

  it('inicializa conta teste como padrão com ensureDefaultLocalAuth', () => {
    expect(isLocalAuthActive()).toBe(false);

    const defaultUser = ensureDefaultLocalAuth();
    expect(defaultUser.uid).toBe(LOCAL_TEST_USER_ID);
    expect(isLocalAuthActive()).toBe(true);
    expect(isTestUser(defaultUser)).toBe(true);
  });

  it('cria uma conta local com senha hasheada e isolamento de uid', async () => {
    const result = await createLocalAccount('batiao', 'Batião Duarte', 'senha123');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();

    const user = result.user!;
    expect(user.uid).toMatch(/^local-user-u_/);
    expect(user.displayName).toBe('Batião Duarte');
    expect(user.email).toBe('batiao@suveca.local');
    expect(isPersonalLocalUser(user)).toBe(true);
    expect(isTestUser(user)).toBe(false);

    // Confirma que senha não é salva em texto puro
    const accounts = getLocalAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].passwordHash).not.toBe('senha123');
    expect(accounts[0].passwordHash).toBe(await hashPassword('senha123'));

    // Rejeita usuário duplicado
    const duplicate = await createLocalAccount('batiao', 'Outro Nome', 'outrasenha');
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('Já existe uma conta');
  });

  it('rejeita nomes reservados para contas de teste', async () => {
    const testAccount = await createLocalAccount('teste', 'Nome Teste', '1234');
    expect(testAccount.success).toBe(false);
    expect(testAccount.error).toContain('reservado');
  });

  it('valida credenciais no login e permite alternar entre conta pessoal e conta teste', async () => {
    await createLocalAccount('aluno', 'Aluno Dedicado', 'concurso2026');

    // Login com senha errada
    const wrongPass = await loginLocalAccount('aluno', 'senhaerrada');
    expect(wrongPass.success).toBe(false);
    expect(wrongPass.error).toContain('Senha incorreta');

    // Login com sucesso
    const validLogin = await loginLocalAccount('aluno', 'concurso2026');
    expect(validLogin.success).toBe(true);
    expect(validLogin.user?.displayName).toBe('Aluno Dedicado');
    expect(getActiveLocalUser()?.displayName).toBe('Aluno Dedicado');

    // Alterna para conta teste
    const testUser = loginAsTestUser();
    expect(testUser.uid).toBe(LOCAL_TEST_USER_ID);
    expect(getActiveLocalUser()?.uid).toBe(LOCAL_TEST_USER_ID);

    // Re-login na conta pessoal com credenciais
    const reLogin = await loginLocalAccount('aluno', 'concurso2026');
    expect(reLogin.success).toBe(true);
    expect(getActiveLocalUser()?.uid).toBe(validLogin.user?.uid);
    expect(reLogin.user?.uid).not.toBe(testUser.uid);
  });
});
