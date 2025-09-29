import { Card, CardContent } from "@/components/ui/card";

const PaymentMethods = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Formas de Pagamento</h1>
        <p className="text-muted-foreground">Configure as formas de pagamento aceitas</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Página em desenvolvimento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethods;
