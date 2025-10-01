import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Calendar } from "lucide-react";

const dateEditorSchema = z.object({
  exam_started_at: z.string().optional(),
  documents_requested_at: z.string().optional(),
  documents_under_review_at: z.string().optional(),
  certification_started_at: z.string().optional(),
  digital_certificate_sent_at: z.string().optional(),
  physical_certificate_sent_at: z.string().optional(),
  completed_at: z.string().optional(),
});

type DateEditorFormData = z.infer<typeof dateEditorSchema>;

interface CertificationDateEditorProps {
  studentId: number;
  currentDates?: Partial<DateEditorFormData>;
  onSuccess?: () => void;
}

export function CertificationDateEditor({ studentId, currentDates, onSuccess }: CertificationDateEditorProps) {
  const form = useForm<DateEditorFormData>({
    resolver: zodResolver(dateEditorSchema),
    defaultValues: {
      exam_started_at: currentDates?.exam_started_at ? new Date(currentDates.exam_started_at).toISOString().split('T')[0] : "",
      documents_requested_at: currentDates?.documents_requested_at ? new Date(currentDates.documents_requested_at).toISOString().split('T')[0] : "",
      documents_under_review_at: currentDates?.documents_under_review_at ? new Date(currentDates.documents_under_review_at).toISOString().split('T')[0] : "",
      certification_started_at: currentDates?.certification_started_at ? new Date(currentDates.certification_started_at).toISOString().split('T')[0] : "",
      digital_certificate_sent_at: currentDates?.digital_certificate_sent_at ? new Date(currentDates.digital_certificate_sent_at).toISOString().split('T')[0] : "",
      physical_certificate_sent_at: currentDates?.physical_certificate_sent_at ? new Date(currentDates.physical_certificate_sent_at).toISOString().split('T')[0] : "",
      completed_at: currentDates?.completed_at ? new Date(currentDates.completed_at).toISOString().split('T')[0] : "",
    },
  });

  const onSubmit = async (data: DateEditorFormData) => {
    try {
      const result = await api.updateCertificationDates(studentId, data);

      if (result.ok) {
        toast.success("Datas atualizadas com sucesso!");
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao atualizar datas");
      }
    } catch (error) {
      toast.error("Erro ao processar requisição");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h4 className="font-medium">Editar Datas do Processo</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Use este formulário para ajustar as datas históricas dos processos de certificação. 
            Deixe em branco as datas que não deseja alterar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="exam_started_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Prova Iniciada</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando o aluno iniciou a prova
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documents_requested_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Documentos Solicitados</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando os documentos foram solicitados
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documents_under_review_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Documentos em Análise</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando os documentos entraram em análise
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="certification_started_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Certificação Iniciada</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando foi enviado à certificadora
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="digital_certificate_sent_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Certificado Digital Enviado</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando o certificado digital foi enviado
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="physical_certificate_sent_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Certificado Físico Enviado</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando o certificado físico foi enviado
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="completed_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data: Processo Concluído</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Quando o processo foi concluído
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Datas"}
          </Button>
        </div>
      </form>
    </Form>
  );
}