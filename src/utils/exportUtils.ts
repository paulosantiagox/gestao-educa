import * as XLSX from 'xlsx';

export interface ExportData {
  [key: string]: any;
}

export const exportToCSV = (data: ExportData[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Obter cabeçalhos das colunas
  const headers = Object.keys(data[0]);
  
  // Criar conteúdo CSV
  const csvContent = [
    headers.join(','), // Cabeçalhos
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar valores que contêm vírgulas ou aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // Criar e baixar arquivo
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: ExportData[], filename: string, sheetName: string = 'Dados') => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Ajustar largura das colunas
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  
  ws['!cols'] = colWidths;
  
  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Salvar arquivo
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const formatDataForExport = (data: any[], type: 'leads' | 'dashboard' | 'weekday-report' | 'hourly-report' = 'leads') => {
  if (!data || data.length === 0) return [];

  switch (type) {
    case 'leads':
      return data.map(item => ({
        ID: item.id,
        Nome: item.nome,
        Email: item.email,
        WhatsApp: item.whatsapp,
        Escola: item.escola,
        Fonte: item.utm_source || 'Direto',
        Responsável: item.var1 || 'Não informado',
        'Data de Cadastro': item.created_at
      }));
    case 'weekday-report':
      return data.map(item => ({
        'Dia da Semana': item.weekday,
        'Quantidade': item.count,
        'Percentual': `${item.percentage}%`
      }));
    case 'hourly-report':
      return data.map(item => ({
        'Horário': `${item.hour}:00`,
        'Quantidade': item.count,
        'Percentual': `${item.percentage}%`,
        'Período': item.period
      }));
    default:
      return data;
  }
};

export const downloadTemplate = (type: 'leads') => {
  const templates = {
    leads: [
      {
        'Nome': 'João Silva',
        'Email': 'joao@email.com',
        'Telefone': '(11) 99999-9999',
        'Fonte': 'Google',
        'Responsável': 'Maria Santos',
        'Status': 'Novo',
        'Observações': 'Lead interessado em curso de programação'
      }
    ]
  };

  const templateData = templates[type];
  exportToExcel(templateData, `template_${type}`, 'Template');
};