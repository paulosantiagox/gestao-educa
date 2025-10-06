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
  plataforma_google: boolean;
  plataforma_meta: boolean;
  ativo: boolean;
  observacoes?: string;
  nome: string;
  email: string;
  created_at: string;
}

interface ConsultorForm {
  user_id: string;
  numero: string;
  plataforma_google: boolean;
  plataforma_meta: boolean;
  ativo: boolean;
  observacoes: string;
}

export default function ConsultoresRedirect() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'google' | 'meta'>('google');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const [formData, setFormData] = useState<ConsultorForm>({
    user_id: '',
    numero: '',
    plataforma_google: false,
    plataforma_meta: false,
    ativo: true,
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [consultoresRes, usersRes] = await Promise.all([
        api.get('/api/consultores-redirect'),
        api.get('/api/users')
      ]);

      setConsultores(consultoresRes.data);
      
      // Handle users data structure
      if (usersRes.data && typeof usersRes.data === 'object' && 'users' in usersRes.data) {
        const usersData = (usersRes.data as unknown) as { users: User[] };
        setUsers(usersData.users);
      } else {
        setUsers((usersRes.data as unknown) as User[]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.numero) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const submitData = {
        ...formData,
        user_id: parseInt(formData.user_id)
      };

      if (editingId) {
        await api.put(`/api/consultores-redirect/${editingId}`, submitData);
        toast.success('Consultor atualizado com sucesso!');
      } else {
        await api.post('/api/consultores-redirect', submitData);
        toast.success('Consultor cadastrado com sucesso!');
      }

      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar consultor');
    }
  };

  const handleEdit = (consultor: Consultor) => {
    setFormData({
      user_id: consultor.user_id.toString(),
      numero: consultor.numero,
      plataforma_google: consultor.plataforma_google,
      plataforma_meta: consultor.plataforma_meta,
      ativo: consultor.ativo,
      observacoes: consultor.observacoes || ''
    });
    setEditingId(consultor.id);
    
    // Set active tab based on platform
    if (consultor.plataforma_google && !consultor.plataforma_meta) {
      setActiveTab('google');
    } else if (consultor.plataforma_meta && !consultor.plataforma_google) {
      setActiveTab('meta');
    }
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este consultor?')) return;

    try {
      await api.delete(`/api/consultores-redirect/${id}`);
      toast.success('Consultor excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir consultor');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    // Evita múltiplas atualizações simultâneas
    if (updatingStatus === id) return;
    
    setUpdatingStatus(id);
    
    // Atualização otimista - atualiza o estado local imediatamente
    const newStatus = !currentStatus;
    setConsultores(prev => 
      prev.map(consultor => 
        consultor.id === id 
          ? { ...consultor, ativo: newStatus }
          : consultor
      )
    );

    try {
      await api.put(`/api/consultores-redirect/${id}`, { ativo: newStatus });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
      
      // Reverte a mudança em caso de erro
      setConsultores(prev => 
        prev.map(consultor => 
          consultor.id === id 
            ? { ...consultor, ativo: currentStatus }
            : consultor
        )
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      numero: '',
      plataforma_google: false,
      plataforma_meta: false,
      ativo: true,
      observacoes: ''
    });
    setEditingId(null);
    setShowModal(false);
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleNewConsultor = (platform: 'google' | 'meta') => {
    resetForm();
    setActiveTab(platform);
    setFormData(prev => ({
      ...prev,
      plataforma_google: platform === 'google',
      plataforma_meta: platform === 'meta'
    }));
    setShowModal(true);
  };

  // Filter consultants by platform
  const googleConsultores = consultores.filter(c => c.plataforma_google && !c.plataforma_meta);
  const metaConsultores = consultores.filter(c => c.plataforma_meta && !c.plataforma_google);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consultores Redirecionamento</h1>
      </div>

      {/* Google Ads Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-blue-600">📱 Números Google Ads</CardTitle>
          <Button 
            onClick={() => handleNewConsultor('google')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Número Google
          </Button>
        </CardHeader>
        <CardContent>
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
              {googleConsultores.map((consultor) => (
                <TableRow key={consultor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{consultor.nome}</div>
                      <div className="text-sm text-gray-500">{consultor.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatPhoneNumber(consultor.numero)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={consultor.ativo}
                        onCheckedChange={() => handleToggleStatus(consultor.id, consultor.ativo)}
                        disabled={updatingStatus === consultor.id}
                        className={updatingStatus === consultor.id ? 'opacity-50' : ''}
                      />
                      <Badge variant={consultor.ativo ? "default" : "secondary"}>
                        {consultor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{consultor.observacoes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(consultor)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(consultor.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {googleConsultores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Nenhum número Google cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Meta Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-green-600">📱 Números Meta</CardTitle>
          <Button 
            onClick={() => handleNewConsultor('meta')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Número Meta
          </Button>
        </CardHeader>
        <CardContent>
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
              {metaConsultores.map((consultor) => (
                <TableRow key={consultor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{consultor.nome}</div>
                      <div className="text-sm text-gray-500">{consultor.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatPhoneNumber(consultor.numero)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={consultor.ativo}
                        onCheckedChange={() => handleToggleStatus(consultor.id, consultor.ativo)}
                        disabled={updatingStatus === consultor.id}
                        className={updatingStatus === consultor.id ? 'opacity-50' : ''}
                      />
                      <Badge variant={consultor.ativo ? "default" : "secondary"}>
                        {consultor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{consultor.observacoes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(consultor)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(consultor.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {metaConsultores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Nenhum número Meta cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? 'Editar' : 'Novo'} Número {activeTab === 'google' ? 'Google' : 'Meta'}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="user_id">Consultor *</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} - {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="numero">Número WhatsApp *</Label>
                <Input
                  id="numero"
                  type="text"
                  placeholder="11999999999"
                  value={formData.numero}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  required
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">
                  Plataforma: {activeTab === 'google' ? 'Google Ads' : 'Meta'}
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Este número será usado exclusivamente para {activeTab === 'google' ? 'Google Ads' : 'Meta'}
                </p>
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
                  placeholder="Observações sobre o consultor..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}