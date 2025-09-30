import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWhatsAppTemplates } from '@/contexts/WhatsAppTemplatesContext';
import { toast } from 'sonner';
import { MessageSquare, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_LABELS: Record<string, string> = {
  welcome: 'Boas-Vindas',
  exam_in_progress: 'Prova em Andamento',
  documents_requested: 'Documentação Solicitada',
  documents_under_review: 'Documentação em Análise',
  certification_started: 'Certificação Iniciada',
  digital_certificate_sent: 'Certificado Digital Enviado',
  physical_certificate_sent: 'Certificado Físico Enviado',
  completed: 'Concluído'
};

export function WhatsAppTemplatesSettings() {
  const { templates, updateTemplate, resetTemplates } = useWhatsAppTemplates();
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});

  const handleChange = (status: string, value: string) => {
    setEditedTemplates(prev => ({ ...prev, [status]: value }));
  };

  const handleSave = (status: string) => {
    const newMessage = editedTemplates[status];
    if (newMessage !== undefined) {
      updateTemplate(status, newMessage);
      setEditedTemplates(prev => {
        const updated = { ...prev };
        delete updated[status];
        return updated;
      });
      toast.success('Template atualizado com sucesso!');
    }
  };

  const handleReset = () => {
    resetTemplates();
    setEditedTemplates({});
    toast.success('Templates restaurados para os padrões!');
  };

  const getCurrentMessage = (status: string) => {
    if (editedTemplates[status] !== undefined) {
      return editedTemplates[status];
    }
    return templates.find(t => t.status === status)?.message || '';
  };

  const hasChanges = (status: string) => {
    return editedTemplates[status] !== undefined;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Templates de Mensagens WhatsApp</CardTitle>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar Padrões
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar templates padrão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá restaurar todos os templates para suas mensagens padrão. Todas as personalizações serão perdidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <CardDescription>
          Personalize as mensagens enviadas automaticamente aos alunos. Use <code className="bg-muted px-1 py-0.5 rounded">{'{{nome}}'}</code> para o nome do aluno e <code className="bg-muted px-1 py-0.5 rounded">{'{{codigo_rastreio}}'}</code> para o código de rastreio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="welcome" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            {Object.keys(STATUS_LABELS).map(status => (
              <TabsTrigger key={status} value={status} className="text-xs">
                {STATUS_LABELS[status]}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div>
                <Label htmlFor={`template-${status}`} className="text-base font-semibold">
                  Template: {label}
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Personalize a mensagem que será enviada quando o aluno estiver nesta etapa.
                </p>
              </div>
              
              <Textarea
                id={`template-${status}`}
                value={getCurrentMessage(status)}
                onChange={(e) => handleChange(status, e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              
              <div className="flex justify-end gap-2">
                {hasChanges(status) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedTemplates(prev => {
                        const updated = { ...prev };
                        delete updated[status];
                        return updated;
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={() => handleSave(status)}
                  disabled={!hasChanges(status)}
                >
                  Salvar Template
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
