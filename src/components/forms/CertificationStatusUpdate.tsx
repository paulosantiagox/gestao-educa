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
      status: currentStatus || "pending",
      physical_tracking_code: "",
    },
  });

  const selectedStatus = form.watch("status");
  const needsTracking = selectedStatus === "certificate_sent";

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
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="documents_sent">Documentos Enviados</SelectItem>
                  <SelectItem value="under_review">Em Análise</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="certificate_issued">Certificado Emitido</SelectItem>
                  <SelectItem value="certificate_sent">Certificado Enviado</SelectItem>
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
            <li>Pendente - Processo iniciado</li>
            <li>Documentos Enviados - Documentos enviados para certificadora</li>
            <li>Em Análise - Certificadora está analisando</li>
            <li>Aprovado - Documentos aprovados</li>
            <li>Certificado Emitido - Certificado gerado</li>
            <li>Certificado Enviado - Enviado para o aluno (se físico)</li>
            <li>Concluído - Processo finalizado</li>
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
