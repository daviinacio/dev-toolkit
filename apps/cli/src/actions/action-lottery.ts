import {
  formatLotteryBet,
  generateLotteryBet,
  LotteryGameId,
  LotteryGameIds,
  LotteryGames,
} from "../../../../modules/common/lib/lottery.js";

export type GenerateArgs = {
  game: LotteryGameId;
  count: number;
  numbers?: number;
};

export async function generate(options: GenerateArgs) {
  const { game, count, numbers } = options;
  for (let i = 0; i < count; i++) {
    console.log(formatLotteryBet(generateLotteryBet(game, numbers)));
  }
}

export async function games() {
  for (const id of LotteryGameIds) {
    const { name, min, max, minPicks, maxPicks } = LotteryGames[id];
    const picks = minPicks === maxPicks ? `${minPicks}` : `${minPicks}-${maxPicks}`;
    console.log(`${id.padEnd(14)}${name.padEnd(14)}${picks} numbers from ${min} to ${max}`);
  }
}
