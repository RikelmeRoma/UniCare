import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../../services/api';

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
  isAuthenticated: boolean;
  login: (key: string) => Promise<void>;
  loginCustom: (user: User) => void;
  loginWithCredentials: (emailOuMatricula: string, senha: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => void;
  switchUser: (key: string) => Promise<void>;
  createUser: (userData: Omit<User, 'id'>) => string;
  updateUser: (key: string, updatedData: Partial<User>) => void;
  deleteUser: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'unicare_auth_user';
const ALL_USERS_STORAGE_KEY = 'unicare_all_users';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lista de usuários registrados dinamicamente
  const [allUsers, setAllUsers] = useState<Record<string, User>>(() => {
    try {
      const stored = localStorage.getItem(ALL_USERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return {};
  });

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

  const createUser = (userData: Omit<User, 'id'>): string => {
    const cleanMatricula = userData.matricula.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const newKey = `usr_${cleanMatricula}_${Date.now().toString().slice(-4)}`;
    const newUser: User = {
      ...userData,
      id: Date.now(),
      custom: true,
    };

    setAllUsers((prev) => {
      const updated = { ...prev, [newKey]: newUser };
      try {
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Falha ao persistir usuários:', e);
      }
      return updated;
    });

    return newKey;
  };

  const updateUser = (key: string, updatedData: Partial<User>) => {
    setAllUsers((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const updatedUser: User = { ...existing, ...updatedData };
      const updated = { ...prev, [key]: updatedUser };
      try {
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Falha ao persistir atualização do usuário:', e);
      }
      if (user && (user.matricula === existing.matricula || user.id === existing.id)) {
        setUser(updatedUser);
      }
      return updated;
    });
  };

  const deleteUser = (key: string) => {
    setAllUsers((prev) => {
      const existing = prev[key];
      const updated = { ...prev };
      delete updated[key];
      try {
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Falha ao persistir remoção do usuário:', e);
      }
      if (user && existing && (user.matricula === existing.matricula || user.id === existing.id)) {
        logout();
      }
      return updated;
    });
  };

  const loginWithCredentials = async (
    emailOuMatricula: string,
    senha: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const res = await api.login(emailOuMatricula, senha);
      const newUser: User = {
        id: Date.now(),
        nome: res.nome,
        email: emailOuMatricula.includes('@') ? emailOuMatricula : `${emailOuMatricula}@uninassau.edu.br`,
        perfil: res.perfil,
        // 'geral' é preservado como 'geral'. Antes era convertido para
        // 'odontologia', o que fazia recepção e RT aparecerem como odontologia e
        // liberar a rota errada por acidente.
        curso: res.curso as CourseType,
        matricula: res.matricula,
      };
      setUser(newUser);
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
