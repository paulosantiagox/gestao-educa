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

const certificationSchema = z.object({
  student_id: z.string().min(1, "Aluno é obrigatório"),
  certifier_id: z.string().min(1, "Certificadora é obrigatória"),
  wants_physical: z.boolean().default(false),
});

type CertificationFormData = z.infer<typeof certificationSchema>;

interface CertificationFormProps {
  onSuccess?: () => void;
  preSelectedStudentId?: number;
}

export function CertificationForm({ onSuccess, preSelectedStudentId }: CertificationFormProps) {
  const form = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      student_id: preSelectedStudentId?.toString() || "",
      certifier_id: "",
      wants_physical: false,
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-certification'],
    queryFn: async () => {
      const result = await api.getStudents({});
      return result.ok ? (result.data || []) : [];
    },
  });

  const { data: certifiers = [] } = useQuery({
    queryKey: ['certifiers'],
    queryFn: async () => {
      const result = await api.getCertifiers();
      return result.ok ? (result.data || []) : [];
    },
  });

  const onSubmit = async (data: CertificationFormData) => {
    try {
      const payload = {
        student_id: parseInt(data.student_id),
        certifier_id: parseInt(data.certifier_id),
        wants_physical: data.wants_physical,
      };

      const result = await api.createCertificationProcess(payload);

      if (result.ok) {
        toast.success("Processo de certificação iniciado com sucesso!");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao iniciar processo");
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
          name="student_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aluno *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map((student: any) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name} - {student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Iniciando..." : "Iniciar Processo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
