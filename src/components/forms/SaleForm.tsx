import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const saleSchema = z.object({
  sale_code: z.string().min(3, "Código deve ter no mínimo 3 caracteres"),
  payer_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  payer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  payer_phone: z.string().optional(),
  payer_cpf: z.string().optional(),
  total_amount: z.string().min(1, "Valor total é obrigatório"),
  payment_method_id: z.string().min(1, "Método de pagamento é obrigatório"),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess?: () => void;
  initialData?: Partial<SaleFormData>;
  saleId?: number;
}

export function SaleForm({ onSuccess, initialData, saleId }: SaleFormProps) {
  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: initialData || {
      sale_code: "",
      payer_name: "",
      payer_email: "",
      payer_phone: "",
      payer_cpf: "",
      total_amount: "",
      payment_method_id: "",
    },
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.getPaymentMethods();
      return result.ok && result.data ? result.data : { payment_methods: [] };
    },
  });

  const onSubmit = async (data: SaleFormData) => {
    try {
      const payload = {
        ...data,
        total_amount: parseFloat(data.total_amount),
        payment_method_id: parseInt(data.payment_method_id),
      };

      const result = saleId
        ? await api.updateSale(saleId, payload)
        : await api.createSale(payload);

      if (result.ok) {
        toast.success(saleId ? "Venda atualizada com sucesso!" : "Venda cadastrada com sucesso!");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao salvar venda");
      }
    } catch (error) {
      toast.error("Erro ao processar requisição");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sale_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código da Venda *</FormLabel>
                <FormControl>
                  <Input placeholder="VND-2025-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="1500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_method_id"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Método de Pagamento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(paymentMethodsData as any)?.payment_methods?.map((method: any) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados do Pagador</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="payer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Pagador *</FormLabel>
                  <FormControl>
                    <Input placeholder="Maria Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Pagador</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="maria@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payer_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do Pagador</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 97777-7777" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payer_cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF do Pagador</FormLabel>
                  <FormControl>
                    <Input placeholder="987.654.321-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : saleId ? "Atualizar Venda" : "Cadastrar Venda"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
