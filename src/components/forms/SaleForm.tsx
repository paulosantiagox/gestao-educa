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
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      return result.ok ? (result.data || []) : [];
    },
  });

  const addStudent = (student: any) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setStudentSearch("");
  };

  const removeStudent = (studentId: number) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const onSubmit = async (data: SaleFormData) => {
    try {
      const payload = {
        ...data,
        total_amount: parseFloat(data.total_amount),
        paid_amount: data.paid_amount ? parseFloat(data.paid_amount) : 0,
        payment_method_id: parseInt(data.payment_method_id),
        student_ids: selectedStudents.map(s => s.id),
      };

      const result = saleId
        ? await api.updateSale(saleId, payload)
        : await api.createSale(payload);

      if (result.ok) {
        toast.success(saleId ? "Venda atualizada com sucesso!" : "Venda cadastrada com sucesso!");
        form.reset();
        setSelectedStudents([]);
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
                            onSelect={() => {
                              if (!isSelected) {
                                addStudent(student);
                                setOpenStudentCombobox(false);
                                setStudentSearch("");
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : saleId ? "Atualizar Venda" : "Cadastrar Venda"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
