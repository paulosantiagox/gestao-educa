import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Code, Copy, Check, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Domain {
  id: number;
  domain: string;
  tracking_code: string;
}

interface DomainsListProps {
  domains: Domain[];
}

export const DomainsList: React.FC<DomainsListProps> = ({ domains }) => {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsCodeDialogOpen(true);
    setCopied(false);
  };

  const copyTrackingCode = () => {
    if (selectedDomain) {
      const trackingScript = `<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://gestao-educa.autoflixtreinamentos.com/api/tracking/script.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','EJATracking','${selectedDomain.tracking_code}');
</script>`;
      
      navigator.clipboard.writeText(trackingScript);
      setCopied(true);
      toast.success("Código copiado para a área de transferência!");
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copySimpleScript = () => {
    const simpleScript = `<script src="https://gestao-educa.autoflixtreinamentos.com/tracking-script-minified.js"></script>`;
    
    navigator.clipboard.writeText(simpleScript);
    toast.success("Script simples copiado!");
  };

  const handleCloseDialog = () => {
    setIsCodeDialogOpen(false);
    setSelectedDomain(null);
    setCopied(false);
  };

  if (domains.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domínios Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{domain.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    Ativo
                  </Badge>
                  <Button
                    onClick={() => handleGenerateCode(domain)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Gerar Código
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                ID: {domain.tracking_code}
              </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para exibir o código */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Código de Tracking - {selectedDomain?.domain}
            </DialogTitle>
            <DialogDescription>
              Copie e cole um dos códigos abaixo no seu site WordPress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Código Universal Personalizado */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-green-700">🎯 Código Universal (Recomendado)</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyTrackingCode}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto border">
{selectedDomain && `<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://gestao-educa.autoflixtreinamentos.com/api/tracking/script.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','EJATracking','${selectedDomain.tracking_code}');
</script>`}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                ✅ Código personalizado para este domínio específico
              </p>
            </div>

            {/* Script Simples */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-700">⚡ Script Simples (Alternativo)</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySimpleScript}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto border">
{`<script src="https://gestao-educa.autoflixtreinamentos.com/tracking-script-minified.js"></script>`}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚡ Detecta automaticamente o domínio (mais simples de instalar)
              </p>
            </div>

            {/* Instruções de Instalação */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">📋 Como Instalar no WordPress</h4>
              <ol className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">1.</span>
                  <span>Acesse o painel do WordPress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">2.</span>
                  <span>Vá em <strong>Aparência → Editor de Temas</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">3.</span>
                  <span>Abra o arquivo <strong>header.php</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">4.</span>
                  <span>Encontre a tag <code>&lt;/head&gt;</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">5.</span>
                  <span>Cole o código <strong>ANTES</strong> da tag <code>&lt;/head&gt;</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">6.</span>
                  <span>Clique em <strong>"Atualizar Arquivo"</strong></span>
                </li>
              </ol>
            </div>

            {/* Informações do Domínio */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">ℹ️ Informações do Domínio</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Domínio:</strong> {selectedDomain?.domain}</p>
                <p><strong>ID de Tracking:</strong> {selectedDomain?.tracking_code}</p>
                <p><strong>Status:</strong> Ativo</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCloseDialog}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};