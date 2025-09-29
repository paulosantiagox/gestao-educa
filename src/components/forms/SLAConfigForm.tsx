import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const slaSchema = z.object({
  pending: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
  documents_sent: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
  under_review: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
  approved: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
  certificate_issued: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
  certificate_sent: z.object({
    days_limit: z.string().min(1, "Obrigatório"),
    warning_days: z.string().min(1, "Obrigatório"),
  }),
});

type SLAFormData = z.infer<typeof slaSchema>;

interface SLAConfigFormProps {
  onSuccess?: () => void;
}

const STEP_LABELS: Record<string, string> = {
  pending: "Pendente",
  documents_sent: "Documentos Enviados",
  under_review: "Em Análise",
  approved: "Aprovado",
  certificate_issued: "Certificado Emitido",
  certificate_sent: "Certificado Enviado",
};

export function SLAConfigForm({ onSuccess }: SLAConfigFormProps) {
  const { data: slaConfig = [] } = useQuery({
    queryKey: ["certification-sla"],
    queryFn: async () => {
      const result = await api.getCertificationSLA();
      return result.ok ? (result.data || []) : [];
    },
  });

  const getDefaultValues = () => {
    const defaults: any = {};
    Object.keys(STEP_LABELS).forEach((status) => {
      const config = slaConfig.find((s: any) => s.status === status);
      defaults[status] = {
        days_limit: config?.days_limit?.toString() || "7",
        warning_days: config?.warning_days?.toString() || "2",
      };
    });
    return defaults;
  };

  const form = useForm<SLAFormData>({
    resolver: zodResolver(slaSchema),
    defaultValues: getDefaultValues(),
  });

  const onSubmit = async (data: SLAFormData) => {
    try {
      const updates = Object.entries(data).map(([status, config]) => ({
        status,
        days_limit: parseInt(config.days_limit),
        warning_days: parseInt(config.warning_days),
      }));

      const result = await api.updateCertificationSLA(updates);

      if (result.ok) {
        toast.success("Prazos atualizados com sucesso!");
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao atualizar prazos");
      }
    } catch (error) {
      toast.error("Erro ao processar requisição");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure o prazo máximo (em dias) para cada etapa e quando deve alertar antes do vencimento.
          </p>

          {Object.entries(STEP_LABELS).map(([status, label]) => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`${status}.days_limit` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Prazo máximo para concluir
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`${status}.warning_days` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alertar com (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Avisar quando faltar X dias
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Prazos"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
