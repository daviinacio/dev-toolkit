// Brazilian CPF (Cadastro de Pessoas Físicas) utilities.
// The CPF is an 11-digit identifier where the last two digits are check digits
// calculated from the first nine using modulo 11 with descending weights.

export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function formatCpf(cpf: string): string {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function calcCheckDigit(digits: number[]): number {
  const weightStart = digits.length + 1;
  const sum = digits.reduce((acc, d, i) => acc + d * (weightStart - i), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function validateCpf(cpf: string): boolean {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) return false;
  // A CPF made of the same repeated digit passes the checksum but is invalid.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const nums = digits.split("").map(Number);
  const d1 = calcCheckDigit(nums.slice(0, 9));
  if (d1 !== nums[9]) return false;
  const d2 = calcCheckDigit(nums.slice(0, 10));
  return d2 === nums[10];
}

export function generateCpf(formatted = false): string {
  const nums: number[] = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  );

  // Reject sequences of a single repeated digit so we never emit an invalid CPF.
  if (nums.every((d) => d === nums[0])) nums[0] = (nums[0] + 1) % 10;

  nums.push(calcCheckDigit(nums));
  nums.push(calcCheckDigit(nums));
  const raw = nums.join("");
  return formatted ? formatCpf(raw) : raw;
}
