import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toSaoPaulo } from "@/lib/date-utils";

interface MiniTimelineProps {
  currentStatus: string;
  certification: any;
  slaConfig?: any[];
}

const MINI_STEPS = [
  { status: "welcome", short: "BV" },
  { status: "exam_in_progress", short: "PA" },
  { status: "documents_requested", short: "DS" },
  { status: "documents_under_review", short: "DA" },
  { status: "certification_started", short: "CI" },
  { status: "digital_certificate_sent", short: "CD" },
  { status: "physical_certificate_sent", short: "CF" },
  { status: "completed", short: "OK" },
];

const getStepState = (step: string, currentStatus: string) => {
  const currentIndex = MINI_STEPS.findIndex((s) => s.status === currentStatus);
  const stepIndex = MINI_STEPS.findIndex((s) => s.status === step);
  
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
};

const checkSLA = (certification: any, currentStatus: string, slaConfig?: any[]) => {
  if (!slaConfig || slaConfig.length === 0) return null;
  
  const stepConfig = slaConfig.find((s: any) => s.status === currentStatus);
  if (!stepConfig) return null;
  
  // Pegar a data de quando entrou neste status
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
  
  const statusDate = dateMap[currentStatus];
  if (!statusDate) return null;
  
  const startDate = toSaoPaulo(statusDate);
  const now = toSaoPaulo(new Date());
  const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const daysRemaining = stepConfig.days_limit - daysPassed;
  
  if (daysRemaining < 0) return "overdue"; // Atrasado
  if (daysRemaining <= stepConfig.warning_days) return "warning"; // Próximo do prazo
  return "ok"; // Dentro do prazo
};

export function MiniTimeline({ currentStatus, certification, slaConfig }: MiniTimelineProps) {
  // Se o processo está completo, não mostrar warnings de SLA
  const slaStatus = currentStatus === "completed" ? null : checkSLA(certification, currentStatus, slaConfig);
  
  return (
    <div className="flex items-center gap-1">
      {MINI_STEPS.map((step, index) => {
        const state = getStepState(step.status, currentStatus);
        const isLast = index === MINI_STEPS.length - 1;
        const isCompleted = currentStatus === "completed";
        
        return (
          <div key={step.status} className="flex items-center">
            <div
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all",
                state === "completed" && "bg-primary text-primary-foreground",
                state === "current" && [
                  isCompleted 
                    ? "bg-green-600 text-white ring-2 ring-green-600/30"
                    : "bg-primary text-primary-foreground ring-2",
                  !isCompleted && slaStatus === "overdue" && "ring-destructive",
                  !isCompleted && slaStatus === "warning" && "ring-yellow-500",
                  !isCompleted && slaStatus === "ok" && "ring-primary/30"
                ],
                state === "upcoming" && "bg-muted text-muted-foreground"
              )}
              title={step.status}
            >
              {state === "completed" || (state === "current" && isCompleted) ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : state === "current" ? (
                slaStatus === "overdue" ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-2 transition-colors",
                  state === "completed" ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
      
      {currentStatus === "completed" && (
        <div className="ml-2 flex items-center gap-1 text-xs text-green-600 font-medium">
          <CheckCircle2 className="h-3 w-3" />
          Concluído
        </div>
      )}
      
      {currentStatus !== "completed" && slaStatus === "overdue" && (
        <div className="ml-2 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Atrasado
        </div>
      )}
      
      {currentStatus !== "completed" && slaStatus === "warning" && (
        <div className="ml-2 flex items-center gap-1 text-xs text-yellow-600">
          <Clock className="h-3 w-3" />
          Urgente
        </div>
      )}
    </div>
  );
}
