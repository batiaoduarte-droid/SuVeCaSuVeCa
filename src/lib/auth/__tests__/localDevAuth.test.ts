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

  it('entra pelo e-mail derivado sem criar outra conta nem alterar uid ou dados pessoais', async () => {
    const first = await createLocalAccount('aluno.original', 'Aluno Original', 'senha-original');
    const other = await createLocalAccount('outra.conta', 'Outra Conta', 'senha-outra');
    const firstUid = first.user!.uid;
    const dataKey = `suveca_flashcards_${firstUid}`;
    const personalData = '[{"id":"card-anterior","front":"Estudo anterior"}]';
    localStorage.setItem(dataKey, personalData);
    const accountsBefore = getLocalAccounts();

    const login = await loginLocalAccount('  ALUNO.ORIGINAL@SUVECA.LOCAL  ', 'senha-original');

    expect(login.success).toBe(true);
    expect(login.user?.uid).toBe(firstUid);
    expect(getActiveLocalUser()?.uid).toBe(firstUid);
    expect(getLocalAccounts().map(account => account.id)).toEqual(accountsBefore.map(account => account.id));
    expect(getLocalAccounts().find(account => `local-user-${account.id}` === other.user!.uid)).toEqual(accountsBefore[1]);
    expect(localStorage.getItem(dataKey)).toBe(personalData);
  });

  it('preserva o e-mail cadastrado como usuário e rejeita senha incorreta sem trocar a sessão', async () => {
    const created = await createLocalAccount('pessoa@example.test', 'Pessoa', 'senha-certa');
    loginAsTestUser();

    const wrong = await loginLocalAccount('pessoa@example.test', 'senha-errada');
    expect(wrong.success).toBe(false);
    expect(getActiveLocalUser()?.uid).toBe(LOCAL_TEST_USER_ID);

    const login = await loginLocalAccount('PESSOA@EXAMPLE.TEST', 'senha-certa');
    expect(login.success).toBe(true);
    expect(login.user?.uid).toBe(created.user?.uid);
    expect(login.user?.email).toBe('pessoa@example.test');
    expect(getLocalAccounts()).toHaveLength(1);
  });

  it('rejeita colisão entre usuário e e-mail derivado em qualquer ordem de cadastro', async () => {
    await createLocalAccount('aluno', 'Aluno', 'senha-aluno');
    const emailAfterUsername = await createLocalAccount('aluno@suveca.local', 'Outra Conta', 'outra-senha');
    expect(emailAfterUsername.success).toBe(false);
    expect(getLocalAccounts()).toHaveLength(1);

    localStorage.clear();
    await createLocalAccount('aluno@suveca.local', 'Aluno', 'senha-aluno');
    const usernameAfterEmail = await createLocalAccount('aluno', 'Outra Conta', 'outra-senha');
    expect(usernameAfterEmail.success).toBe(false);
    expect(getLocalAccounts()).toHaveLength(1);
  });

  it('prioriza o usuário exato entre contas legadas com e-mail derivado coincidente', async () => {
    const accounts = [
      { id: 'legacy-name', username: 'aluno', displayName: 'Conta pelo Nome', passwordHash: await hashPassword('senha-nome'), createdAt: '2026-08-01T00:00:00.000Z' },
      { id: 'legacy-email', username: 'aluno@suveca.local', displayName: 'Conta pelo E-mail', passwordHash: await hashPassword('senha-email'), createdAt: '2026-08-01T00:00:00.000Z' },
    ];
    localStorage.setItem('suveca_local_accounts', JSON.stringify(accounts));

    const emailLogin = await loginLocalAccount('aluno@suveca.local', 'senha-email');
    expect(emailLogin.success).toBe(true);
    expect(emailLogin.user?.uid).toBe('local-user-legacy-email');
    expect((await loginLocalAccount('aluno@suveca.local', 'senha-nome')).success).toBe(false);

    const usernameLogin = await loginLocalAccount('aluno', 'senha-nome');
    expect(usernameLogin.success).toBe(true);
    expect(usernameLogin.user?.uid).toBe('local-user-legacy-name');
    expect(getLocalAccounts().map(account => account.id)).toEqual(['legacy-name', 'legacy-email']);
  });
});
