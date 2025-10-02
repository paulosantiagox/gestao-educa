import React from "react";
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
import { X, Check, ChevronsUpDown, Beaker, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { generateSaleData } from "@/lib/test-data";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  notes: z.string().optional(),
  // Campos UTM para rastreamento
  utm_consultor: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onSuccess?: () => void;
  initialData?: Partial<SaleFormData & { students?: any[] }>;
  saleId?: number;
}

export function SaleForm({ onSuccess, initialData, saleId }: SaleFormProps) {
  const { settings } = useSettings();
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [openStudentCombobox, setOpenStudentCombobox] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Tratamento de erro global para o componente
  React.useEffect(() => {
    const handleError = (error: any) => {
      console.error('SaleForm Error:', error);
      setHasError(true);
      setErrorMessage(error?.message || 'Erro desconhecido no formulário de vendas');
    };

    // Capturar erros não tratados
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

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
      notes: "",
      // Campos UTM - usar null em vez de string vazia
      utm_consultor: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    },
  });

  // Buscar próximo código de venda automaticamente (apenas para novas vendas)
  const { data: nextCodeData } = useQuery({
    queryKey: ['next-sale-code'],
    queryFn: async () => {
      const result = await api.getNextSaleCode();
      return result.ok ? result.data : null;
    },
    enabled: !saleId && !initialData?.sale_code, // Só busca se for nova venda
  });

  // Preencher automaticamente o código quando disponível
  React.useEffect(() => {
    if (nextCodeData?.nextCode && !form.getValues('sale_code') && !saleId) {
      form.setValue('sale_code', nextCodeData.nextCode);
    }
  }, [nextCodeData, saleId]);

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      try {
        const result = await api.getPaymentMethods();
        return result.ok ? (result.data || []) : [];
      } catch (error) {
        console.error('Erro ao buscar métodos de pagamento:', error);
        setHasError(true);
        setErrorMessage('Erro ao carregar métodos de pagamento');
        return [];
      }
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', studentSearch],
    queryFn: async () => {
      try {
        const result = await api.getStudents({ search: studentSearch });
        return result.ok ? (((result.data as any)?.students) || []) : [];
      } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        setHasError(true);
        setErrorMessage('Erro ao carregar lista de alunos');
        return [];
      }
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const result = await api.getUsers();
        return result.ok ? (result.data?.users?.filter((user: any) => user.active) || []) : [];
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setHasError(true);
        setErrorMessage('Erro ao carregar lista de usuários');
        return [];
      }
    },
  });

  // Buscar todas as vendas para verificar alunos já associados
  const { data: allSales = [] } = useQuery({
    queryKey: ['all-sales-for-validation'],
    queryFn: async () => {
      try {
        const result = await api.getSales({});
        return result.ok ? (((result.data as any)?.sales) || []) : [];
      } catch (error) {
        console.error('Erro ao buscar vendas para validação:', error);
        // Não definir erro aqui pois é uma query secundária
        return [];
      }
    },
  });

  // Se houver erro, mostrar alerta de erro
  if (hasError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => {
                setHasError(false);
                setErrorMessage("");
                window.location.reload();
              }}
            >
              Recarregar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

  // Sincronizar selectedStudents quando a venda mudar
  React.useEffect(() => {
    if (initialData?.students) {
      setSelectedStudents(initialData.students);
    }
  }, [saleId]);

  // Resetar o formulário quando initialData muda (para edição)
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        sale_code: initialData.sale_code || "",
        payer_name: initialData.payer_name || "",
        payer_email: initialData.payer_email || "",
        payer_phone: initialData.payer_phone || "",
        payer_cpf: initialData.payer_cpf || "",
        total_amount: initialData.total_amount || "",
        paid_amount: initialData.paid_amount || "0",
        payment_method_id: initialData.payment_method_id || "",
        payment_status: initialData.payment_status || "pending",
        sale_date: initialData.sale_date || new Date().toISOString().split('T')[0],
        notes: initialData.notes || "",
        // Campos UTM - usar valores do initialData ou null
        utm_consultor: initialData.utm_consultor || null,
        utm_source: initialData.utm_source || null,
        utm_medium: initialData.utm_medium || null,
        utm_campaign: initialData.utm_campaign || null,
        utm_content: initialData.utm_content || null,
        utm_term: initialData.utm_term || null,
      });
    }
  }, [initialData, form]);

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
          const hasStudent = saleData.students?.some((s: any) => s.id === studentId);
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
      console.log('=== INICIO DO SUBMIT ===');
      console.log('1. Data recebida do form:', data);
      console.log('2. saleId:', saleId);
      console.log('3. initialData:', initialData);
      console.log('4. currentPaid (calculado):', currentPaid);
      
      const totalAmountNumber = parseFloat(data.total_amount);
      const targetPaid = data.paid_amount ? parseFloat(data.paid_amount) : 0;
      const delta = saleId ? targetPaid - currentPaid : targetPaid;
      
      console.log('5. totalAmountNumber:', totalAmountNumber);
      console.log('6. targetPaid:', targetPaid);
      console.log('7. delta (diferença):', delta);

      // Definir status baseado no valor pago desejado
      let finalStatus: string = 'pending';
      if (targetPaid >= totalAmountNumber && targetPaid > 0) finalStatus = 'paid';
      else if (targetPaid > 0 && targetPaid < totalAmountNumber) finalStatus = 'partial';

      console.log('8. finalStatus calculado:', finalStatus);

      // Atualizar venda
      const payload = {
        ...data,
        total_amount: totalAmountNumber,
        paid_amount: targetPaid,
        payment_status: finalStatus,
        payment_method_id: parseInt(data.payment_method_id),
        student_ids: selectedStudents.map(s => s.id),
        // Garantir que campos UTM null sejam enviados como null, não como string vazia
        utm_consultor: data.utm_consultor || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_content: data.utm_content || null,
        utm_term: data.utm_term || null,
      } as any;

      console.log('9. Payload para API:', payload);
      console.log('9.1. Campos UTM no payload:', {
        utm_consultor: payload.utm_consultor,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
      });

      const result = saleId
        ? await api.updateSale(saleId, payload)
        : await api.createSale(payload);

      console.log('10. Resultado da API:', result);

      if (!result.ok) {
        console.error('11. ERRO na API:', result.error);
        toast.error(result.error || "Erro ao salvar venda");
        return;
      }

      console.log('12. Venda salva com sucesso. Verificando se precisa criar pagamento...');
      console.log('13. delta > 0?', delta > 0);

      // Criar pagamento automático quando necessário
      if (delta > 0) {
        console.log('14. Criando pagamento de:', delta);
        const paymentPayload = {
          sale_id: saleId || (result.data as any)?.id,
          amount: delta,
          payment_date: data.sale_date || new Date().toISOString().split('T')[0],
          payment_method_id: parseInt(data.payment_method_id),
          notes: 'Ajuste automático via formulário de venda',
        };
        console.log('15. Payload do pagamento:', paymentPayload);
        
        const paymentRes = await api.createPayment(paymentPayload);
        console.log('16. Resultado do pagamento:', paymentRes);
        
        if (!paymentRes.ok) {
          console.error('17. ERRO ao criar pagamento:', paymentRes.error);
          toast.error('Venda salva, mas falhou ao registrar o pagamento: ' + paymentRes.error);
        } else {
          console.log('18. Pagamento criado com sucesso!');
        }
      } else if (delta < 0) {
        console.log('14. Delta negativo - não vamos remover pagamentos automaticamente');
        toast.message('Para reduzir o valor pago, ajuste os pagamentos na seção de pagamentos.');
      } else {
        console.log('14. Delta é zero - nenhum pagamento a criar');
      }

      console.log('=== FIM DO SUBMIT - SUCESSO ===');
      toast.success(saleId ? "Venda atualizada com sucesso!" : "Venda cadastrada com sucesso!");
      form.reset();
      setSelectedStudents([]);
      onSuccess?.();
    } catch (error) {
      console.error('=== ERRO NO SUBMIT ===', error);
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

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações da Venda</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Informações adicionais sobre esta venda..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Seção UTM - Dados de Rastreamento */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados UTM - Rastreamento <span className="text-sm font-normal text-muted-foreground">(Opcionais)</span></h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* UTM Consultor */}
            <FormField
              control={form.control}
              name="utm_consultor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultora</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma consultora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UTM Source */}
            <FormField
              control={form.control}
              name="utm_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Source</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: google, facebook, instagram" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UTM Medium */}
            <FormField
              control={form.control}
              name="utm_medium"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Medium</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: cpc, social, email" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UTM Campaign */}
            <FormField
              control={form.control}
              name="utm_campaign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Campaign</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: promocao-verao, black-friday" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UTM Content */}
            <FormField
              control={form.control}
              name="utm_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Content</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: banner-topo, link-rodape" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UTM Term */}
            <FormField
              control={form.control}
              name="utm_term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Term</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: curso-online, certificacao" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
