import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Beaker } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";

const utmSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  utm_code: z.string().min(2, "Código UTM deve ter no mínimo 2 caracteres").max(50),
  utm_source: z.string().min(1, "Source é obrigatório").max(100),
  utm_medium: z.string().min(1, "Medium é obrigatório").max(100),
  utm_campaign: z.string().min(1, "Campaign é obrigatório").max(100),
  utm_content: z.string().max(100).optional(),
  utm_term: z.string().max(100).optional(),
  active: z.boolean().default(true),
});

type UTMFormValues = z.infer<typeof utmSchema>;

interface UTMFormProps {
  onSubmit: (data: UTMFormValues) => void;
  isLoading?: boolean;
  initialData?: Partial<UTMFormValues>;
  isEditing?: boolean;
}

export function UTMForm({ onSubmit, isLoading, initialData, isEditing }: UTMFormProps) {
  const { settings } = useSettings();
  
  const form = useForm<UTMFormValues>({
    resolver: zodResolver(utmSchema),
    defaultValues: initialData || {
      name: "",
      utm_code: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
      active: true,
    },
  });

  const generateTestData = () => {
    const testData = {
      name: "Maria Silva",
      utm_code: "maria_silva",
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "vendas_2024",
      utm_content: "stories",
      utm_term: "educacao",
      active: true,
    };
    
    Object.entries(testData).forEach(([key, value]) => {
      form.setValue(key as keyof UTMFormValues, value);
    });
    
    toast.success("Dados de teste preenchidos!");
  };

  const handleSubmit = (data: UTMFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Dados da Vendedora</h3>
            {settings?.testMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateTestData}
                className="text-xs"
              >
                <Beaker className="mr-1 h-3 w-3" />
                Dados de Teste
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Vendedora</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Maria Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utm_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código UTM</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: maria_silva" {...field} />
                  </FormControl>
                  <FormDescription>
                    Código único para identificar a vendedora
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Parâmetros UTM */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Parâmetros UTM</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="utm_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Source</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: instagram, facebook, whatsapp" {...field} />
                  </FormControl>
                  <FormDescription>
                    Origem do tráfego (rede social, site, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utm_medium"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Medium</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: social, email, cpc" {...field} />
                  </FormControl>
                  <FormDescription>
                    Tipo de mídia ou canal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utm_campaign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Campaign</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: vendas_2024, promocao_natal" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nome da campanha
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utm_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Content (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: stories, feed, bio" {...field} />
                  </FormControl>
                  <FormDescription>
                    Conteúdo específico da campanha
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utm_term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Term (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: educacao, curso, certificacao" {...field} />
                  </FormControl>
                  <FormDescription>
                    Termos ou palavras-chave
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Status */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Vendedora Ativa</FormLabel>
                <FormDescription>
                  Vendedora pode receber novas vendas com rastreamento UTM
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}