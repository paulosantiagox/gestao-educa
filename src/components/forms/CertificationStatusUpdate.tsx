import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status é obrigatório"),
  physical_tracking_code: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface CertificationStatusUpdateProps {
  studentId: number;
  currentStatus?: string;
  onSuccess?: () => void;
}

export function CertificationStatusUpdate({ studentId, currentStatus, onSuccess }: CertificationStatusUpdateProps) {
  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: currentStatus || "welcome",
      physical_tracking_code: "",
    },
  });

  const selectedStatus = form.watch("status");
  const needsTracking = selectedStatus === "physical_certificate_sent";

  const onSubmit = async (data: StatusUpdateFormData) => {
    try {
      const result = await api.updateCertificationStatus(studentId, data);

      if (result.ok) {
        toast.success("Status atualizado com sucesso!");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao atualizar status");
      }
    } catch (error) {
      toast.error("Erro ao processar requisição");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="welcome">Boas-Vindas</SelectItem>
                  <SelectItem value="exam_in_progress">Prova em Andamento</SelectItem>
                  <SelectItem value="documents_requested">Documentação Solicitada</SelectItem>
                  <SelectItem value="documents_under_review">Documentação em Análise</SelectItem>
                  <SelectItem value="certification_started">Certificação Iniciada</SelectItem>
                  <SelectItem value="digital_certificate_sent">Certificado Digital Enviado</SelectItem>
                  <SelectItem value="physical_certificate_sent">Certificado Físico Enviado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Atualize o status conforme o andamento do processo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {needsTracking && (
          <FormField
            control={form.control}
            name="physical_tracking_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Rastreio</FormLabel>
                <FormControl>
                  <Input placeholder="BR123456789BR" {...field} />
                </FormControl>
                <FormDescription>
                  Informe o código de rastreio do certificado físico
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Fluxo do Processo</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Boas-Vindas - Aluno recebe dados de acesso</li>
            <li>Prova em Andamento - Aluno realiza e conclui a prova</li>
            <li>Documentação Solicitada - Solicitação dos documentos</li>
            <li>Documentação em Análise - Equipe verifica documentos</li>
            <li>Certificação Iniciada - Enviado à certificadora</li>
            <li>Certificado Digital Enviado - Certificado digital emitido e enviado</li>
            <li>Certificado Físico Enviado - Certificado físico enviado (se aplicável)</li>
            <li>Concluído - Processo finalizado com sucesso</li>
          </ol>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Atualizando..." : "Atualizar Status"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
