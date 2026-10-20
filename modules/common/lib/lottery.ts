// Random bets for the Brazilian lotteries run by Caixa.
// Each game picks distinct numbers from a range; a bet may pick more numbers
// than the minimum (a "bolão"-style bigger bet), up to the game's limit.

export type LotteryGame = {
  name: string;
  /** Lowest and highest number on the ticket */
  min: number;
  max: number;
  /** How many numbers a bet picks, from the cheapest to the biggest bet */
  minPicks: number;
  maxPicks: number;
};

export const LotteryGames = {
  "mega-sena": { name: "Mega-Sena", min: 1, max: 60, minPicks: 6, maxPicks: 20 },
  lotofacil: { name: "Lotofácil", min: 1, max: 25, minPicks: 15, maxPicks: 20 },
  quina: { name: "Quina", min: 1, max: 80, minPicks: 5, maxPicks: 15 },
  // Lotomania tickets go from 00 to 99
  lotomania: { name: "Lotomania", min: 0, max: 99, minPicks: 50, maxPicks: 50 },
  "dupla-sena": { name: "Dupla Sena", min: 1, max: 50, minPicks: 6, maxPicks: 15 },
  timemania: { name: "Timemania", min: 1, max: 80, minPicks: 10, maxPicks: 10 },
  "dia-de-sorte": { name: "Dia de Sorte", min: 1, max: 31, minPicks: 7, maxPicks: 15 },
} satisfies Record<string, LotteryGame>;

export type LotteryGameId = keyof typeof LotteryGames;

export const LotteryGameIds = Object.keys(LotteryGames) as LotteryGameId[];

/** A uniform random integer in [0, n), from crypto when the runtime has it */
function randomInt(n: number): number {
  const crypto = (globalThis as any).crypto;
  if (!crypto?.getRandomValues) return Math.floor(Math.random() * n);

  // Rejection sampling avoids the modulo bias of `value % n`
  const limit = Math.floor(0x100000000 / n) * n;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return buffer[0] % n;
}

/** Distinct random numbers of the game, in ascending order */
export function generateLotteryBet(
  gameId: LotteryGameId,
  picks: number = LotteryGames[gameId].minPicks
): number[] {
  const game: LotteryGame = LotteryGames[gameId];
  if (!Number.isInteger(picks) || picks < game.minPicks || picks > game.maxPicks) {
    throw new Error(
      game.minPicks === game.maxPicks
        ? `${game.name} bets pick exactly ${game.minPicks} numbers`
        : `${game.name} bets pick from ${game.minPicks} to ${game.maxPicks} numbers`
    );
  }

  // Partial Fisher-Yates shuffle of the whole range
  const pool = Array.from({ length: game.max - game.min + 1 }, (_, i) => game.min + i);
  for (let i = 0; i < picks; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, picks).sort((a, b) => a - b);
}

/** Two-digit numbers as printed on the ticket, e.g. `04 17 23 38 41 59` */
export function formatLotteryBet(bet: number[]): string {
  return bet.map((n) => String(n).padStart(2, "0")).join(" ");
}
