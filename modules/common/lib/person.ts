// Fictional Brazilian person generator. Embedded pools keep the package
// dependency-free so both the CLI (published to npm) and the web app stay lean.

import { generateCpf } from "./cpf.js";

export type Person = {
  name: { first: string; last: string; full: string };
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
  address: {
    cep: string;
    street: string;
    number: number;
    neighborhood: string;
    city: string;
    state: string;
  };
};

const firstNamesMale = [
  "Pedro", "João", "Lucas", "Gabriel", "Matheus", "Rafael", "Felipe", "Bruno",
  "Gustavo", "Rodrigo", "Marcelo", "André", "Carlos", "Eduardo", "Fernando",
  "Thiago", "Leonardo", "Diego", "Daniel", "Vinícius", "Henrique", "Ricardo",
  "Paulo", "Guilherme", "Marcos", "José", "Antônio", "Francisco", "Luís",
  "Miguel", "Davi", "Enzo", "Arthur", "Bernardo", "Heitor",
];

const firstNamesFemale = [
  "Maria", "Ana", "Julia", "Beatriz", "Camila", "Fernanda", "Isabella",
  "Larissa", "Mariana", "Carolina", "Letícia", "Gabriela", "Amanda", "Bruna",
  "Luana", "Natália", "Patrícia", "Priscila", "Aline", "Vanessa", "Sofia",
  "Helena", "Laura", "Manuela", "Alice", "Valentina", "Heloísa", "Cecília",
  "Giovanna", "Yasmin", "Clara", "Eloá", "Lívia", "Melissa", "Rebeca",
];

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa",
  "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins",
  "Araújo", "Barbosa", "Ribeiro", "Alves", "Ferreira", "Rocha", "Dias",
  "Monteiro", "Mendes", "Cardoso", "Reis", "Teixeira", "Moreira", "Cavalcanti",
  "Correia", "Pinto", "Castro", "Azevedo", "Campos", "Freitas", "Moraes",
];

const streetPrefixes = ["Rua", "Avenida", "Travessa", "Alameda", "Praça"];

const streetNames = [
  "das Flores", "dos Andradas", "Brasil", "São João", "Paulista", "Rio Branco",
  "XV de Novembro", "Sete de Setembro", "da Consolação", "Getúlio Vargas",
  "Presidente Vargas", "Marechal Deodoro", "Duque de Caxias", "Santos Dumont",
  "Tiradentes", "da Liberdade", "dos Pinheiros", "Barão do Rio Branco",
  "Visconde de Taunay", "Osvaldo Cruz",
];

const neighborhoods = [
  "Centro", "Jardim América", "Vila Nova", "Boa Vista", "Santa Cecília",
  "Ipanema", "Copacabana", "Moema", "Pinheiros", "Savassi", "Tijuca", "Barra",
  "Lapa", "Higienópolis", "Botafogo", "Vila Madalena", "Itaim Bibi",
  "Perdizes", "Liberdade", "Bela Vista",
];

const citiesByState: Array<[string, string]> = [
  ["São Paulo", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"],
  ["Salvador", "BA"], ["Curitiba", "PR"], ["Porto Alegre", "RS"],
  ["Recife", "PE"], ["Fortaleza", "CE"], ["Brasília", "DF"], ["Manaus", "AM"],
  ["Belém", "PA"], ["Florianópolis", "SC"], ["Goiânia", "GO"],
  ["Campinas", "SP"], ["Natal", "RN"], ["São Luís", "MA"], ["Maceió", "AL"],
  ["João Pessoa", "PB"], ["Teresina", "PI"], ["Vitória", "ES"],
  ["Cuiabá", "MT"], ["Campo Grande", "MS"], ["Aracaju", "SE"],
  ["Rio Branco", "AC"], ["Palmas", "TO"], ["Porto Velho", "RO"],
  ["Macapá", "AP"], ["Boa Vista", "RR"],
];

const ddds = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
];

const emailDomains = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function randomBirthDate(minAge: number, maxAge: number): string {
  const now = new Date();
  const start = new Date(now.getFullYear() - maxAge, 0, 1).getTime();
  const end = new Date(now.getFullYear() - minAge, 11, 31).getTime();
  const ts = start + Math.random() * (end - start);
  return new Date(ts).toISOString().slice(0, 10);
}

export function generatePerson(): Person {
  const isMale = Math.random() < 0.5;
  const firstName = pick(isMale ? firstNamesMale : firstNamesFemale);
  const primaryLast = pick(lastNames);
  const secondLast = Math.random() < 0.4 ? pick(lastNames) : null;
  const fullLast = secondLast ? `${secondLast} ${primaryLast}` : primaryLast;
  const full = `${firstName} ${fullLast}`;

  const handleBase = `${stripAccents(firstName)}.${stripAccents(primaryLast)}`.toLowerCase();
  const handle =
    Math.random() < 0.5 ? `${handleBase}${randomInt(1, 99)}` : handleBase;
  const email = `${handle}@${pick(emailDomains)}`;

  const ddd = pick(ddds);
  const prefix = String(randomInt(0, 9999)).padStart(4, "0");
  const suffix = String(randomInt(0, 9999)).padStart(4, "0");
  const phone = `(${ddd}) 9${prefix}-${suffix}`;

  const cepDigits = String(randomInt(10000000, 99999999));
  const cep = `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;

  const [city, state] = pick(citiesByState);

  return {
    name: { first: firstName, last: fullLast, full },
    email,
    phone,
    birthDate: randomBirthDate(18, 80),
    cpf: generateCpf(true),
    address: {
      cep,
      street: `${pick(streetPrefixes)} ${pick(streetNames)}`,
      number: randomInt(1, 9999),
      neighborhood: pick(neighborhoods),
      city,
      state,
    },
  };
}

export function generatePeople(count: number): Person[] {
  return Array.from({ length: count }, () => generatePerson());
}
