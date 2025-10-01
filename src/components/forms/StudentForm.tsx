import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSettings } from "@/contexts/SettingsContext";
import { generateStudentData } from "@/lib/test-data";
import { Beaker } from "lucide-react";

const studentSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().nullable().optional().transform(val => val || ""),
  cpf: z.string().nullable().optional().transform(val => val || ""),
  birth_date: z.string().nullable().optional().transform(val => val || ""),
  zip_code: z.string().nullable().optional().transform(val => val || ""),
  street: z.string().nullable().optional().transform(val => val || ""),
  number: z.string().nullable().optional().transform(val => val || ""),
  complement: z.string().nullable().optional().transform(val => val || ""),
  neighborhood: z.string().nullable().optional().transform(val => val || ""),
  city: z.string().nullable().optional().transform(val => val || ""),
  state: z.string().nullable().optional().transform(val => val || ""),
  documents_link: z.string().url("Link inválido").nullable().optional().or(z.literal("")).transform(val => val || ""),
  notes: z.string().nullable().optional().transform(val => val || ""),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  onSuccess?: () => void;
  initialData?: Partial<StudentFormData>;
  studentId?: number;
}

export function StudentForm({ onSuccess, initialData, studentId }: StudentFormProps) {
  const { settings } = useSettings();
  
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      birth_date: "",
      zip_code: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      documents_link: "",
      notes: "",
    },
  });

  const fillTestData = () => {
    const testData = generateStudentData();
    Object.keys(testData).forEach((key) => {
      form.setValue(key as keyof StudentFormData, testData[key as keyof typeof testData]);
    });
    toast.success("Dados de teste preenchidos!");
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      // Sanitizar payload: converter "" para null e remover máscaras
      const payload = {
        ...data,
        cpf: data.cpf?.replace(/\D/g, '') || null,
        birth_date: data.birth_date || null,
        zip_code: data.zip_code || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        documents_link: data.documents_link || null,
        notes: data.notes || null,
      };

      const result = studentId
        ? await api.updateStudent(studentId, payload)
        : await api.createStudent(payload);

      if (result.ok) {
        toast.success(studentId ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao salvar aluno");
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="joao@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 98888-8888" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input placeholder="123.456.789-00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documents_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link dos Documentos (Google Drive)</FormLabel>
                <FormControl>
                  <Input placeholder="https://drive.google.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Endereço</h3>
          
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="zip_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input placeholder="01234-567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua Exemplo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input placeholder="Apto 45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input placeholder="SP" maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais sobre o aluno..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          {settings.testMode && !studentId && (
            <Button type="button" variant="outline" onClick={fillTestData}>
              <Beaker className="mr-2 h-4 w-4" />
              Preencher com Dados de Teste
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : studentId ? "Atualizar Aluno" : "Cadastrar Aluno"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
