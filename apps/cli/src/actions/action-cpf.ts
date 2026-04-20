import {
  formatCpf,
  generateCpf,
  validateCpf,
} from "../../../../modules/common/lib/cpf.js";

export type GenerateArgs = {
  count: number;
  formatted: boolean;
};

export async function generate(options: GenerateArgs) {
  const { count, formatted } = options;
  for (let i = 0; i < count; i++) {
    console.log(generateCpf(formatted));
  }
}

export async function validate(cpf: string) {
  const ok = validateCpf(cpf);
  if (ok) {
    console.log(`✅ Valid CPF: ${formatCpf(cpf)}`);
  } else {
    console.log(`❌ Invalid CPF: ${cpf}`);
    process.exitCode = 1;
  }
}
