import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  name: string;
  email: string;
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
      const response = await api.getMe();
      if (response.ok && response.data) {
        // Tolerar diferentes formatos de resposta do backend
        let userData: any = response.data;
        if (typeof userData === 'object' && userData !== null) {
          if ('me' in userData && userData.me) {
            userData = userData.me;
          } else if ('user' in userData && userData.user) {
            userData = userData.user;
          }
        }
        setUser(userData as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(email, password);
      
      if (response.ok) {
        // Aguarda carregar o usuário antes de retornar sucesso
        await loadUser();
        
        // Pequeno delay para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta.",
        });
        return true;
      } else {
        toast({
          title: "Erro ao fazer login",
          description: response.error || "Verifique suas credenciais.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
