import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ImportResult {
  success: number;
  errors: number;
  duplicates: number;
  details: Array<{
    line: number;
    error?: string;
    success?: boolean;
    id?: number;
    existing_id?: number;
  }>;
}

interface CSVData {
  headers: string[];
  rows: any[][];
}

const LeadsImport: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapeamento de campos CSV para campos da tabela
  const fieldMapping = {
    'whatsapp': 'WhatsApp',
    'escola': 'Escola',
    'data_cadastro': 'Data Cadastro',
    'var1': 'Responsável (Var1)',
    'var2': 'Var2',
    'utm_source': 'UTM Source',
    'id-bot': 'ID Bot',
    'nome': 'Nome',
    'email': 'Email',
    'utm': 'UTM',
    'utm_campaign': 'UTM Campaign',
    'utm_term': 'UTM Term',
    'utm_content': 'UTM Content',
    'utm_medium': 'UTM Medium',
    'lancamento': 'Lançamento',
    'apenas_data': 'Apenas Data',
    'var3': 'Var3',
    'URL da página': 'URL da Página',
    'error': 'Error',
    'pairedItem': 'Paired Item'
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV deve ter pelo menos cabeçalho e uma linha de dados');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      // Não filtrar linhas vazias - importar todas as linhas, incluindo vazias
      const rows = lines.slice(1).map(line => parseCSVLine(line));

      setCsvData({ headers, rows });
      setImportResult(null);
      toast.success(`Arquivo carregado: ${rows.length} registros encontrados (incluindo linhas vazias)`);
    };

    reader.readAsText(file);
  };

  const processCSVData = () => {
    if (!csvData) return [];

    return csvData.rows.map(row => {
      const lead: any = {};
      csvData.headers.forEach((header, index) => {
        const value = row[index];
        // Incluir todos os valores, mesmo vazios
        lead[header] = value || '';
      });
      return lead;
    });
  };

  const handleImport = async () => {
    if (!csvData) return;

    setIsUploading(true);
    try {
      const leads = processCSVData();
      
      const response = await api.post('/api/leads/import', { leads });
      
      setImportResult(response.data.results);
      
      toast.success(
        `Importação concluída! ${response.data.results.success} leads importados com sucesso`
      );
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(error.response?.data?.error || 'Erro ao importar leads');
    } finally {
      setIsUploading(false);
    }
  };

  const clearData = () => {
    setCsvData(null);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = Object.keys(fieldMapping).join(',');
    const sampleRow = [
      '5511999999999', // whatsapp
      'Escola Exemplo', // escola
      '2024-01-15', // data_cadastro
      'João Silva', // var1
      'Valor2', // var2
      'google', // utm_source
      'bot123', // id-bot
      'Maria Santos', // nome
      'maria@email.com', // email
      'utm_exemplo', // utm
      'campanha_teste', // utm_campaign
      'termo_teste', // utm_term
      'conteudo_teste', // utm_content
      'cpc', // utm_medium
      'Lançamento 2024', // lancamento
      '2024-01-15', // apenas_data
      'Var3 Exemplo', // var3
      'https://exemplo.com/pagina', // URL da página
      '', // error
      'item_pareado' // pairedItem
    ].join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importação de Leads</h1>
          <p className="text-muted-foreground">
            Importe leads em lote através de arquivo CSV
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Baixar Template
        </Button>
      </div>

      {/* Upload de Arquivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload do Arquivo CSV
          </CardTitle>
          <CardDescription>
            Selecione um arquivo CSV com os dados dos leads para importar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {csvData && (
              <Button onClick={clearData} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>

          {csvData && (
            <Alert>
              <FileText className="w-4 h-4" />
              <AlertDescription>
                Arquivo carregado: <strong>{csvData.rows.length} registros</strong> encontrados
                com <strong>{csvData.headers.length} campos</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Mapeamento de Campos */}
      {csvData && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Campos</CardTitle>
            <CardDescription>
              Campos detectados no seu arquivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {csvData.headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="min-w-0 flex-1">
                    {header}
                  </Badge>
                  {fieldMapping[header as keyof typeof fieldMapping] && (
                    <Badge variant="secondary">
                      {fieldMapping[header as keyof typeof fieldMapping]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Visualizar'} Dados
              </Button>
              
              <Button
                onClick={handleImport}
                disabled={isUploading}
                className="flex-1 max-w-xs"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {csvData.rows.length} Leads
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview dos Dados */}
      {csvData && showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
            <CardDescription>
              Primeiras 5 linhas do arquivo (máximo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {csvData.headers.map((header, index) => (
                      <th key={index} className="border border-gray-300 p-2 text-left text-sm font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 p-2 text-sm">
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado da Importação */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                  <p className="text-2xl font-bold text-green-600">
                    {importResult.success}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Duplicatas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {importResult.duplicates}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">
                    {importResult.errors}
                  </p>
                </div>
              </div>
            </div>

            {importResult.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detalhes:</h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {importResult.details.map((detail, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        detail.success
                          ? 'bg-green-50 text-green-700'
                          : detail.existing_id
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <strong>Linha {detail.line}:</strong>{' '}
                      {detail.success
                        ? `Importado com sucesso (ID: ${detail.id})`
                        : detail.existing_id
                        ? `Duplicata encontrada (ID existente: ${detail.existing_id})`
                        : detail.error
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeadsImport;