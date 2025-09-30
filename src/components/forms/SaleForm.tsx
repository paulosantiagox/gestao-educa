import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X, Check, ChevronsUpDown, Beaker } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { generateSaleData } from "@/lib/test-data";

const saleSchema = z.object({
  sale_code: z.string().min(3, "Código deve ter no mínimo 3 caracteres"),
  payer_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  payer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  payer_phone: z.string().optional(),
  payer_cpf: z.string().optional(),
  total_amount: z.string().min(1, "Valor total é obrigatório"),
  paid_amount: z.string().optional(),
  payment_method_id: z.string().min(1, "Método de pagamento é obrigatório"),
  payment_status: z.string().optional(),
  sale_date: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess?: () => void;
  initialData?: Partial<SaleFormData & { students?: any[] }>;
  saleId?: number;
}

export function SaleForm({ onSuccess, initialData, saleId }: SaleFormProps) {
  const { settings } = useSettings();
  const [selectedStudents, setSelectedStudents] = useState<any[]>(initialData?.students || []);
  const [studentSearch, setStudentSearch] = useState("");
  const [openStudentCombobox, setOpenStudentCombobox] = useState(false);

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: initialData || {
      sale_code: "",
      payer_name: "",
      payer_email: "",
      payer_phone: "",
      payer_cpf: "",
      total_amount: "",
      paid_amount: "0",
      payment_method_id: "",
      payment_status: "pending",
      sale_date: new Date().toISOString().split('T')[0],
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.getPaymentMethods();
      return result.ok ? (result.data || []) : [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', studentSearch],
    queryFn: async () => {
      const result = await api.getStudents({ search: studentSearch });
      return result.ok ? (((result.data as any)?.students) || []) : [];
    },
  });

  // Buscar todas as vendas para verificar alunos já associados
  const { data: allSales = [] } = useQuery({
    queryKey: ['all-sales-for-validation'],
    queryFn: async () => {
      const result = await api.getSales({});
      return result.ok ? (((result.data as any)?.sales) || []) : [];
    },
  });

// Pagamentos da venda atual (para calcular valor já pago)
const { data: paymentsData } = useQuery({
  queryKey: ['payments-by-sale', saleId],
  queryFn: async () => {
    if (!saleId) return [] as any[];
    const res = await api.getPaymentsBySale(saleId);
    return res.ok ? ((res.data as any) || []) : [];
  },
  enabled: !!saleId,
});

const initialPaid = initialData?.paid_amount ? parseFloat(initialData.paid_amount as string) : 0;
const currentPaid = (paymentsData as any[])?.reduce((sum, p: any) => sum + parseFloat(p.amount || 0), 0) ?? initialPaid;

  // Função para verificar se um aluno já está em uma venda paga
  const isStudentInPaidSale = async (studentId: number) => {
    for (const sale of allSales) {
      // Pular a venda atual se estiver editando
      if (saleId && sale.id === saleId) continue;
      
      // Se a venda está paga, verificar se o aluno está nela
      if (sale.payment_status === 'paid') {
        const saleDetails = await api.getSale(sale.id);
        if (saleDetails.ok && saleDetails.data) {
          const saleData = saleDetails.data as any;
          const hasStudent = saleData.students?.some((s: any) => s.student_id === studentId);
          if (hasStudent) {
            return { blocked: true, saleCode: sale.sale_code };
          }
        }
      }
    }
    return { blocked: false };
  };

  const addStudent = async (student: any) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      toast.error("Este aluno já está selecionado nesta venda");
      return;
    }

    // Verificar se o aluno já está em uma venda paga
    const validation = await isStudentInPaidSale(student.id);
    if (validation.blocked) {
      toast.error(`${student.name} já está associado à venda ${validation.saleCode} que foi paga. Um aluno só pode estar em múltiplas vendas se houver pagamento pendente.`);
      return;
    }

    setSelectedStudents([...selectedStudents, student]);
    toast.success(`${student.name} adicionado com sucesso!`);
    setStudentSearch("");
  };

  const removeStudent = (studentId: number) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const fillTestData = () => {
    const testData = generateSaleData();
    Object.keys(testData).forEach((key) => {
      if (key === 'payment_method_id') {
        // Pegar um método de pagamento aleatório se existir
        if (paymentMethods.length > 0) {
          const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          form.setValue('payment_method_id', randomMethod.id.toString());
        }
      } else {
        form.setValue(key as keyof SaleFormData, testData[key as keyof typeof testData]);
      }
    });
    toast.success("Dados de teste preenchidos!");
  };

  const onSubmit = async (data: SaleFormData) => {
    try {
      const totalAmountNumber = parseFloat(data.total_amount);
      const targetPaid = data.paid_amount ? parseFloat(data.paid_amount) : 0;
      const delta = saleId ? targetPaid - currentPaid : targetPaid; // na criação, insere tudo como pagamento

      // Definir status baseado no valor pago desejado
      let finalStatus: string = 'pending';
      if (targetPaid >= totalAmountNumber && targetPaid > 0) finalStatus = 'paid';
      else if (targetPaid > 0 && targetPaid < totalAmountNumber) finalStatus = 'partial';

      // Atualizar venda (sem depender do backend para calcular status)
      const payload = {
        ...data,
        total_amount: totalAmountNumber,
        paid_amount: targetPaid, // backend pode ignorar; mantemos para compatibilidade
        payment_status: finalStatus,
        payment_method_id: parseInt(data.payment_method_id),
        student_ids: selectedStudents.map(s => s.id),
      } as any;

      const result = saleId
        ? await api.updateSale(saleId, payload)
        : await api.createSale(payload);

      if (!result.ok) {
        toast.error(result.error || "Erro ao salvar venda");
        return;
      }

      // Criar pagamento automático quando necessário (workaround para backends que calculam paid_amount via /payments)
      if (delta > 0) {
        const paymentRes = await api.createPayment({
          sale_id: saleId || (result.data as any)?.id,
          amount: delta,
          payment_date: data.sale_date || new Date().toISOString().split('T')[0],
          payment_method_id: parseInt(data.payment_method_id),
          notes: 'Ajuste automático via formulário de venda',
        });
        if (!paymentRes.ok) {
          toast.error('Venda salva, mas falhou ao registrar o pagamento.');
        }
      } else if (delta < 0) {
        // Não vamos remover pagamentos automaticamente para evitar inconsistências
        toast.message('Para reduzir o valor pago, ajuste os pagamentos na seção de pagamentos.');
      }

      toast.success(saleId ? "Venda atualizada com sucesso!" : "Venda cadastrada com sucesso!");
      form.reset();
      setSelectedStudents([]);
      onSuccess?.();
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
            name="sale_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da Venda</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
            name="paid_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Pago</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_method_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map((method: any) => (
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

          <FormField
            control={form.control}
            name="payment_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status do Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Alunos Associados</h3>
          
          <div className="space-y-2">
            <FormLabel>Adicionar Aluno</FormLabel>
            <Popover open={openStudentCombobox} onOpenChange={setOpenStudentCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openStudentCombobox}
                  className="w-full justify-between"
                >
                  Selecione um aluno
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Buscar aluno por nome, email ou CPF..." 
                    value={studentSearch}
                    onValueChange={setStudentSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                    <CommandGroup>
                      {students.map((student: any) => {
                        const isSelected = selectedStudents.find(s => s.id === student.id);
                        return (
                          <CommandItem
                            key={student.id}
                            value={student.id.toString()}
                            onSelect={async () => {
                              if (!isSelected) {
                                await addStudent(student);
                                setOpenStudentCombobox(false);
                              }
                            }}
                            disabled={!!isSelected}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{student.name}</span>
                              <span className="text-sm text-muted-foreground">{student.email}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              Busque e selecione os alunos que fazem parte desta venda
            </FormDescription>
          </div>

          {selectedStudents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map((student) => (
                <Badge key={student.id} variant="secondary" className="text-sm">
                  {student.name}
                  <button
                    type="button"
                    onClick={() => removeStudent(student.id)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          {settings.testMode && !saleId && (
            <Button type="button" variant="outline" onClick={fillTestData}>
              <Beaker className="mr-2 h-4 w-4" />
              Preencher com Dados de Teste
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : saleId ? "Atualizar Venda" : "Cadastrar Venda"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
