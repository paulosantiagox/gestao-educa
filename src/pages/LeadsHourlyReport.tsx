import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, TrendingUp, BarChart3, RefreshCw, Download, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { exportToCSV, exportToExcel, formatDataForExport } from '@/utils/exportUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HourlyData {
  hour: number;
  count: number;
  percentage: number;
  period: string;
}

interface PeriodData {
  period: string;
  count: number;
  percentage: number;
}

interface ReportData {
  hourlyStats: HourlyData[];
  periodStats: PeriodData[];
  totalLeads: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const PERIOD_ICONS = {
  'Manhã': Sun,
  'Tarde': Sunset,
  'Noite': Moon,
  'Madrugada': Sunrise
};

const LeadsHourlyReport: React.FC = () => {
  const [data, setData] = useState<ReportData>({ hourlyStats: [], periodStats: [], totalLeads: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    source: '',
    responsible: ''
  });
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableResponsibles, setAvailableResponsibles] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.source) params.append('source', filters.source);
      if (filters.responsible) params.append('responsible', filters.responsible);

      const response = await api.get(`/api/leads/analytics/hourly?${params.toString()}`);
      
      if (response.ok && response.data) {
        setData(response.data);
      }

      // Buscar opções para filtros
      const dashboardResponse = await api.get('/api/leads/dashboard');
      if (dashboardResponse.ok && dashboardResponse.data) {
        if (dashboardResponse.data.leadsBySource) {
          setAvailableSources(dashboardResponse.data.leadsBySource.map((item: any) => item.source));
        }
        if (dashboardResponse.data.leadsByVar1) {
          setAvailableResponsibles(dashboardResponse.data.leadsByVar1.map((item: any) => item.var1));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const { lastUpdate, forceUpdate, isUpdating } = useRealTimeUpdates(
    fetchData,
    {
      interval: 30000,
      onUpdate: () => {
        console.log('Dados do relatório por horário atualizados automaticamente');
      }
    }
  );

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleExportCSV = async () => {
    const exportData = formatDataForExport(data.hourlyStats, 'hourly-report');
    exportToCSV(exportData, `relatorio-horario-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportExcel = async () => {
    const exportData = formatDataForExport(data.hourlyStats, 'hourly-report');
    exportToExcel(exportData, `relatorio-horario-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const getBestHour = () => {
    if (data.hourlyStats.length === 0) return null;
    return data.hourlyStats.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    );
  };

  const getWorstHour = () => {
    if (data.hourlyStats.length === 0) return null;
    return data.hourlyStats.reduce((prev, current) => 
      (prev.count < current.count) ? prev : current
    );
  };

  const getBestPeriod = () => {
    if (data.periodStats.length === 0) return null;
    return data.periodStats.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    );
  };

  const bestHour = getBestHour();
  const worstHour = getWorstHour();
  const bestPeriod = getBestPeriod();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório por Horário</h1>
          <p className="text-muted-foreground">
            Análise de leads por horário do dia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={forceUpdate}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fonte</label>
              <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as fontes</SelectItem>
                  {availableSources.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Responsável</label>
              <Select value={filters.responsible} onValueChange={(value) => setFilters(prev => ({ ...prev, responsible: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os responsáveis</SelectItem>
                  {availableResponsibles.map((responsible) => (
                    <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{data.totalLeads}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Horário</p>
                <p className="text-2xl font-bold">{bestHour ? `${bestHour.hour}:00` : 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{bestHour?.count || 0} leads</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pior Horário</p>
                <p className="text-2xl font-bold">{worstHour ? `${worstHour.hour}:00` : 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{worstHour?.count || 0} leads</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Período</p>
                <p className="text-2xl font-bold">{bestPeriod?.period || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{bestPeriod?.count || 0} leads</p>
              </div>
              {bestPeriod && PERIOD_ICONS[bestPeriod.period as keyof typeof PERIOD_ICONS] && 
                React.createElement(PERIOD_ICONS[bestPeriod.period as keyof typeof PERIOD_ICONS], { 
                  className: "h-8 w-8 text-orange-600" 
                })
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras por Horário */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.hourlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `${value}:00`}
                  formatter={(value: any) => [value, 'Leads']}
                />
                <Bar dataKey="count" fill="#8884d8" label={{ position: 'top', fontSize: 12, fill: '#333' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza por Período */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.periodStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ period, percentage }) => `${period}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.periodStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha - Tendência por Horário */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Leads ao Longo do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={(value) => `${value}:00`}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `${value}:00`}
                formatter={(value: any) => [value, 'Leads']}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                label={{ position: 'top', fontSize: 12, fill: '#333' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabelas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela por Período */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Período</th>
                    <th className="text-right p-2">Quantidade</th>
                    <th className="text-right p-2">Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periodStats.map((period) => (
                    <tr key={period.period} className="border-b">
                      <td className="p-2 font-medium flex items-center gap-2">
                        {PERIOD_ICONS[period.period as keyof typeof PERIOD_ICONS] && 
                          React.createElement(PERIOD_ICONS[period.period as keyof typeof PERIOD_ICONS], { 
                            className: "h-4 w-4" 
                          })
                        }
                        {period.period}
                      </td>
                      <td className="text-right p-2">{period.count}</td>
                      <td className="text-right p-2">{period.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela por Horário (Top 10) */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Horários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Horário</th>
                    <th className="text-right p-2">Quantidade</th>
                    <th className="text-right p-2">Percentual</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hourlyStats
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((hour, index) => (
                    <tr key={hour.hour} className="border-b">
                      <td className="p-2 font-medium">{hour.hour}:00</td>
                      <td className="text-right p-2">{hour.count}</td>
                      <td className="text-right p-2">{hour.percentage}%</td>
                      <td className="text-center p-2">
                        <Badge 
                          variant={index === 0 ? "default" : 
                                  index < 3 ? "secondary" : "outline"}
                        >
                          {index === 0 ? "Melhor" : 
                           index < 3 ? `Top ${index + 1}` : "Normal"}
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
    </div>
  );
};

export default LeadsHourlyReport;