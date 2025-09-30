import { useState } from "react";
import { CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTimeSP } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { useWhatsAppTemplates } from "@/contexts/WhatsAppTemplatesContext";
import { WhatsAppMessageDialog } from "@/components/WhatsAppMessageDialog";

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  date?: string;
}

interface CertificationTimelineProps {
  currentStatus: string;
  certification: any;
  studentName: string;
  studentPhone: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: "welcome",
    label: "Boas-Vindas",
    description: "Aluno recebe dados de acesso e mensagem de recepção",
  },
  {
    status: "exam_in_progress",
    label: "Prova em Andamento",
    description: "Aluno é notificado sobre realização e conclusão da prova",
  },
  {
    status: "documents_requested",
    label: "Documentação Solicitada",
    description: "Solicitação de envio dos documentos necessários",
  },
  {
    status: "documents_under_review",
    label: "Documentação em Análise",
    description: "Equipe verifica documentos recebidos ou aguarda pendências",
  },
  {
    status: "certification_started",
    label: "Certificação Iniciada",
    description: "Documentos enviados à certificadora para processar",
  },
  {
    status: "digital_certificate_sent",
    label: "Certificado Digital Emitido e Enviado",
    description: "Certificado digital emitido e enviado ao aluno",
  },
  {
    status: "physical_certificate_sent",
    label: "Certificado Físico Enviado",
    description: "Certificado impresso e enviado fisicamente ao aluno",
  },
  {
    status: "completed",
    label: "Concluído",
    description: "Processo de certificação finalizado com sucesso",
  },
];

const getStepDate = (step: TimelineStep, certification: any) => {
  const dateMap: Record<string, string> = {
    welcome: certification.created_at,
    exam_in_progress: certification.exam_started_at,
    documents_requested: certification.documents_requested_at,
    documents_under_review: certification.documents_under_review_at,
    certification_started: certification.certification_started_at,
    digital_certificate_sent: certification.digital_certificate_sent_at,
    physical_certificate_sent: certification.physical_certificate_sent_at,
    completed: certification.completed_at,
  };
  
  return dateMap[step.status];
};

export function CertificationTimeline({ currentStatus, certification, studentName, studentPhone }: CertificationTimelineProps) {
  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.status === currentStatus);
  const { getTemplate } = useWhatsAppTemplates();
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [messageToSend, setMessageToSend] = useState("");
  const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null);

  const getStepState = (index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  };

  const handleSendMessage = (step: TimelineStep) => {
    const template = getTemplate(step.status);
    setMessageToSend(formatMessage(template));
    setSelectedStep(step);
    setWhatsappDialogOpen(true);
  };

  const formatMessage = (template: string) => {
    return template
      .replace(/\{\{nome\}\}/g, studentName)
      .replace(/\{\{codigo_rastreio\}\}/g, certification.physical_tracking_code || 'Não disponível');
  };

  return (
    <div className="relative">
      {TIMELINE_STEPS.map((step, index) => {
        const state = getStepState(index);
        const stepDate = getStepDate(step, certification);
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <div key={step.status} className="relative pb-8">
            {/* Linha conectora */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-full -ml-px transition-colors duration-500",
                  state === "completed" ? "bg-primary" : "bg-muted"
                )}
              />
            )}

            {/* Conteúdo do step */}
            <div className="relative flex items-start gap-4">
              {/* Ícone */}
              <div className="relative z-10">
                {state === "completed" ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground animate-scale-in">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : state === "current" ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse ring-4 ring-primary/20">
                    <Clock className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className={cn(
                "flex-1 transition-all duration-300",
                state === "upcoming" && "opacity-50"
              )}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={cn(
                      "font-semibold transition-colors",
                      state === "completed" && "text-primary",
                      state === "current" && "text-primary",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </h4>
                  {stepDate && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {formatDateTimeSP(stepDate)}
                    </span>
                  )}
                  {(state === "completed" || state === "current") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto whitespace-nowrap"
                      onClick={() => handleSendMessage(step)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Enviar WhatsApp
                    </Button>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm mt-1 transition-colors",
                    state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.description}
                </p>
                
                {/* Código de rastreio */}
                {step.status === "physical_certificate_sent" && certification.physical_tracking_code && (
                  <div className="mt-2 p-2 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Código de Rastreio</p>
                    <p className="font-mono text-sm font-medium">{certification.physical_tracking_code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {selectedStep && (
        <WhatsAppMessageDialog
          open={whatsappDialogOpen}
          onOpenChange={setWhatsappDialogOpen}
          studentName={studentName}
          studentPhone={studentPhone}
          initialMessage={messageToSend}
          statusLabel={selectedStep.label}
          certification={certification}
        />
      )}
    </div>
  );
}
