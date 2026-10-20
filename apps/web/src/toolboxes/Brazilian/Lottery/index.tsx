import { CliUsage } from "@/components/cli-usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatLotteryBet,
  generateLotteryBet,
  LotteryGameId,
  LotteryGameIds,
  LotteryGames,
} from "common/lib/lottery";
import { Copy, RefreshCcw } from "lucide-react";
import { useState } from "react";

const clampCount = (value: number) => Math.max(1, Math.min(50, Math.floor(value) || 1));

function generateBets(gameId: LotteryGameId, picks: number, count: number) {
  return Array.from({ length: count }, () => generateLotteryBet(gameId, picks));
}

export default function BrazilianLottery_ToolPage() {
  const [gameId, setGameId] = useState<LotteryGameId>("mega-sena");
  const [picks, setPicks] = useState(LotteryGames["mega-sena"].minPicks);
  // The typed value, which may be empty or out of range while editing
  const [countInput, setCountInput] = useState(1);
  const [bets, setBets] = useState(() => generateBets("mega-sena", picks, 1));
  const [copied, setCopied] = useState(false);

  const game = LotteryGames[gameId];
  const fixedPicks = game.minPicks === game.maxPicks;
  const count = clampCount(countInput);

  const regenerate = (nextGameId = gameId, nextPicks = picks, nextCount = count) => {
    setBets(generateBets(nextGameId, nextPicks, nextCount));
    setCopied(false);
  };

  const handleGame = (id: LotteryGameId) => {
    const minPicks = LotteryGames[id].minPicks;
    setGameId(id);
    setPicks(minPicks);
    regenerate(id, minPicks);
  };

  const handlePicks = (value: number) => {
    setPicks(value);
    regenerate(gameId, value);
  };

  const handleCount = (value: number) => {
    setCountInput(value);
    regenerate(gameId, picks, clampCount(value));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bets.map(formatLotteryBet).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cliGame = gameId === "mega-sena" ? "" : ` -g ${gameId}`;
  const cliPicks = picks === game.minPicks ? "" : ` -n ${picks}`;

  return (
    <div className="flex flex-col gap-6">

      <section className="rounded-lg border bg-card p-4 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Picks random numbers for a bet, using the browser's cryptographic
          random generator. Every combination has the same odds — no generator
          can make a bet more likely to win.
        </p>

        <div className="flex flex-wrap gap-2">
          {LotteryGameIds.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={id === gameId ? "default" : "outline"}
              onClick={() => handleGame(id)}
            >
              {LotteryGames[id].name}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Numbers ({fixedPicks ? game.minPicks : `${game.minPicks}–${game.maxPicks}`})
            </span>
            <select
              value={picks}
              disabled={fixedPicks}
              onChange={(e) => handlePicks(Number(e.target.value))}
              className="h-9 w-28 rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Array.from(
                { length: game.maxPicks - game.minPicks + 1 },
                (_, i) => game.minPicks + i
              ).map((n) => (
                <option key={n} value={n} className="bg-card">
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Bets (1–50)
            </span>
            <Input
              type="number"
              min={1}
              max={50}
              value={countInput || ""}
              onChange={(e) => handleCount(Number(e.target.value))}
              onBlur={() => setCountInput(count)}
              className="w-28"
            />
          </div>
          <Button onClick={() => regenerate()} variant="secondary">
            <RefreshCcw />
            Generate
          </Button>
          <Button onClick={handleCopy} variant="outline">
            <Copy />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {bets.map((bet, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-3 flex flex-wrap items-center gap-2"
          >
            {bets.length > 1 && (
              <span className="w-8 font-mono text-xs text-muted-foreground">
                #{i + 1}
              </span>
            )}
            {bet.map((n) => (
              <span
                key={n}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  "bg-primary/10 text-primary font-mono text-sm font-semibold"
                )}
              >
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
        ))}
      </section>

      <CliUsage
        commands={[
          {
            description: `Generate ${count} ${game.name} bet${count > 1 ? "s" : ""} with ${picks} numbers`,
            command: `dtk lottery generate${cliGame} -c ${count}${cliPicks}`,
          },
          {
            description: "List the supported games and their rules",
            command: "dtk lottery games",
          },
        ]}
      />
    </div>
  );
}
