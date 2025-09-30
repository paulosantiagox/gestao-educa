import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSettings } from "@/contexts/SettingsContext";
import { generateCertifierData } from "@/lib/test-data";
import { Beaker } from "lucide-react";

const certifierSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  active: z.boolean().default(true),
});

type CertifierFormData = z.infer<typeof certifierSchema>;

interface CertifierFormProps {
  onSuccess?: () => void;
  initialData?: Partial<CertifierFormData>;
  certifierId?: number;
}

export function CertifierForm({ onSuccess, initialData, certifierId }: CertifierFormProps) {
  const { settings } = useSettings();
  
  const form = useForm<CertifierFormData>({
    resolver: zodResolver(certifierSchema),
    defaultValues: initialData || {
      name: "",
      contact_email: "",
      contact_phone: "",
      active: true,
    },
  });

  const fillTestData = () => {
    const testData = generateCertifierData();
    Object.keys(testData).forEach((key) => {
      form.setValue(key as keyof CertifierFormData, testData[key as keyof typeof testData]);
    });
    toast.success("Dados de teste preenchidos!");
  };

  const onSubmit = async (data: CertifierFormData) => {
    try {
      const result = certifierId
        ? await api.updateCertifier(certifierId, data)
        : await api.createCertifier(data);

      if (result.ok) {
        toast.success(certifierId ? "Certificadora atualizada!" : "Certificadora cadastrada!");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao salvar certificadora");
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Certificadora *</FormLabel>
              <FormControl>
                <Input placeholder="Certificadora ABC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email de Contato</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contato@abc.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone de Contato</FormLabel>
              <FormControl>
                <Input placeholder="(11) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativa</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          {settings.testMode && !certifierId && (
            <Button type="button" variant="outline" onClick={fillTestData}>
              <Beaker className="mr-2 h-4 w-4" />
              Preencher com Dados de Teste
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : certifierId ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
