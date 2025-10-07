import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Consultor {
  id: number;
  user_id: number;
  numero: string;
  plataforma: string;
  ativo: boolean;
  observacoes?: string;
  nome: string;
  email: string;
  created_at: string;
  ordem_atual: number;
  reservado_ate?: string;
  reservado_por?: string;
  ultimo_uso: string;
  total_usos: number;
  updated_at: string;
}

interface ConsultorForm {
  user_id: string;
  numero: string;
  plataforma: string;
  ativo: boolean;
  observacoes: string;
}

export default function ConsultoresRedirect() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'google' | 'meta'>('google');
  const [formData, setFormData] = useState<ConsultorForm>({
    user_id: '',
    numero: '',
    plataforma: '',
    ativo: true,
    observacoes: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [consultorToDelete, setConsultorToDelete] = useState<number | null>(null);

  // FORÇAR DADOS DE TESTE PARA DEBUG
  const [debugMode] = useState(false); // DESABILITADO - USAR DADOS REAIS

  console.log('🔍 Render - showModal:', showModal);
  console.log('🔍 Render - loading:', loading);
  console.log('🔍 Render - users length:', users.length);
  console.log('🔍 Render - consultores length:', consultores.length);
  console.log('🔍 Render - debugMode:', debugMode);

  useEffect(() => {
    console.log('🔍 [ConsultoresRedirect] useEffect executado - carregando dados...');
    
    if (debugMode) {
      // DADOS DE TESTE FORÇADOS
      console.log('🚨 [DEBUG] Usando dados de teste forçados!');
      const dadosTeste: Consultor[] = [
        {
          id: 1,
          user_id: 21,
          numero: "(47) 99101-0463",
          plataforma: "google",
          ativo: true,
          nome: "Teste Google 1",
          email: "teste1@gmail.com",
          created_at: "2025-01-01T00:00:00.000Z",
          ordem_atual: 0,
          ultimo_uso: "2025-01-01T00:00:00.000Z",
          total_usos: 0,
          updated_at: "2025-01-01T00:00:00.000Z"
        },
        {
          id: 2,
          user_id: 22,
          numero: "(47) 99101-0464",
          plataforma: "google",
          ativo: true,
          nome: "Teste Google 2",
          email: "teste2@gmail.com",
          created_at: "2025-01-01T00:00:00.000Z",
          ordem_atual: 0,
          ultimo_uso: "2025-01-01T00:00:00.000Z",
          total_usos: 0,
          updated_at: "2025-01-01T00:00:00.000Z"
        },
        {
          id: 3,
          user_id: 23,
          numero: "(47) 99101-0465",
          plataforma: "meta",
          ativo: true,
          nome: "Teste Meta 1",
          email: "teste3@gmail.com",
          created_at: "2025-01-01T00:00:00.000Z",
          ordem_atual: 0,
          ultimo_uso: "2025-01-01T00:00:00.000Z",
          total_usos: 0,
          updated_at: "2025-01-01T00:00:00.000Z"
        }
      ];
      
      setConsultores(dadosTeste);
      setUsers([
        { id: 21, name: "Teste Google 1", email: "teste1@gmail.com" },
        { id: 22, name: "Teste Google 2", email: "teste2@gmail.com" },
        { id: 23, name: "Teste Meta 1", email: "teste3@gmail.com" }
      ]);
      setLoading(false);
      return;
    }
    
    loadData();
  }, [debugMode]);

  const loadData = async () => {
    console.log('🔍 [ConsultoresRedirect] Iniciando carregamento de dados...');
    setLoading(true);
    try {
      console.log('🔍 [ConsultoresRedirect] Fazendo requisição para consultores...');
      const consultoresResponse = await api.getConsultoresRedirect();
      console.log('🔍 [ConsultoresRedirect] Resposta consultores:', consultoresResponse);
      
      console.log('🔍 [ConsultoresRedirect] Fazendo requisição para usuários...');
      const usersResponse = await api.getUsers();
      console.log('🔍 [ConsultoresRedirect] Resposta usuários:', usersResponse);

      if (consultoresResponse.ok && consultoresResponse.data) {
        console.log('✅ [ConsultoresRedirect] Dados de consultores carregados:', consultoresResponse);
        
        // O API client retorna {ok: true, data: {ok: true, data: [...]}}
        // Precisamos acessar consultoresResponse.data.data para obter o array real
        let consultoresArray = [];
        
        if (typeof consultoresResponse.data === 'object' && 
            consultoresResponse.data !== null && 
            'ok' in consultoresResponse.data && 
            'data' in consultoresResponse.data) {
          // Estrutura dupla: API client + backend response
          consultoresArray = Array.isArray(consultoresResponse.data.data) ? consultoresResponse.data.data : [];
          console.log('🔍 [ConsultoresRedirect] Usando estrutura dupla - data.data');
        } else if (Array.isArray(consultoresResponse.data)) {
          // Estrutura simples: apenas array
          consultoresArray = consultoresResponse.data;
          console.log('🔍 [ConsultoresRedirect] Usando estrutura simples - data');
        }
        
        console.log('🔍 [ConsultoresRedirect] Array de consultores processado:', consultoresArray);
        setConsultores(consultoresArray);
      } else {
        console.error('❌ [ConsultoresRedirect] Erro ao carregar consultores:', consultoresResponse.error);
        setConsultores([]); // Garantir que seja um array vazio em caso de erro
      }

      if (usersResponse.ok && usersResponse.data) {
        console.log('✅ [ConsultoresRedirect] Dados de usuários carregados:', usersResponse.data);
        setUsers(usersResponse.data.users || []);
      } else {
        console.error('❌ [ConsultoresRedirect] Erro ao carregar usuários:', usersResponse.error);
      }
    } catch (error) {
      console.error('❌ [ConsultoresRedirect] Erro geral no carregamento:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      console.log('🔍 [ConsultoresRedirect] Finalizando carregamento...');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.numero || !formData.plataforma) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        // ✨ OTIMIZAÇÃO: Atualização otimista para edição
        const updatedConsultor = {
          id: editingId,
          user_id: parseInt(formData.user_id),
          numero: formData.numero,
          plataforma: formData.plataforma,
          ativo: formData.ativo,
          observacoes: formData.observacoes,
          nome: users.find(u => u.id === parseInt(formData.user_id))?.name || '',
          email: users.find(u => u.id === parseInt(formData.user_id))?.email || '',
          created_at: new Date().toISOString(),
          ordem_atual: 0,
          ultimo_uso: new Date().toISOString(),
          total_usos: 0,
          updated_at: new Date().toISOString()
        };

        setConsultores(prev => 
          prev.map(c => c.id === editingId ? updatedConsultor : c)
        );

        // Edição completa - enviar todos os campos
        const response = await api.updateConsultorRedirect(editingId, {
          user_id: parseInt(formData.user_id),
          numero: formData.numero,
          plataforma: formData.plataforma,
          ativo: formData.ativo,
          observacoes: formData.observacoes
        });
        console.log('🔍 PUT Response:', response);
        toast.success('Consultor atualizado com sucesso!');
      } else {
        // ✨ OTIMIZAÇÃO: Adição otimista para novo consultor
        const tempId = Date.now(); // ID temporário
        const newConsultor = {
          id: tempId,
          user_id: parseInt(formData.user_id),
          numero: formData.numero,
          plataforma: formData.plataforma,
          ativo: formData.ativo,
          observacoes: formData.observacoes,
          nome: users.find(u => u.id === parseInt(formData.user_id))?.name || '',
          email: users.find(u => u.id === parseInt(formData.user_id))?.email || '',
          created_at: new Date().toISOString(),
          ordem_atual: 0,
          ultimo_uso: new Date().toISOString(),
          total_usos: 0,
          updated_at: new Date().toISOString()
        };

        setConsultores(prev => [...prev, newConsultor]);

        // Criação - backend espera 'plataformas' como array
        const response = await api.createConsultorRedirect({
          user_id: parseInt(formData.user_id),
          numero: formData.numero,
          plataformas: [formData.plataforma], // ← CORREÇÃO: array em vez de string
          ativo: formData.ativo,
          observacoes: formData.observacoes
        });
        console.log('🔍 POST Response:', response);
        toast.success('Consultor criado com sucesso!');
      }
      
      // Recarregar dados para sincronizar com o servidor
      await loadData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar consultor:', error);
      toast.error('Erro ao salvar consultor');
      
      // ❌ ROLLBACK: Reverter mudanças otimistas em caso de erro
      await loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      numero: '',
      plataforma: '',
      ativo: true,
      observacoes: ''
    });
    setEditingId(null);
  };

  const handleNewConsultor = (platform: 'google' | 'meta') => {
    console.log('🔍 handleNewConsultor chamado com platform:', platform);
    console.log('🔍 Estado atual showModal:', showModal);
    resetForm();
    setActiveTab(platform);
    setFormData(prev => ({
      ...prev,
      plataforma: platform
    }));
    setShowModal(true);
    console.log('🔍 Novo estado showModal será:', true);
  };

  const handleEdit = (consultor: Consultor) => {
    setFormData({
      user_id: consultor.user_id.toString(),
      numero: consultor.numero,
      plataforma: consultor.plataforma,
      ativo: consultor.ativo,
      observacoes: consultor.observacoes || ''
    });
    setEditingId(consultor.id);
    setActiveTab(consultor.plataforma as 'google' | 'meta');
    setShowModal(true);
  };

  const handleDeleteConsultor = (id: number) => {
    setConsultorToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!consultorToDelete) return;
    
    // ✨ OTIMIZAÇÃO: Remoção otimista da UI
    const consultorBackup = consultores.find(c => c.id === consultorToDelete);
    
    try {
      setConsultores(prev => prev.filter(c => c.id !== consultorToDelete));
      
      await api.deleteConsultorRedirect(consultorToDelete);
      toast.success('Consultor excluído com sucesso!');
      
      // Recarregar para sincronizar
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir consultor:', error);
      toast.error('Erro ao excluir consultor');
      
      // ❌ ROLLBACK: Restaurar consultor em caso de erro
      if (consultorBackup) {
        setConsultores(prev => [...prev, consultorBackup].sort((a, b) => a.id - b.id));
      }
    } finally {
      setShowDeleteModal(false);
      setConsultorToDelete(null);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      setUpdatingStatus(id);
      
      // Buscar dados completos do consultor para enviar no PUT
      const consultor = consultores.find(c => c.id === id);
      if (!consultor) {
        toast.error('Consultor não encontrado');
        return;
      }

      // ✨ OTIMIZAÇÃO: Atualização otimista da UI (sem piscar)
      const newStatus = !currentStatus;
      setConsultores(prev => 
        prev.map(c => 
          c.id === id ? { ...c, ativo: newStatus } : c
        )
      );

      // PUT com dados completos (backend exige numero)
      const response = await api.updateConsultorRedirect(id, {
        user_id: consultor.user_id,
        numero: consultor.numero,
        plataforma: consultor.plataforma,
        ativo: newStatus,
        observacoes: consultor.observacoes || ''
      });
      
      console.log('🔍 Toggle Response:', response);
      toast.success('Status atualizado com sucesso!');
      
      // ✨ REMOVIDO: Não recarregar dados para evitar scroll para o topo
      // await loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
      
      // ❌ ROLLBACK: Reverter mudança otimista em caso de erro
      setConsultores(prev => 
        prev.map(c => 
          c.id === id ? { ...c, ativo: currentStatus } : c
        )
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Filtrar consultores por plataforma - garantir que consultores seja um array
  const consultoresArray = Array.isArray(consultores) ? consultores : [];
  const googleConsultores = consultoresArray.filter(c => c.plataforma === 'google');
  const metaConsultores = consultoresArray.filter(c => c.plataforma === 'meta');

  console.log('🔍 [ConsultoresRedirect] Estado atual:', {
    loading,
    totalConsultores: consultores.length,
    googleConsultores: googleConsultores.length,
    metaConsultores: metaConsultores.length,
    users: users.length
  });

  console.log('🔍 [ConsultoresRedirect] Dados detalhados:', {
    consultoresRaw: consultores,
    googleConsultoresDetalhado: googleConsultores,
    metaConsultoresDetalhado: metaConsultores
  });

  const renderConsultorTable = (consultoresList: Consultor[], platform: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Consultor</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Observações</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {consultoresList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-gray-500">
              Nenhum consultor cadastrado para {platform === 'google' ? 'Google Ads' : 'Meta Ads'}
            </TableCell>
          </TableRow>
        ) : (
          consultoresList.map((consultor) => (
            <TableRow key={consultor.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{consultor.nome}</div>
                  <div className="text-sm text-gray-500">{consultor.email}</div>
                </div>
              </TableCell>
              <TableCell>{formatPhoneNumber(consultor.numero)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={consultor.ativo}
                    onCheckedChange={() => handleToggleStatus(consultor.id, consultor.ativo)}
                    disabled={updatingStatus === consultor.id}
                  />
                  <Badge variant={consultor.ativo ? "default" : "secondary"}>
                    {consultor.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate">
                  {consultor.observacoes || '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(consultor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteConsultor(consultor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    console.log('🔍 [ConsultoresRedirect] Renderizando estado de loading...');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  console.log('🔍 [ConsultoresRedirect] Renderizando componente principal...');

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Consultores Redirecionamento</h1>
      </div>

      <div className="space-y-6">
        {/* Google Ads - EM CIMA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold text-blue-600">
              Google Ads ({googleConsultores.length} consultores)
            </CardTitle>
            <Button 
              onClick={() => handleNewConsultor('google')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Número Google
            </Button>
          </CardHeader>
          <CardContent>
            {renderConsultorTable(googleConsultores, 'google')}
          </CardContent>
        </Card>

        {/* Meta Ads - EM BAIXO */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold text-green-600">
              Meta Ads ({metaConsultores.length} consultores)
            </CardTitle>
            <Button 
              onClick={() => handleNewConsultor('meta')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Número Meta
            </Button>
          </CardHeader>
          <CardContent>
            {renderConsultorTable(metaConsultores, 'meta')}
          </CardContent>
        </Card>
      </div>

      {/* Modal/Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? 'Editar Consultor' : 'Novo Consultor'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="user_id">Usuário *</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  placeholder="Ex: 11999999999"
                />
              </div>

              <div>
                <Label htmlFor="plataforma">Plataforma *</Label>
                <Select 
                  value={formData.plataforma} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plataforma: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="meta">Meta Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações opcionais..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Confirmar Exclusão</h2>
              <p className="text-gray-600">
                Tem certeza que deseja excluir este consultor? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConsultorToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}