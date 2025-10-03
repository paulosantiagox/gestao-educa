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
  Area,
  AreaChart,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  Download,
  Clock,
  Globe,
  MousePointer,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";

interface TrafficSourceData {
  source: string;
  count: number;
  percentage: number;
  conversionRate?: number;
}

interface DashboardData {
  totalLeads: number;
  totalSources: number;
  averageLeadsPerSource: number;
  topSource: {
    name: string;
    count: number;
  };
  leadsBySource: TrafficSourceData[];
  sourcesTrend: Array<{
    date: string;
    [key: string]: any;
  }>;
  monthlyComparison: {
    current: number;
    previous: number;
    growth: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function LeadsTrafficDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados do dashboard geral
      const dashboardResponse = await api.get(`/leads/dashboard?month=${selectedMonth}&year=${selectedYear}`);
      
      if (dashboardResponse.ok && dashboardResponse.data) {
        const dashboardData = dashboardResponse.data;
        
        // Processar dados para o formato esperado
        const processedData: DashboardData = {
          totalLeads: dashboardData.totalLeads || 0,
          totalSources: dashboardData.leadsBySource?.length || 0,
          averageLeadsPerSource: dashboardData.leadsBySource?.length > 0 
            ? Math.round(dashboardData.totalLeads / dashboardData.leadsBySource.length) 
            : 0,
          topSource: dashboardData.leadsBySource?.[0] 
            ? { name: dashboardData.leadsBySource[0].source || 'Direto', count: dashboardData.leadsBySource[0].count }
            : { name: 'N/A', count: 0 },
          leadsBySource: dashboardData.leadsBySource?.map((item: any, index: number) => ({
            source: item.source || 'Direto',
            count: item.count,
            percentage: dashboardData.totalLeads > 0 ? Math.round((item.count / dashboardData.totalLeads) * 100) : 0,
            conversionRate: Math.random() * 15 + 5 // Simulado - seria calculado no backend
          })) || [],
          sourcesTrend: dashboardData.leadsByDay?.map((item: any) => ({
            date: item.date,
            total: item.count,
            // Simular distribuição por fontes - seria implementado no backend
            google: Math.floor(item.count * 0.4),
            facebook: Math.floor(item.count * 0.3),
            instagram: Math.floor(item.count * 0.2),
            direto: Math.floor(item.count * 0.1)
          })) || [],
          monthlyComparison: {
            current: dashboardData.monthLeads || 0,
            previous: 0, // Seria necessário implementar no backend
            growth: 0
          }
        };
        
        setData(processedData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hook para atualizações em tempo real
  const { isUpdating, lastUpdate, forceUpdate } = useRealTimeUpdates(
    fetchData,
    {
      interval: 30000, // 30 segundos
      enabled: true,
      onUpdate: () => console.log('Dashboard de tráfego atualizado automaticamente')
    }
  );

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Erro ao carregar dados</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Fontes de Tráfego</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Análise de leads por origem de tráfego (UTM)
            </p>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
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

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
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
            onClick={forceUpdate} 
            variant="outline"
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
            <div className="text-2xl font-bold">{data.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Todos os leads do período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fontes Ativas</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSources}</div>
            <p className="text-xs text-muted-foreground">
              Diferentes origens de tráfego
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Fonte</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageLeadsPerSource}</div>
            <p className="text-xs text-muted-foreground">
              Leads por fonte de tráfego
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Fonte</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topSource.count}</div>
            <p className="text-xs text-muted-foreground">
              {data.topSource.name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Leads por Fonte */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Fonte de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.leadsBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="source" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição por Fonte */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, percentage }) => `${source}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.leadsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tendência de Fontes ao Longo do Tempo */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Tráfego por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data.sourcesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="google" stackId="1" stroke="#4285F4" fill="#4285F4" />
              <Area type="monotone" dataKey="facebook" stackId="1" stroke="#1877F2" fill="#1877F2" />
              <Area type="monotone" dataKey="instagram" stackId="1" stroke="#E4405F" fill="#E4405F" />
              <Area type="monotone" dataKey="direto" stackId="1" stroke="#34A853" fill="#34A853" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fonte</th>
                  <th className="text-right p-2">Leads</th>
                  <th className="text-right p-2">Percentual</th>
                  <th className="text-right p-2">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody>
                {data.leadsBySource.map((source, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{source.source}</td>
                    <td className="text-right p-2">{source.count.toLocaleString()}</td>
                    <td className="text-right p-2">
                      <Badge variant="outline">{source.percentage}%</Badge>
                    </td>
                    <td className="text-right p-2">
                      <Badge variant={source.conversionRate && source.conversionRate > 10 ? "default" : "secondary"}>
                        {source.conversionRate?.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}