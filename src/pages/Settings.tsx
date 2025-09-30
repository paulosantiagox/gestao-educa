import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/contexts/SettingsContext";
import { WhatsAppTemplatesSettings } from "@/components/WhatsAppTemplatesSettings";
import { toast } from "sonner";

const Settings = () => {
  const { settings, updateSettings } = useSettings();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
    toast.success("Configuração atualizada!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações Globais</h1>
        <p className="text-muted-foreground">Configure o comportamento do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo de Desenvolvimento</CardTitle>
          <CardDescription>
            Ative recursos para facilitar o desenvolvimento e testes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="test-mode" className="text-base">
                Modo de Teste
              </Label>
              <p className="text-sm text-muted-foreground">
                Exibe botão "Preencher com Dados de Teste" nos formulários
              </p>
            </div>
            <Switch
              id="test-mode"
              checked={settings.testMode}
              onCheckedChange={(checked) => handleToggle('testMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="debug-mode" className="text-base">
                Modo Debug
              </Label>
              <p className="text-sm text-muted-foreground">
                Exibe informações de debug no console (futuro)
              </p>
            </div>
            <Switch
              id="debug-mode"
              checked={settings.debugMode}
              onCheckedChange={(checked) => handleToggle('debugMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <WhatsAppTemplatesSettings />

      <Card>
        <CardHeader>
          <CardTitle>Consulta Pública de Status</CardTitle>
          <CardDescription>
            Link para os alunos consultarem o status de certificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value="https://ejaeducabrasil.com/consultar-aluno"
              className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border border-input"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://ejaeducabrasil.com/consultar-aluno');
                toast.success('Link copiado para a área de transferência!');
              }}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Copiar Link
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link com os alunos para que possam consultar o status de certificação usando o CPF
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Versão do Sistema: 1.0.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
