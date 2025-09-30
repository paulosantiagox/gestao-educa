import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WhatsAppTemplate {
  status: string;
  message: string;
}

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    status: 'welcome',
    message: `✅ Olá, Seja Bem-vindo(a) *{{nome}}* ao EJA EDUCA BRASIL EAD! 🎉

Meu nome é Sonimar, sou secretária do EJA EDUCA BRASIL EAD e estarei à disposição para auxiliá-lo(a) em qualquer dúvida administrativa.

Caso precise de suporte, este será nosso número de contato: 92 9470-0146.

*Nota Importante*

O prazo para o *certificado digital é de 30 a 45 dias úteis* a partir do dia que você realizar a prova e enviar os dados da documentação solicitados. 😉

O prazo para o *certificado físico* é no máximo de 90 dias (opcional).

Assim que *concluir sua prova,* por favor, me informe para que eu possa orientá-lo(a) sobre os próximos passos para a *emissão do seu certificado.*

*Desejamos sucesso nos seus estudos! 📚✨*

_Qualquer dúvida pode me perguntar que eu te ajudo! 😀_

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'exam_in_progress',
    message: `📝 Olá *{{nome}}*!

Notamos que sua prova está em andamento no EJA EDUCA BRASIL EAD.

Lembre-se de que após concluir, precisaremos dos seus documentos para dar continuidade ao processo de certificação.

Qualquer dúvida, estamos à disposição!

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'documents_requested',
    message: `📄 Olá *{{nome}}*!

Sua prova foi concluída com sucesso! 🎉

Agora precisamos que você nos envie os seguintes documentos para dar continuidade ao processo de certificação:

- RG (frente e verso)
- CPF
- Comprovante de residência

Por favor, envie os documentos assim que possível.

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'documents_under_review',
    message: `🔍 Olá *{{nome}}*!

Recebemos seus documentos e estamos analisando tudo com cuidado.

Em breve retornaremos com o resultado da análise ou solicitação de alguma pendência, se necessário.

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'certification_started',
    message: `✅ Olá *{{nome}}*!

Seus documentos foram aprovados e já enviamos tudo para a certificadora!

O processo de emissão do certificado está em andamento. Em breve você receberá seu certificado digital.

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'digital_certificate_sent',
    message: `🎓 Parabéns *{{nome}}*!

Seu certificado digital do Ensino Médio EJA EAD foi emitido e enviado para seu e-mail!

Por favor, verifique sua caixa de entrada (e spam, se necessário).

Se você optou pelo certificado físico, ele será enviado em breve.

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'physical_certificate_sent',
    message: `📦 Olá *{{nome}}*!

Seu certificado físico foi enviado!

Código de rastreio: {{codigo_rastreio}}

Você pode acompanhar a entrega pelos Correios.

Atenciosamente,
Sonimar Dofoulf`
  },
  {
    status: 'completed',
    message: `✅ Olá *{{nome}}*!

Seu processo de certificação foi concluído com sucesso! 🎉

Agradecemos por escolher o EJA EDUCA BRASIL EAD e desejamos muito sucesso em sua jornada!

Atenciosamente,
Sonimar Dofoulf`
  }
];

interface WhatsAppTemplatesContextType {
  templates: WhatsAppTemplate[];
  updateTemplate: (status: string, message: string) => void;
  getTemplate: (status: string) => string;
  resetTemplates: () => void;
}

const WhatsAppTemplatesContext = createContext<WhatsAppTemplatesContextType | undefined>(undefined);

export function WhatsAppTemplatesProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => {
    const stored = localStorage.getItem('whatsapp_templates');
    return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    localStorage.setItem('whatsapp_templates', JSON.stringify(templates));
  }, [templates]);

  const updateTemplate = (status: string, message: string) => {
    setTemplates(prev => 
      prev.map(t => t.status === status ? { ...t, message } : t)
    );
  };

  const getTemplate = (status: string): string => {
    const template = templates.find(t => t.status === status);
    return template?.message || '';
  };

  const resetTemplates = () => {
    setTemplates(DEFAULT_TEMPLATES);
  };

  return (
    <WhatsAppTemplatesContext.Provider value={{ templates, updateTemplate, getTemplate, resetTemplates }}>
      {children}
    </WhatsAppTemplatesContext.Provider>
  );
}

export function useWhatsAppTemplates() {
  const context = useContext(WhatsAppTemplatesContext);
  if (!context) {
    throw new Error('useWhatsAppTemplates must be used within WhatsAppTemplatesProvider');
  }
  return context;
}
