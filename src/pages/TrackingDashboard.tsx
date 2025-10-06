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
  AreaChart,
  Area,
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
  Activity,
  MapPin,
  Smartphone,
  Monitor,
} from "lucide-react";
import { api } from "@/lib/api";
import { DomainForm } from "@/components/forms/DomainForm";
import { DomainsList } from "@/components/DomainsList";

interface TrackingStats {
  totalPageviews: number;
  uniqueVisitors: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; percentage: number }>;
  deviceTypes: Array<{ device: string; count: number; percentage: number }>;
  browsers: Array<{ browser: string; count: number; percentage: number }>;
  countries: Array<{ country: string; count: number; percentage: number }>;
  hourlyTraffic: Array<{ hour: number; pageviews: number; sessions: number }>;
  dailyTraffic: Array<{ date: string; pageviews: number; sessions: number; visitors: number }>;
  interactions: Array<{ type: string; count: number }>;
  events: Array<{ event: string; count: number }>;
  // Novos campos para dados detalhados
  recentSessions?: Array<{
    session_id: string;
    domain: string;
    ip_address: string;
    country: string;
    city: string;
    device_type: string;
    browser: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    referrer?: string;
    created_at: string;
    last_activity: string;
    is_active: boolean;
  }>;
  recentPageviews?: Array<{
    id: number;
    session_id: string;
    page_url: string;
    page_title: string;
    time_on_page: number;
    scroll_depth: number;
    viewed_at: string;
    domain: string;
    device_type: string;
    country: string;
    city: string;
  }>;
  recentInteractions?: Array<{
    id: number;
    session_id: string;
    interaction_type: string;
    element_type: string;
    element_text?: string;
    click_x?: number;
    click_y?: number;
    page_url: string;
    interaction_at: string;
    domain: string;
    device_type: string;
  }>;
  recentEvents?: Array<{
    id: number;
    session_id: string;
    event_name: string;
    event_category: string;
    event_action: string;
    event_label?: string;
    event_value?: number;
    page_url: string;
    event_at: string;
    domain: string;
    device_type: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const TrackingDashboard: React.FC = () => {
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [domains, setDomains] = useState<Array<{ id: number; domain: string; tracking_code: string }>>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      setDomainsLoading(true);
      setError(null);
      const response = await fetch('https://gestao-educa.autoflixtreinamentos.com/api/tracking/domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
        if (data.length > 0 && !selectedDomain) {
          setSelectedDomain(data[0].domain);
        }
      } else {
        setError('Erro ao carregar domínios');
      }
    } catch (error) {
      console.error('Erro ao carregar domínios:', error);
      setError('Erro de conexão ao carregar domínios');
    } finally {
      setDomainsLoading(false);
    }
  };

  const fetchTrackingData = async () => {
    if (!selectedDomain) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        domain: selectedDomain,
        period: dateRange,
      });

      const response = await fetch(`https://gestao-educa.autoflixtreinamentos.com/api/tracking/analytics?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Erro ao carregar dados de analytics');
      }
    } catch (error) {
      console.error("Erro ao carregar dados de tracking:", error);
      setError('Erro de conexão ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchTrackingData();
    }
  }, [selectedDomain, dateRange]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (domainsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando domínios...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Erro</p>
          <p>{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  // Se não há domínios cadastrados, mostra tela de boas-vindas
  if (domains.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Tracking</h1>
          <p className="text-muted-foreground">Analytics e métricas de comportamento dos usuários</p>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Globe className="h-6 w-6" />
              Bem-vindo ao Sistema de Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Para começar a usar o dashboard de analytics, você precisa adicionar pelo menos um domínio.
            </p>
            <DomainForm onDomainAdded={fetchDomains} />
            <div className="text-sm text-muted-foreground">
              <p>Após adicionar um domínio, você poderá:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Visualizar métricas em tempo real</li>
                <li>Acompanhar visitantes únicos e sessões</li>
                <li>Analisar páginas mais visitadas</li>
                <li>Ver dados de dispositivos e localização</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Tracking</h1>
          <p className="text-muted-foreground">Analytics e métricas de comportamento dos usuários</p>
        </div>
        
        <div className="flex gap-2">
          <DomainForm onDomainAdded={fetchDomains} />
          
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar domínio" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.domain}>
                  {domain.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Hoje</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchTrackingData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stats && (
        <>
          {/* Cards de métricas principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPageviews?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">Total de páginas vistas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitantes Únicos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueVisitors?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">Usuários únicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessões</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSessions?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">Total de sessões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(stats.averageSessionDuration || 0)}</div>
                <p className="text-xs text-muted-foreground">Por sessão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Rejeição</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(stats.bounceRate || 0)}</div>
                <p className="text-xs text-muted-foreground">Bounce rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de tráfego */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tráfego Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.dailyTraffic || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="pageviews" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="sessions" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tráfego por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.hourlyTraffic || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="pageviews" stroke="#8884d8" />
                    <Line type="monotone" dataKey="sessions" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Páginas mais visitadas e dispositivos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Páginas Mais Visitadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(stats.topPages || []).slice(0, 10).map((page, index) => (
                    <div key={page.page} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-48" title={page.page}>
                          {page.page}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{page.views}</div>
                        <div className="text-xs text-muted-foreground">{formatPercentage(page.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dispositivos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.deviceTypes || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ device, percentage }) => `${device} (${formatPercentage(percentage)})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(stats.deviceTypes || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Navegadores e países */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Navegadores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(stats.browsers || []).slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="browser" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Países</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(stats.countries || []).slice(0, 10).map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{country.count}</div>
                        <div className="text-xs text-muted-foreground">{formatPercentage(country.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interações e eventos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Interações</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.interactions || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos Personalizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(stats.events || []).slice(0, 10).map((event, index) => (
                    <div key={event.event} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{event.event}</span>
                      </div>
                      <div className="text-sm font-bold">{event.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seções de dados detalhados com datetime */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Sessões Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sessões Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(stats.recentSessions || []).map((session) => (
                    <div key={session.session_id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.is_active ? "default" : "secondary"}>
                            {session.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {String(session.session_id).substring(0, 8)}...
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Domínio:</span>
                          <div className="font-medium">{session.domain}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dispositivo:</span>
                          <div className="font-medium flex items-center gap-1">
                            {session.device_type === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            {session.device_type}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Localização:</span>
                          <div className="font-medium">{session.city || 'N/A'}, {session.country || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Navegador:</span>
                          <div className="font-medium">{session.browser}</div>
                        </div>
                        {session.referrer && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Referrer:</span>
                            <div className="font-medium text-xs truncate" title={session.referrer}>
                              {session.referrer}
                            </div>
                          </div>
                        )}
                        {(session.utm_source || session.utm_medium || session.utm_campaign) && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">UTM:</span>
                            <div className="font-medium text-xs">
                              {session.utm_source && `Source: ${session.utm_source}`}
                              {session.utm_medium && ` | Medium: ${session.utm_medium}`}
                              {session.utm_campaign && ` | Campaign: ${session.utm_campaign}`}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Última atividade: {new Date(session.last_activity).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {(!stats.recentSessions || stats.recentSessions.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhuma sessão encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Visualizações de Página Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualizações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(stats.recentPageviews || []).map((pageview) => (
                    <div key={pageview.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate max-w-48" title={pageview.page_url}>
                          {pageview.page_url}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(pageview.viewed_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      {pageview.page_title && (
                        <div className="text-xs text-muted-foreground truncate" title={pageview.page_title}>
                          {pageview.page_title}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Tempo na página:</span>
                          <div className="font-medium">
                            {pageview.time_on_page ? formatDuration(pageview.time_on_page) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Scroll:</span>
                          <div className="font-medium">{pageview.scroll_depth}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dispositivo:</span>
                          <div className="font-medium flex items-center gap-1">
                            {pageview.device_type === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            {pageview.device_type}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Localização:</span>
                          <div className="font-medium">{pageview.city || 'N/A'}, {pageview.country || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sessão: {String(pageview.session_id).substring(0, 8)}...
                      </div>
                    </div>
                  ))}
                  {(!stats.recentPageviews || stats.recentPageviews.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhuma visualização encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interações e Eventos Recentes */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Interações Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  Interações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(stats.recentInteractions || []).map((interaction) => (
                    <div key={interaction.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {interaction.interaction_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {interaction.element_type}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(interaction.interaction_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      {interaction.element_text && (
                        <div className="text-sm font-medium truncate" title={interaction.element_text}>
                          "{interaction.element_text}"
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Página:</span>
                          <div className="font-medium truncate" title={interaction.page_url}>
                            {interaction.page_url}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dispositivo:</span>
                          <div className="font-medium flex items-center gap-1">
                            {interaction.device_type === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            {interaction.device_type}
                          </div>
                        </div>
                        {(interaction.click_x !== null && interaction.click_y !== null) && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Posição do clique:</span>
                            <div className="font-medium">X: {interaction.click_x}, Y: {interaction.click_y}</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sessão: {String(interaction.session_id).substring(0, 8)}...
                      </div>
                    </div>
                  ))}
                  {(!stats.recentInteractions || stats.recentInteractions.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhuma interação encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Eventos Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Eventos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(stats.recentEvents || []).map((event) => (
                    <div key={event.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            {event.event_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.event_category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.event_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Ação:</span>
                          <div className="font-medium">{event.event_action}</div>
                        </div>
                        {event.event_label && (
                          <div>
                            <span className="text-muted-foreground">Label:</span>
                            <div className="font-medium">{event.event_label}</div>
                          </div>
                        )}
                        {event.event_value !== null && (
                          <div>
                            <span className="text-muted-foreground">Valor:</span>
                            <div className="font-medium">{event.event_value}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Dispositivo:</span>
                          <div className="font-medium flex items-center gap-1">
                            {event.device_type === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            {event.device_type}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Página:</span>
                          <div className="font-medium truncate" title={event.page_url}>
                            {event.page_url}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sessão: {String(event.session_id).substring(0, 8)}...
                      </div>
                    </div>
                  ))}
                  {(!stats.recentEvents || stats.recentEvents.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhum evento encontrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Lista de domínios com botões para gerar código */}
      <DomainsList domains={domains} />
    </div>
  );
};

export default TrackingDashboard;