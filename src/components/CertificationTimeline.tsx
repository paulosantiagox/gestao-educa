import { useState } from "react";
import { CheckCircle2, Circle, Clock, MessageSquare, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTimeSP } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWhatsAppTemplates } from "@/contexts/WhatsAppTemplatesContext";
import { WhatsAppMessageDialog } from "@/components/WhatsAppMessageDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState("");
  const queryClient = useQueryClient();

  const updateDateMutation = useMutation({
    mutationFn: async ({ status, date }: { status: string; date: string }) => {
      return await api.updateCertificationDates(certification.student_id, { [getDateFieldName(status)]: date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-with-certification"] });
      toast.success("Data atualizada com sucesso!");
      setEditingDate(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar data");
    },
  });

  const getDateFieldName = (status: string): string => {
    const fieldMap: Record<string, string> = {
      welcome: "created_at",
      exam_in_progress: "exam_started_at",
      documents_requested: "documents_requested_at",
      documents_under_review: "documents_under_review_at",
      certification_started: "certification_started_at",
      digital_certificate_sent: "digital_certificate_sent_at",
      physical_certificate_sent: "physical_certificate_sent_at",
      completed: "completed_at",
    };
    return fieldMap[status];
  };

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

  const handleEditDate = (step: TimelineStep) => {
    const currentDate = getStepDate(step, certification);
    if (currentDate) {
      const formattedDate = format(new Date(currentDate), "yyyy-MM-dd'T'HH:mm");
      setTempDate(formattedDate);
    } else {
      setTempDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
    setEditingDate(step.status);
  };

  const handleSaveDate = (step: TimelineStep) => {
    if (!tempDate) {
      toast.error("Por favor, selecione uma data");
      return;
    }
    updateDateMutation.mutate({ status: step.status, date: new Date(tempDate).toISOString() });
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
    setTempDate("");
  };

  return (
    <div className="relative">
      {TIMELINE_STEPS.filter(step => {
        // Remove etapa do certificado físico se o aluno não quiser
        if (step.status === "physical_certificate_sent" && !certification.wants_physical) {
          return false;
        }
        return true;
      }).map((step, index, filteredSteps) => {
        const state = getStepState(index);
        const stepDate = getStepDate(step, certification);
        const isLast = index === filteredSteps.length - 1;

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
                  
                  {/* Data - modo edição ou visualização */}
                  <div className="flex items-center gap-2">
                    {editingDate === step.status ? (
                      <>
                        <Input
                          type="datetime-local"
                          value={tempDate}
                          onChange={(e) => setTempDate(e.target.value)}
                          className="h-8 text-xs w-auto"
                          disabled={updateDateMutation.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSaveDate(step)}
                          disabled={updateDateMutation.isPending}
                        >
                          {updateDateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCancelEdit}
                          disabled={updateDateMutation.isPending}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {stepDate && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {formatDateTimeSP(stepDate)}
                          </span>
                        )}
                        {(state === "completed" || state === "current") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditDate(step)}
                            title="Editar data"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {(state === "completed" || state === "current") && editingDate !== step.status && (
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
