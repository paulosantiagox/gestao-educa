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

interface LeadsByVar1Data {
  var1: string;
  count: number;
  percentage: number;
}

interface DashboardData {
  totalLeads: number;
  totalResponsibles: number;
  averageLeadsPerResponsible: number;
  topResponsible: {
    name: string;
    count: number;
  };
  leadsByVar1: LeadsByVar1Data[];
  monthlyComparison: {
    current: number;
    previous: number;
    growth: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function LeadsVar1Dashboard() {
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
          totalResponsibles: dashboardData.leadsByVar1?.length || 0,
          averageLeadsPerResponsible: dashboardData.leadsByVar1?.length > 0 
            ? Math.round(dashboardData.totalLeads / dashboardData.leadsByVar1.length) 
            : 0,
          topResponsible: dashboardData.leadsByVar1?.[0] 
            ? { name: dashboardData.leadsByVar1[0].var1, count: dashboardData.leadsByVar1[0].count }
            : { name: 'N/A', count: 0 },
          leadsByVar1: dashboardData.leadsByVar1?.map((item: any, index: number) => ({
            var1: item.var1,
            count: item.count,
            percentage: dashboardData.totalLeads > 0 ? Math.round((item.count / dashboardData.totalLeads) * 100) : 0
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
      onUpdate: () => console.log('Dashboard de responsáveis atualizado automaticamente')
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
          <h1 className="text-3xl font-bold">Dashboard por Responsável</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Análise de leads agrupados por responsável (var1)
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
            <CardTitle className="text-sm font-medium">Total de Responsáveis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalResponsibles}</div>
            <p className="text-xs text-muted-foreground">
              Responsáveis ativos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Responsável</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageLeadsPerResponsible}</div>
            <p className="text-xs text-muted-foreground">
              Leads por responsável
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Responsável</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topResponsible.count}</div>
            <p className="text-xs text-muted-foreground">
              {data.topResponsible.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento Mensal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.monthlyComparison.growth > 0 ? '+' : ''}{data.monthlyComparison.growth}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. mês anterior ({data.monthlyComparison.previous})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Leads por Responsável */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.leadsByVar1.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="var1" 
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

        {/* Gráfico de Pizza - Distribuição Percentual */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Percentual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsByVar1.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ var1, percentage }) => `${var1}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.leadsByVar1.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Detalhado de Responsáveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Posição</th>
                  <th className="text-left p-2">Responsável</th>
                  <th className="text-left p-2">Quantidade de Leads</th>
                  <th className="text-left p-2">Percentual</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.leadsByVar1.map((item, index) => (
                  <tr key={item.var1} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">{item.var1}</td>
                    <td className="p-2">{item.count}</td>
                    <td className="p-2">{item.percentage}%</td>
                    <td className="p-2">
                      <Badge 
                        variant={
                          item.count >= data.averageLeadsPerResponsible ? "default" : 
                          item.count >= data.averageLeadsPerResponsible * 0.5 ? "secondary" : 
                          "destructive"
                        }
                      >
                        {item.count >= data.averageLeadsPerResponsible ? "Acima da Média" : 
                         item.count >= data.averageLeadsPerResponsible * 0.5 ? "Na Média" : 
                         "Abaixo da Média"}
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