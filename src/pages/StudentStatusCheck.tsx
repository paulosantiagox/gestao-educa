import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send, Loader2, CheckCircle2, Clock, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeSP } from '@/lib/date-utils';
import ejaLogo from '@/assets/eja-logo.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sistema-educa.autoflixtreinamentos.com';

// Função para mascarar dados sensíveis (segurança)
const maskData = (data: string, type: 'name' | 'cpf' = 'name'): string => {
  if (!data) return '';
  
  if (type === 'cpf') {
    const cleaned = data.replace(/\D/g, '');
    if (cleaned.length < 5) return data;
    return `${cleaned.slice(0, 3)}***${cleaned.slice(-2)}`;
  }
  
  // Para nome
  if (data.length <= 6) return data;
  return `${data.slice(0, 3)}***${data.slice(-3)}`;
};

const TIMELINE_STEPS = [
  { status: "welcome", label: "🎉 Boas-vindas", field: "created_at" },
  { status: "exam_in_progress", label: "📝 Prova Iniciada", field: "exam_started_at" },
  { status: "documents_requested", label: "📄 Documentos Solicitados", field: "documents_requested_at" },
  { status: "documents_under_review", label: "🔍 Documentos em Análise", field: "documents_under_review_at" },
  { status: "certification_started", label: "⚙️ Certificação Iniciada", field: "certification_started_at" },
  { status: "digital_certificate_sent", label: "📧 Certificado Digital Enviado", field: "digital_certificate_sent_at" },
  { status: "physical_certificate_sent", label: "📦 Certificado Físico Enviado", field: "physical_certificate_sent_at" },
  { status: "completed", label: "✅ Concluído", field: "completed_at" },
];

const STATUS_LABELS: Record<string, string> = {
  welcome: "Boas-vindas",
  exam_in_progress: "Prova em Andamento",
  documents_requested: "Documentos Solicitados",
  documents_under_review: "Documentos em Análise",
  certification_started: "Certificação Iniciada",
  digital_certificate_sent: "Certificado Digital Enviado",
  physical_certificate_sent: "Certificado Físico Enviado",
  completed: "Concluído"
};

export default function StudentStatusCheck() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [certification, setCertification] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [phone, setPhone] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [lastSentDate, setLastSentDate] = useState<string | null>(null);

  // Verificar se pode enviar WhatsApp (24h)
  const canSendWhatsApp = () => {
    if (!lastSentDate) return true;
    const lastSent = new Date(lastSentDate);
    const now = new Date();
    const diffHours = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
  };

  const handleSearch = async () => {
    if (!cpf.trim()) {
      toast.error('Digite o CPF para consultar');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/certification/check-by-cpf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Nenhum processo de certificação encontrado para este CPF');
          setCertification(null);
          setStudent(null);
          return;
        }
        throw new Error('Erro ao consultar status');
      }

      const data = await response.json();
      setCertification(data.certification);
      setStudent(data.student);
      
      // Verificar localStorage para rate limiting
      const storageKey = `whatsapp_sent_${cpf.replace(/\D/g, '')}`;
      const lastSent = localStorage.getItem(storageKey);
      setLastSentDate(lastSent);

      toast.success('Status encontrado!');
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao consultar status. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeline = () => {
    if (!certification) return '';

    let timeline = "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    timeline += "📊 *RESUMO DO PROCESSO*\n";
    timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    const filteredSteps = TIMELINE_STEPS.filter(step => {
      if (step.status === "physical_certificate_sent" && !certification.wants_physical) {
        return false;
      }
      return true;
    });

    const currentIndex = filteredSteps.findIndex(s => s.status === certification.status);

    filteredSteps.forEach((step, index) => {
      const dateValue = certification[step.field];
      const isCompleted = index < currentIndex || (index === currentIndex && dateValue);
      const isCurrent = index === currentIndex;
      
      if (isCompleted) {
        timeline += `${step.label}\n`;
        timeline += `✓ ${formatDateTimeSP(dateValue)}\n\n`;
      } else if (isCurrent) {
        timeline += `${step.label}\n`;
        timeline += dateValue ? `✓ ${formatDateTimeSP(dateValue)}\n\n` : `⏳ Em andamento...\n\n`;
      } else {
        timeline += `${step.label}\n`;
        timeline += `○ Aguardando...\n\n`;
      }
    });

    if (certification.wants_physical && certification.physical_tracking_code) {
      timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      timeline += `📦 *Código de Rastreio:*\n${certification.physical_tracking_code}\n`;
    }

    timeline += "━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    return timeline;
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      toast.error('Digite o número de WhatsApp');
      return;
    }

    setSendingWhatsApp(true);
    
    try {
      const message = `Olá ${student.name}! 👋\n\nAqui está o resumo completo do seu processo de certificação:\n\n${generateTimeline()}`;

      const response = await fetch('https://n8n.centrodaautomacao.net/webhook/aviso-wpp-educa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eja_nome: student.name,
          phone: phone.replace(/\D/g, ''),
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      const result = await response.json();
      
      if (Array.isArray(result) && result[0]?.success) {
        // Salvar data de envio no localStorage
        const storageKey = `whatsapp_sent_${cpf.replace(/\D/g, '')}`;
        const now = new Date().toISOString();
        localStorage.setItem(storageKey, now);
        setLastSentDate(now);

        toast.success('Mensagem enviada com sucesso!', {
          description: 'Você receberá o resumo em breve.'
        });
        setShowWhatsAppDialog(false);
        setPhone('');
      } else {
        throw new Error('Resposta inesperada do servidor');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Erro ao enviar mensagem', {
        description: 'Não foi possível enviar a mensagem. Tente novamente.'
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const getStepState = (index: number): 'completed' | 'current' | 'pending' => {
    if (!certification) return 'pending';
    
    const filteredSteps = TIMELINE_STEPS.filter(step => {
      if (step.status === "physical_certificate_sent" && !certification.wants_physical) {
        return false;
      }
      return true;
    });

    const currentIndex = filteredSteps.findIndex(s => s.status === certification.status);
    const step = filteredSteps[index];
    const dateValue = certification[step.field];
    
    if (index < currentIndex || (index === currentIndex && dateValue)) {
      return 'completed';
    } else if (index === currentIndex) {
      return 'current';
    }
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <div className="w-full flex justify-center py-4 px-4">
        <img 
          src={ejaLogo} 
          alt="EJA Educa Brasil" 
          className="h-12 md:h-16 w-auto object-contain opacity-90"
        />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Consultar Status de Certificação
            </h1>
            <p className="text-muted-foreground">
              Digite seu CPF para acompanhar o processo de certificação
            </p>
          </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar por CPF</CardTitle>
            <CardDescription>
              Informe o CPF cadastrado no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  maxLength={14}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Consultar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {certification && student && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{maskData(student.name, 'name')}</CardTitle>
                  <CardDescription className="space-y-1">
                    <div>CPF: <strong>{maskData(cpf, 'cpf')}</strong></div>
                    <div>Status Atual: <strong>{STATUS_LABELS[certification.status]}</strong></div>
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowWhatsAppDialog(true)}
                  disabled={!canSendWhatsApp()}
                  variant={canSendWhatsApp() ? "default" : "secondary"}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {canSendWhatsApp() ? 'Enviar Resumo' : 'Aguarde 24h'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Timeline Visual */}
                <div className="relative">
                  {TIMELINE_STEPS.filter(step => {
                    if (step.status === "physical_certificate_sent" && !certification.wants_physical) {
                      return false;
                    }
                    return true;
                  }).map((step, index, filteredSteps) => {
                    const state = getStepState(index);
                    const stepDate = certification[step.field];
                    const isLast = index === filteredSteps.length - 1;

                    return (
                      <div key={step.status} className="relative pb-8">
                        {!isLast && (
                          <div
                            className={`absolute left-4 top-8 h-full w-0.5 transition-colors duration-300 ${
                              state === 'completed' ? 'bg-green-500' : 'bg-muted'
                            }`}
                          />
                        )}
                        
                        <div className="relative flex items-start gap-4">
                          <div className={`
                            flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300
                            ${state === 'completed' 
                              ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/50 animate-pulse' 
                              : state === 'current'
                              ? 'border-primary bg-background text-primary'
                              : 'border-muted bg-background text-muted-foreground'
                            }
                          `}>
                            {state === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : state === 'current' ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex-1 pt-0.5">
                            <p className={`font-medium ${
                              state === 'completed' ? 'text-green-600 dark:text-green-400' :
                              state === 'current' ? 'text-primary' :
                              'text-muted-foreground'
                            }`}>
                              {step.label}
                            </p>
                            {stepDate && (
                              <p className={`text-sm mt-1 ${
                                state === 'completed' ? 'text-green-600/80 dark:text-green-400/80' : 'text-muted-foreground'
                              }`}>
                                {formatDateTimeSP(stepDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tracking Code */}
                {certification.wants_physical && certification.physical_tracking_code && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">📦 Código de Rastreio</p>
                    <p className="text-lg font-mono">{certification.physical_tracking_code}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t bg-background/50 backdrop-blur-sm mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-sm font-medium text-foreground">
              EJA EDUCA BRASIL EAD LTDA
            </p>
            <p className="text-xs text-muted-foreground">
              CNPJ: 59.905.568/0001-02
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground mt-2">
              <p>📧 contato@ejaeducabrasil.com</p>
              <p>📞 (11) 4200-2991</p>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Resumo por WhatsApp</DialogTitle>
            <DialogDescription>
              Informe seu número com DDI (ex: 5511999999999)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                placeholder="5511999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lembre-se de incluir o DDI do seu país (Brasil: 55)
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Você receberá uma mensagem da nossa equipe com o resumo completo do seu processo.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWhatsAppDialog(false);
                setPhone('');
              }}
              disabled={sendingWhatsApp}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendWhatsApp} disabled={sendingWhatsApp || !phone.trim()}>
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
