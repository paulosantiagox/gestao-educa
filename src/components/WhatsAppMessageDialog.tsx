import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeSP } from '@/lib/date-utils';

interface WhatsAppMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentPhone: string;
  initialMessage: string;
  statusLabel: string;
  certification?: any;
}

const TIMELINE_STEPS = [
  { status: "welcome", label: "🎉 Boas-vindas", field: "created_at" },
  { status: "exam_in_progress", label: "📝 Prova Iniciada", field: "exam_started_at" },
  { status: "documents_requested", label: "📄 Documentos Solicitados", field: "documents_requested_at" },
  { status: "documents_under_review", label: "🔍 Documentos em Análise", field: "documents_under_review_at" },
  { status: "certification_started", label: "⚙️ Certificação Iniciada", field: "certification_started_at" },
  { status: "digital_certificate_sent", label: "📧 Certificado Digital Enviado", field: "digital_certificate_sent_at" },
  { status: "physical_certificate_sent", label: "📦 Certificado Físico Enviado", field: "physical_certificate_sent_at" },
  { status: "completed", label: "🎓 Concluído", field: "completed_at" },
];

export function WhatsAppMessageDialog({
  open,
  onOpenChange,
  studentName,
  studentPhone,
  initialMessage,
  statusLabel,
  certification
}: WhatsAppMessageDialogProps) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);

  // Atualizar mensagem quando o dialog abrir ou initialMessage mudar
  useEffect(() => {
    if (open && certification) {
      const timeline = generateTimeline(certification);
      setMessage(`${initialMessage}\n\n${timeline}`);
    }
  }, [open, initialMessage, certification]);

  const generateTimeline = (cert: any) => {
    let timeline = "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    timeline += "📊 *RESUMO DO PROCESSO*\n";
    timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    // Filtrar etapas - remover certificado físico se o aluno não quiser
    const filteredSteps = TIMELINE_STEPS.filter(step => {
      if (step.status === "physical_certificate_sent" && !cert.wants_physical) {
        return false;
      }
      return true;
    });

    const currentIndex = filteredSteps.findIndex(s => s.status === cert.status);

    filteredSteps.forEach((step, index) => {
      const dateValue = cert[step.field];
      const isCompleted = index < currentIndex || (index === currentIndex && dateValue);
      const isCurrent = index === currentIndex;
      
      if (isCompleted) {
        timeline += `${step.label}\n`;
        timeline += `✅ ${formatDateTimeSP(dateValue)}\n\n`;
      } else if (isCurrent) {
        timeline += `${step.label}\n`;
        timeline += dateValue ? `✅ ${formatDateTimeSP(dateValue)}\n\n` : `⏳ Em andamento...\n\n`;
      } else {
        timeline += `${step.label}\n`;
        timeline += `○ Aguardando...\n\n`;
      }
    });

    if (cert.wants_physical && cert.physical_tracking_code) {
      timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      timeline += `📦 *Código de Rastreio:*\n${cert.physical_tracking_code}\n`;
    }

    timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    timeline += "🔍 *Consulte seu status a qualquer momento:*\n";
    timeline += "https://ejaeducabrasil.com/consultar-aluno\n\n";
    timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    return timeline;
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('A mensagem não pode estar vazia');
      return;
    }

    if (!studentPhone) {
      toast.error('Número de telefone do aluno não cadastrado');
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch('https://n8n.centrodaautomacao.net/webhook/aviso-wpp-educa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eja_nome: studentName,
          phone: studentPhone.replace(/\D/g, ''),
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      const result = await response.json();
      
      // Verifica se a resposta contém sucesso
      if (Array.isArray(result) && result[0]?.success) {
        toast.success(`Mensagem enviada com sucesso para ${studentName}!`, {
          description: 'O aluno receberá a mensagem em breve.'
        });
        onOpenChange(false);
        setMessage(initialMessage);
      } else {
        throw new Error('Resposta inesperada do servidor');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Erro ao enviar mensagem', {
        description: 'Não foi possível enviar a mensagem. Tente novamente.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar Mensagem de WhatsApp
          </DialogTitle>
          <DialogDescription>
            Revise e edite a mensagem antes de enviar para <strong>{studentName}</strong> sobre <strong>{statusLabel}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Destinatário</label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{studentName}</p>
              <p className="text-sm text-muted-foreground">{studentPhone || 'Telefone não cadastrado'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Mensagem</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="Digite a mensagem..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length} caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setMessage(initialMessage);
            }}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
