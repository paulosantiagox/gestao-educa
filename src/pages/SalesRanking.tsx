import { useState, useMemo } from "react";
import { Calendar, Trophy, TrendingUp, Users, DollarSign, BarChart3, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

import { formatDateTimeSP } from "@/lib/date-utils";
import * as XLSX from 'xlsx';

interface SaleData {
  id: number;
  sale_code: string;
  payer_name: string;
  total_amount: number;
  payment_status: string;
  sale_date: string;
  created_at: string;
  utm_consultor?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface RankingData {
  consultor: string;
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  vendas: SaleData[];
}

const SalesRanking = () => {
  // Função para formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  // Buscar todas as vendas
  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sales-ranking"],
    queryFn: async () => {
      const result = await api.getSales({ search: "" });
      return result.ok ? (((result.data as any)?.sales) || []) : [];
    },
  });

  // Filtrar vendas mensais
  const monthlySales = useMemo(() => {
    return allSales.filter((sale: SaleData) => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      return saleMonth === selectedMonth;
    });
  }, [allSales, selectedMonth]);

  // Filtrar vendas diárias
  const dailySales = useMemo(() => {
    return allSales.filter((sale: SaleData) => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const saleDateStr = saleDate.toISOString().split('T')[0];
      return saleDateStr === selectedDate;
    });
  }, [allSales, selectedDate]);

  // Função para calcular ranking
  const calculateRanking = (sales: SaleData[]) => {
    const consultorMap = new Map<string, RankingData>();

    sales.forEach((sale: SaleData) => {
      const consultor = sale.utm_consultor || 'Não Identificado';
      const amount = parseFloat(sale.total_amount?.toString() || '0');

      if (!consultorMap.has(consultor)) {
        consultorMap.set(consultor, {
          consultor,
          totalVendas: 0,
          quantidadeVendas: 0,
          ticketMedio: 0,
          vendas: []
        });
      }

      const data = consultorMap.get(consultor)!;
      data.totalVendas += amount;
      data.quantidadeVendas += 1;
      data.vendas.push(sale);
    });

    // Calcular ticket médio e ordenar por total de vendas
    const ranking = Array.from(consultorMap.values()).map(data => ({
      ...data,
      ticketMedio: data.quantidadeVendas > 0 ? data.totalVendas / data.quantidadeVendas : 0
    })).sort((a, b) => b.totalVendas - a.totalVendas);

    return ranking;
  };

  // Ranking mensal e diário
  const monthlyRanking = useMemo(() => calculateRanking(monthlySales), [monthlySales]);
  const dailyRanking = useMemo(() => calculateRanking(dailySales), [dailySales]);

  // Função para calcular métricas
  const calculateMetrics = (sales: SaleData[]) => {
    const total = sales.reduce((sum: number, sale: SaleData) => 
      sum + parseFloat(sale.total_amount?.toString() || '0'), 0);
    const quantidade = sales.length;
    const ticketMedio = quantidade > 0 ? total / quantidade : 0;
    const vendasRastreadas = sales.filter((sale: SaleData) => sale.utm_consultor).length;
    const vendasNaoRastreadas = quantidade - vendasRastreadas;

    return {
      total,
      quantidade,
      ticketMedio,
      vendasRastreadas,
      vendasNaoRastreadas,
      percentualRastreado: quantidade > 0 ? (vendasRastreadas / quantidade) * 100 : 0
    };
  };

  // Métricas mensais e diárias
  const monthlyMetrics = useMemo(() => calculateMetrics(monthlySales), [monthlySales]);
  const dailyMetrics = useMemo(() => calculateMetrics(dailySales), [dailySales]);

  // Exportar para Excel
  const exportToExcel = (type: 'monthly' | 'daily') => {
    const ranking = type === 'monthly' ? monthlyRanking : dailyRanking;
    const period = type === 'monthly' ? selectedMonth : selectedDate;
    
    const exportData = ranking.map((item, index) => ({
      'Posição': index + 1,
      'Consultor': item.consultor,
      'Total de Vendas': formatCurrency(item.totalVendas),
      'Quantidade de Vendas': item.quantidadeVendas,
      'Ticket Médio': formatCurrency(item.ticketMedio)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ranking ${type === 'monthly' ? 'Mensal' : 'Diário'}`);
    
    XLSX.writeFile(wb, `ranking-vendas-${type}-${period}.xlsx`);
  };

  // Componente de tabela de ranking
  const RankingTable = ({ ranking, title, type }: { ranking: RankingData[], title: string, type: 'monthly' | 'daily' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {title}
        </CardTitle>
        <Button onClick={() => exportToExcel(type)} size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma venda encontrada para o período selecionado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos.</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-right">Qtd. Vendas</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((item, index) => (
                <TableRow key={item.consultor}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                      {index === 1 && <Trophy className="h-4 w-4 text-gray-400" />}
                      {index === 2 && <Trophy className="h-4 w-4 text-amber-600" />}
                      <span className="font-medium">{index + 1}º</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.consultor}</span>
                      {item.consultor === 'Não Identificado' && (
                        <Badge variant="secondary">Sem UTM</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.totalVendas)}
                  </TableCell>
                  <TableCell className="text-right">{item.quantidadeVendas}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.ticketMedio)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // Componente de métricas
  const MetricsCards = ({ metrics, title }: { metrics: any, title: string }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Vendas - {title}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.total)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quantidade - {title}</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.quantidade}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio - {title}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rastreamento - {title}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.percentualRastreado.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {metrics.vendasRastreadas} rastreadas, {metrics.vendasNaoRastreadas} não rastreadas
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ranking de Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das vendedoras - Rankings Mensal e Diário
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mês:</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Data:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Mensais */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">📊 Ranking Mensal</h2>
        <MetricsCards metrics={monthlyMetrics} title="Mensal" />
        <RankingTable ranking={monthlyRanking} title="Ranking Mensal de Vendas" type="monthly" />
      </div>

      {/* Métricas Diárias */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">📈 Ranking Diário</h2>
        <MetricsCards metrics={dailyMetrics} title="Diário" />
        <RankingTable ranking={dailyRanking} title="Ranking Diário de Vendas" type="daily" />
      </div>
    </div>
  );
};

export default SalesRanking;