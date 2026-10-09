import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, type ApiUsuario } from '../../../services/api';

export type RoleType = 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
/** 'geral' = papéis institucionais (RT e recepção), que não pertencem a uma clínica. */
export type CourseType = 'psicologia' | 'odontologia' | 'geral';

export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: RoleType;
  curso: CourseType;
  matricula: string;
  registro_profissional?: string;
  custom?: boolean;
}

export const PRESET_USERS: Record<string, User> = {};

interface AuthContextType {
  user: User | null;
  allUsers: Record<string, User>;
  carregarUsuarios: () => Promise<void>;
  isAuthenticated: boolean;
  login: (key: string) => Promise<void>;
  loginCustom: (user: User) => void;
  loginWithCredentials: (emailOuMatricula: string, senha: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => void;
  switchUser: (key: string) => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'registro_profissional'> & { registro_profissional?: string; senha: string }) => Promise<{ success: boolean; message: string }>;
  updateUser: (key: string, updatedData: Partial<User> & { senha?: string }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (key: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'unicare_auth_user';
// A lista de usuários não usa mais localStorage: vem da API (RF-009). O token
// da sessão continua guardado aqui.

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lista de usuários da clínica, carregada da API. Começa vazia de propósito:
// um cache do localStorage faria a tela mostrar usuários que podem nem existir
// mais no banco (RF-009).
const [allUsers, setAllUsers] = useState<Record<string, User>>({});

  // Usuário autenticado inicia como null (site limpo, sem usuário pré-carregado)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const syncBackendToken = async (matricula: string) => {
    try {
      await api.login(matricula, 'unicare123');
    } catch {
      // Backend offline
    }
  };

  const login = async (key: string) => {
    const selected = allUsers[key];
    if (selected) {
      setUser(selected);
      await syncBackendToken(selected.matricula);
    }
  };

  const loginCustom = (newUser: User) => {
    setUser(newUser);
  };

  // Antes o CRUD vivia só no localStorage: a aba "Usuários RBAC" do painel da
// RT nascia vazia e a senha prometida na tela nunca chegava ao banco. Agora a
// fonte é a API (RF-009) e a chave do registro é o id numérico do usuário.
const mapearUsuario = (u: ApiUsuario): User => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  perfil: u.perfil as RoleType,
  curso: u.curso as CourseType,
  matricula: u.matricula,
  registro_profissional: u.registro_profissional,
});

const carregarUsuarios = useCallback(async () => {
  try {
    const lista = await api.getUsuarios();
    const mapa: Record<string, User> = {};
    for (const u of lista) {
      mapa[String(u.id)] = mapearUsuario(u);
    }
    setAllUsers(mapa);
  } catch (err) {
    // 403 é esperado para quem não administra (estagiário e recepção): a lista
    // simplesmente fica vazia, sem virar erro de sistema.
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('403')) {
      console.error('[UniCare] falha ao carregar usuários:', err);
    }
  }
}, []);

const createUser = async (
  userData: Omit<User, 'id' | 'registro_profissional'> & { registro_profissional?: string; senha: string }
): Promise<{ success: boolean; message: string }> => {
  try {
    const criado = await api.createUsuario({
      nome: userData.nome,
      matricula: userData.matricula,
      email: userData.email,
      perfil: userData.perfil,
      senha: userData.senha,
      registro_profissional: userData.registro_profissional,
    });
    setAllUsers((prev) => ({ ...prev, [String(criado.id)]: mapearUsuario(criado) }));
    return {
      success: true,
      message: `Usuário ${criado.nome} (${criado.matricula}) cadastrado na clínica de ${criado.curso}.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao cadastrar usuário.';
    console.error('[UniCare] cadastro de usuário falhou:', err);
    return { success: false, message: msg };
  }
};

const updateUser = async (
  key: string,
  updatedData: Partial<User> & { senha?: string }
): Promise<{ success: boolean; message: string }> => {
  try {
    const atualizado = await api.updateUsuario(Number(key), {
      nome: updatedData.nome,
      email: updatedData.email,
      matricula: updatedData.matricula,
      registro_profissional: updatedData.registro_profissional,
      senha: updatedData.senha,
    });
    setAllUsers((prev) => ({ ...prev, [key]: mapearUsuario(atualizado) }));
    return { success: true, message: `Usuário ${atualizado.nome} atualizado.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao atualizar usuário.';
    console.error('[UniCare] atualização de usuário falhou:', err);
    return { success: false, message: msg };
  }
};

const deleteUser = async (key: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Desativa, não apaga: o backend preserva a linha para a trilha de auditoria.
    const desativado = await api.desativarUsuario(Number(key));
    setAllUsers((prev) => ({ ...prev, [key]: mapearUsuario(desativado) }));
    if (user && user.id === desativado.id) {
      logout();
    }
    return {
      success: true,
      message: `Usuário ${desativado.nome} desativado. O acesso foi cortado; o histórico de auditoria foi preservado.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao desativar usuário.';
    console.error('[UniCare] desativação de usuário falhou:', err);
    return { success: false, message: msg };
  }
};

  const loginWithCredentials = async (
    emailOuMatricula: string,
    senha: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
try {
      await api.login(emailOuMatricula, senha);

      // O login devolve só o essencial. O GET /auth/me traz o registro de
      // verdade: id real (antes era Date.now()) e registro_profissional, que
      // é o que alimenta o CRO do cabeçalho do supervisor. Também revalida o
      // token recém-emitido contra o servidor em vez de confiar nele.
      const eu = await api.getMe();

      const newUser: User = {
        id: eu.id,
        nome: eu.nome,
        email: eu.email,
        perfil: eu.perfil as RoleType,
        curso: eu.curso as CourseType,
        matricula: eu.matricula,
        registro_profissional: eu.registro_profissional,
      };
      setUser(newUser);

      // RT e supervisor são os perfis que administram usuários; a lista é
      // carregada no login para as telas de gestão já nascerem com dado real.
      if (eu.perfil === 'rt' || eu.perfil === 'supervisor') {
        void carregarUsuarios();
      }

      return { success: true, user: newUser };
    } catch (err: unknown) {
      let errorMsg = 'Falha ao autenticar com o servidor.';
      if (err instanceof Error) {
        if (
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('Load failed')
        ) {
          errorMsg =
            'Servidor backend FastAPI indisponível (http://localhost:8000). Certifique-se de que a API Python está em execução.';
        } else {
          errorMsg = err.message;
        }
      }
      return { success: false, message: errorMsg };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    api.clearToken();
  };

  const switchUser = async (key: string) => {
    await login(key);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        isAuthenticated: !!user,
        login,
        loginCustom,
        loginWithCredentials,
        logout,
        switchUser,
        createUser,
        updateUser,
        deleteUser,
        carregarUsuarios,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
