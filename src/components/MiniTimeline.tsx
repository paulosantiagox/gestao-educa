import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniTimelineProps {
  currentStatus: string;
  certification: any;
  slaConfig?: any[];
}

const MINI_STEPS = [
  { status: "pending", short: "P" },
  { status: "documents_sent", short: "D" },
  { status: "under_review", short: "A" },
  { status: "approved", short: "AP" },
  { status: "certificate_issued", short: "E" },
  { status: "certificate_sent", short: "EN" },
  { status: "completed", short: "C" },
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
    pending: certification.created_at,
    documents_sent: certification.documents_sent_at,
    under_review: certification.under_review_at,
    approved: certification.approval_date,
    certificate_issued: certification.certificate_issued_at,
    certificate_sent: certification.certificate_sent_at,
  };
  
  const statusDate = dateMap[currentStatus];
  if (!statusDate) return null;
  
  const startDate = new Date(statusDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const daysRemaining = stepConfig.days_limit - daysPassed;
  
  if (daysRemaining < 0) return "overdue"; // Atrasado
  if (daysRemaining <= stepConfig.warning_days) return "warning"; // Próximo do prazo
  return "ok"; // Dentro do prazo
};

export function MiniTimeline({ currentStatus, certification, slaConfig }: MiniTimelineProps) {
  const slaStatus = checkSLA(certification, currentStatus, slaConfig);
  
  return (
    <div className="flex items-center gap-1">
      {MINI_STEPS.map((step, index) => {
        const state = getStepState(step.status, currentStatus);
        const isLast = index === MINI_STEPS.length - 1;
        
        return (
          <div key={step.status} className="flex items-center">
            <div
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all",
                state === "completed" && "bg-primary text-primary-foreground",
                state === "current" && [
                  "bg-primary text-primary-foreground ring-2",
                  slaStatus === "overdue" && "ring-destructive",
                  slaStatus === "warning" && "ring-yellow-500",
                  slaStatus === "ok" && "ring-primary/30"
                ],
                state === "upcoming" && "bg-muted text-muted-foreground"
              )}
              title={step.status}
            >
              {state === "completed" ? (
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
      
      {slaStatus === "overdue" && (
        <div className="ml-2 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Atrasado
        </div>
      )}
      
      {slaStatus === "warning" && (
        <div className="ml-2 flex items-center gap-1 text-xs text-yellow-600">
          <Clock className="h-3 w-3" />
          Urgente
        </div>
      )}
    </div>
  );
}
