import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadUser = async () => {
    try {
      console.log('🔍 [Auth Debug] Carregando usuário...');
      const response = await api.getMe();
      console.log('🔍 [Auth Debug] Resposta getMe:', response);
      
      if (response.ok && response.data) {
        // Se /me retornar dados parciais, complementa com localStorage
        const storedUser = localStorage.getItem('user');
        const fullUser = storedUser ? JSON.parse(storedUser) : {};
        
        let userData: any = response.data;
        if (typeof userData === 'object' && userData !== null) {
          if ('me' in userData && userData.me) {
            userData = userData.me;
          } else if ('user' in userData && userData.user) {
            userData = userData.user;
          }
        }
        
        // Mescla dados do /me com dados armazenados
        const finalUser = { ...fullUser, ...userData } as User;
        console.log('✅ [Auth Debug] Usuário carregado:', finalUser);
        setUser(finalUser);
      } else {
        console.log('❌ [Auth Debug] Falha ao carregar usuário - response não ok:', response.error);
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('❌ [Auth Debug] Error loading user:', error);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      console.log('🔍 [Auth Debug] Loading finalizado');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 [Auth] Tentando login...');
      const response = await api.login(email, password);
      console.log('🔐 [Auth] Resposta do login:', response);
      
      if (response.ok && response.data) {
        const data = response.data as any;
        if (data.user) {
          setUser(data.user as User);
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('✅ [Auth] Login bem-sucedido');
        }
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta.",
        });
        return true;
      } else {
        console.error('❌ [Auth] Login falhou:', response.error);
        toast({
          title: "Erro ao fazer login",
          description: response.error || "Verifique suas credenciais e conexão.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ [Auth] Exceção no login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error?.message || "Não foi possível conectar ao servidor. Verifique sua conexão.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      localStorage.removeItem('user');
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Evita crash quando o provider ainda não montou (ex.: em HMR/mobile)
    console.warn('[Auth] AuthProvider ausente. Usando defaults seguros.');
    return {
      user: null,
      loading: true,
      login: async () => false,
      logout: async () => {},
      refreshUser: async () => {},
    } as AuthContextType;
  }
  return context;
}
