import {
  formatCnpj,
  generateCnpj,
  validateCnpj,
} from "../../../../modules/common/lib/cnpj.js";

export type GenerateArgs = {
  count: number;
  formatted: boolean;
};

export async function generate(options: GenerateArgs) {
  const { count, formatted } = options;
  for (let i = 0; i < count; i++) {
    console.log(generateCnpj(formatted));
  }
}

export async function validate(cnpj: string) {
  const ok = validateCnpj(cnpj);
  if (ok) {
    console.log(`✅ Valid CNPJ: ${formatCnpj(cnpj)}`);
  } else {
    console.log(`❌ Invalid CNPJ: ${cnpj}`);
    process.exitCode = 1;
  }
}
