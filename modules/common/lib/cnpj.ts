// Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) utilities.
// The CNPJ is a 14-digit identifier where the last two digits are check digits
// calculated from the first twelve using modulo 11 with weights cycling 2–9.

export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function formatCnpj(cnpj: string): string {
  const digits = cleanCnpj(cnpj);
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function calcCheckDigit(digits: number[]): number {
  // Weights run 2..9 right-to-left, wrapping; equivalent to starting the
  // leftmost weight at ((len - 1) % 8) + 2 and decrementing, wrapping 1 → 9.
  let weight = ((digits.length - 1) % 8) + 2;
  let sum = 0;
  for (const d of digits) {
    sum += d * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function validateCnpj(cnpj: string): boolean {
  const digits = cleanCnpj(cnpj);
  if (digits.length !== 14) return false;
  // A CNPJ made of the same repeated digit passes the checksum but is invalid.
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const nums = digits.split("").map(Number);
  const d1 = calcCheckDigit(nums.slice(0, 12));
  if (d1 !== nums[12]) return false;
  const d2 = calcCheckDigit(nums.slice(0, 13));
  return d2 === nums[13];
}

export function generateCnpj(formatted = false): string {
  const nums: number[] = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10)
  );

  // Reject sequences of a single repeated digit so we never emit an invalid CNPJ.
  if (nums.every((d) => d === nums[0])) nums[0] = (nums[0] + 1) % 10;

  nums.push(calcCheckDigit(nums));
  nums.push(calcCheckDigit(nums));
  const raw = nums.join("");
  return formatted ? formatCnpj(raw) : raw;
}
