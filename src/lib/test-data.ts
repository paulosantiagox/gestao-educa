// Gerador de dados aleatórios para testes

const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Felipe', 'Fernanda', 'Rafael', 'Beatriz'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento'];
const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador', 'Fortaleza', 'Curitiba', 'Manaus', 'Recife', 'Porto Alegre'];
const states = ['SP', 'RJ', 'MG', 'DF', 'BA', 'CE', 'PR', 'AM', 'PE', 'RS'];
const streets = ['Rua das Flores', 'Av. Principal', 'Rua Central', 'Av. Brasil', 'Rua da Paz', 'Av. Paulista', 'Rua do Comércio', 'Av. Atlântica'];
const neighborhoods = ['Centro', 'Jardim Europa', 'Vila Nova', 'Bela Vista', 'Copacabana', 'Ipanema', 'Leblon', 'Brooklin'];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCPF(): string {
  const n = () => randomNumber(0, 9);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function generatePhone(): string {
  return `(${randomNumber(11, 99)}) 9${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`;
}

function generateZipCode(): string {
  return `${randomNumber(10000, 99999)}-${randomNumber(100, 999)}`;
}

function generateEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'email.com'];
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}${randomNumber(1, 999)}@${randomItem(domains)}`;
}

function generateDate(): string {
  const year = randomNumber(1970, 2005);
  const month = String(randomNumber(1, 12)).padStart(2, '0');
  const day = String(randomNumber(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateStudentData() {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const name = `${firstName} ${lastName}`;
  
  return {
    name,
    email: generateEmail(name),
    phone: generatePhone(),
    cpf: generateCPF(),
    birth_date: generateDate(),
    zip_code: generateZipCode(),
    street: randomItem(streets),
    number: String(randomNumber(1, 9999)),
    complement: randomNumber(0, 1) ? `Apto ${randomNumber(1, 999)}` : '',
    neighborhood: randomItem(neighborhoods),
    city: randomItem(cities),
    state: randomItem(states),
    documents_link: `https://exemplo.com/docs/${randomNumber(1000, 9999)}`,
  };
}

export function generateSaleData() {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const name = `${firstName} ${lastName}`;
  
  return {
    sale_code: `VND-${randomNumber(2024, 2025)}-${String(randomNumber(1, 9999)).padStart(4, '0')}`,
    payer_name: name,
    payer_email: generateEmail(name),
    payer_phone: generatePhone(),
    payer_cpf: generateCPF(),
    total_amount: String((randomNumber(500, 5000) / 100) * 100),
    paid_amount: String((randomNumber(0, 500) / 100) * 100),
    payment_status: randomItem(['pending', 'partial', 'paid']),
    sale_date: new Date().toISOString().split('T')[0],
  };
}

export function generateCertifierData() {
  const name = `Certificadora ${randomItem(['ABC', 'XYZ', 'NORTE', 'SUL', 'LESTE', 'OESTE', 'CENTRAL'])} ${randomNumber(1, 99)}`;
  
  return {
    name,
    contact_email: `contato@${name.toLowerCase().replace(/\s+/g, '')}.com`,
    contact_phone: generatePhone(),
  };
}

export function generateUserData() {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const name = `${firstName} ${lastName}`;
  
  return {
    name,
    email: generateEmail(name),
    password: `Teste@${randomNumber(1000, 9999)}`,
    role: randomItem(['admin', 'user']),
  };
}

export function generatePaymentMethodData() {
  const types = ['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro'];
  const names = {
    pix: 'PIX',
    boleto: 'Boleto Bancário',
    cartao: 'Cartão de Crédito',
    transferencia: 'Transferência Bancária',
    dinheiro: 'Dinheiro'
  };
  
  const type = randomItem(types) as keyof typeof names;
  
  return {
    name: `${names[type]} ${randomNumber(1, 99)}`,
    type,
  };
}
