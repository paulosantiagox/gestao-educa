import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  Download,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import DashboardFilters, { FilterOptions } from '@/components/DashboardFilters';
import { exportToCSV, exportToExcel, formatDataForExport } from '@/utils/exportUtils';

interface DashboardStats {
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
  monthLeads: number;
  leadsByDay: Array<{ date: string; count: number; weekday: string }>;
  leadsByHour: Array<{ hour: number; count: number }>;
  leadsByVar1: Array<{ var1: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const LeadsDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: { start: '', end: '' },
    source: '',
    responsible: '',
    status: '',
    searchTerm: '',
  });
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableResponsibles, setAvailableResponsibles] = useState<string[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Construir parâmetros de query com filtros
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (filters.dateRange.start) params.append('startDate', filters.dateRange.start);
      if (filters.dateRange.end) params.append('endDate', filters.dateRange.end);
      if (filters.source) params.append('source', filters.source);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.status) params.append('status', filters.status);
      if (filters.searchTerm) params.append('search', filters.searchTerm);

      const response = await api.get(`/api/leads/dashboard?${params.toString()}`);
      
      if (response.ok && response.data) {
        setStats(response.data);
        
        // Extrair fontes e responsáveis únicos para os filtros
        if (response.data.leadsBySource) {
          setAvailableSources(response.data.leadsBySource.map((item: any) => item.source));
        }
        if (response.data.leadsByVar1) {
          setAvailableResponsibles(response.data.leadsByVar1.map((item: any) => item.var1));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/api/leads/export', {
        params: filters
      });
      
      if (response.ok && response.data) {
        const formattedData = formatDataForExport(response.data, 'leads');
        exportToCSV(formattedData, `leads_${new Date().toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/api/leads/export', {
        params: filters
      });
      
      if (response.ok && response.data) {
        const formattedData = formatDataForExport(response.data, 'leads');
        exportToExcel(formattedData, `leads_${new Date().toISOString().split('T')[0]}`, 'Leads');
      }
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
    }
  };

  // Hook para atualizações em tempo real
  const { isUpdating, lastUpdate, forceUpdate } = useRealTimeUpdates(
    fetchDashboardData,
    {
      interval: 30000, // 30 segundos
      enabled: true,
      onUpdate: () => console.log('Dashboard atualizado automaticamente')
    }
  );

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear, filters]);

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Função para gerar todos os dias do mês
  const generateFullMonthData = (leadsByDay: Array<{ date: string; count: number; weekday: string }>) => {
    const year = selectedYear;
    const month = selectedMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const fullMonthData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Procurar dados existentes comparando apenas a parte da data (sem horário)
      const existingData = leadsByDay?.find(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === dateStr;
      });
      
      const dayOfWeek = new Date(year, month - 1, day).getUTCDay();
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      fullMonthData.push({
        date: dateStr,
        day: day,
        count: existingData ? parseInt(existingData.count.toString()) : 0,
        weekday: weekdays[dayOfWeek],
        displayDate: `${day.toString().padStart(2, '0')}`
      });
    }

    return fullMonthData;
  };

  const formatDate = (dateStr: string | number) => {
    if (typeof dateStr === 'number') {
      return dateStr.toString().padStart(2, '0');
    }
    
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros do Dashboard */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        isLoading={loading}
        availableSources={availableSources}
        availableResponsibles={availableResponsibles}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Leads</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Visualize métricas e tendências dos seus leads
            </p>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={forceUpdate}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={forceUpdate}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Todos os leads cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads de hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.weekLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads dos últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads do mês atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Principal - Leads por Dia do Mês */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Leads por Dia - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualização completa de todos os dias do mês com quantidade de leads por dia
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={600}>
            <BarChart 
              data={generateFullMonthData(stats?.leadsByDay || [])}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toString()}
                interval={0}
                angle={0}
                textAnchor="middle"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Quantidade de Leads', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(value) => `Dia ${value}`}
                formatter={(value: number, name: string, props: any) => [
                  value, 
                  `Leads (${props.payload.weekday})`
                ]}
                contentStyle={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                label={{ 
                  position: 'top', 
                  fontSize: 11, 
                  fill: '#374151',
                  formatter: (value: number) => value > 0 ? value : ''
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsDashboard;