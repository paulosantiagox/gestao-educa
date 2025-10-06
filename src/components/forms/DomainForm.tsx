import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface DomainFormProps {
  onDomainAdded: () => void;
}

export const DomainForm: React.FC<DomainFormProps> = ({ onDomainAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [newDomainData, setNewDomainData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain || !name) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://gestao-educa.autoflixtreinamentos.com/api/tracking/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
          name
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewDomainData(data.domain);
        toast.success("Domínio adicionado com sucesso!");
        onDomainAdded();
        setDomain("");
        setName("");
      } else {
        toast.error(data.error || "Erro ao adicionar domínio");
      }
    } catch (error) {
      console.error('Erro ao adicionar domínio:', error);
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const copyTrackingCode = () => {
    if (newDomainData) {
      const trackingScript = `<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://gestao-educa.autoflixtreinamentos.com/api/tracking/script.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','EJATracking','${newDomainData.tracking_code}');
</script>`;
      
      navigator.clipboard.writeText(trackingScript);
      setCopied(true);
      toast.success("Código copiado para a área de transferência!");
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNewDomainData(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Domínio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {newDomainData ? "Domínio Adicionado!" : "Adicionar Novo Domínio"}
          </DialogTitle>
          <DialogDescription>
            {newDomainData 
              ? "Seu domínio foi cadastrado com sucesso. Copie o código abaixo e instale no seu site."
              : "Adicione um novo domínio para começar a rastrear visitantes."
            }
          </DialogDescription>
        </DialogHeader>

        {!newDomainData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Site</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Meu Site WordPress"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domínio</Label>
              <Input
                id="domain"
                type="text"
                placeholder="Ex: meusite.com.br"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas o domínio, sem http:// ou https://
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adicionando..." : "Adicionar Domínio"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Domínio Cadastrado</h4>
              <p className="text-sm text-green-700">
                <strong>Domínio:</strong> {newDomainData.domain}<br />
                <strong>ID de Tracking:</strong> {newDomainData.tracking_code}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Código de Instalação</Label>
              <div className="relative">
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://gestao-educa.autoflixtreinamentos.com/api/tracking/script.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','EJATracking','${newDomainData.tracking_code}');
</script>`}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={copyTrackingCode}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📋 Próximos Passos</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Copie o código acima</li>
                <li>2. Cole no <code>&lt;head&gt;</code> do seu site</li>
                <li>3. Aguarde alguns minutos</li>
                <li>4. Verifique os dados no dashboard</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};