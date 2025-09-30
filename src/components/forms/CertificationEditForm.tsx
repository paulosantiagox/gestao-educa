import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const certificationEditSchema = z.object({
  certifier_id: z.string().min(1, "Certificadora é obrigatória"),
  wants_physical: z.boolean(),
});

type CertificationEditFormData = z.infer<typeof certificationEditSchema>;

interface CertificationEditFormProps {
  studentId: number;
  certification: any;
  onSuccess?: () => void;
}

export function CertificationEditForm({ studentId, certification, onSuccess }: CertificationEditFormProps) {
  const form = useForm<CertificationEditFormData>({
    resolver: zodResolver(certificationEditSchema),
    defaultValues: {
      certifier_id: certification?.certifier_id?.toString() || "",
      wants_physical: certification?.wants_physical || false,
    },
  });

  const { data: certifiers = [] } = useQuery({
    queryKey: ['certifiers'],
    queryFn: async () => {
      const result = await api.getCertifiers();
      return result.ok ? (result.data || []) : [];
    },
  });

  const onSubmit = async (data: CertificationEditFormData) => {
    try {
      // Validação adicional
      if (!data.certifier_id || isNaN(parseInt(data.certifier_id))) {
        toast.error("Por favor, selecione uma certificadora válida");
        return;
      }

      const payload = {
        certifier_id: parseInt(data.certifier_id),
        wants_physical: data.wants_physical,
      };

      console.log('Enviando dados:', payload, 'para studentId:', studentId);

      const result = await api.updateCertificationProcess(studentId, payload);

      if (result.ok) {
        toast.success("Processo atualizado com sucesso!");
        onSuccess?.();
      } else {
        console.error('Erro na API:', result.error);
        toast.error(result.error || "Erro ao atualizar processo");
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      toast.error("Erro ao processar requisição");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="certifier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificadora *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a certificadora" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {certifiers.filter((c: any) => c.active).map((certifier: any) => (
                    <SelectItem key={certifier.id} value={certifier.id.toString()}>
                      {certifier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Certificadora responsável pela emissão do certificado
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="wants_physical"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Certificado Físico</FormLabel>
                <FormDescription>
                  O aluno deseja receber o certificado físico por correio?
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Informações Importantes</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Alterar a certificadora pode afetar o processo em andamento</li>
            <li>• O certificado físico pode ser solicitado a qualquer momento</li>
            <li>• Mudanças serão aplicadas imediatamente</li>
          </ul>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}