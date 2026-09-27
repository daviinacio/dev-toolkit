import { CodeBlock, InlineCode } from "@/components/ui/code-block";
import { Link } from "react-router-dom";

export default function CommandLinePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">CLI Installation</h1>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          Install the <InlineCode>dev-toolkit</InlineCode> command-line version
          (<InlineCode>dtk</InlineCode>) to run these tools straight from your
          terminal.
        </p>
      </header>

      <section id="requirements" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Requirements</h2>
        <ul className="list-disc list-inside text-sm space-y-1 pl-2">
          <li>Node.js 18 or newer</li>
          <li>
            <InlineCode>npm</InlineCode> or <InlineCode>yarn</InlineCode>{" "}
            available on your PATH
          </li>
          <li>
            <InlineCode>ffmpeg</InlineCode> on PATH — only required for the{" "}
            <InlineCode>compress</InlineCode> command
          </li>
        </ul>
      </section>

      <section id="installation" className="flex flex-col gap-3 scroll-mt-20">
        <h2 className="font-display text-lg font-semibold tracking-tight">Install globally</h2>
        <p className="text-sm text-muted-foreground">Using npm:</p>
        <CodeBlock code="npm install -g dev-toolkit-cli" />
        <p className="text-sm text-muted-foreground">Or yarn:</p>
        <CodeBlock code="yarn global add dev-toolkit-cli" />
      </section>

      <section id="verify" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Verify the installation</h2>
        <p className="text-sm text-muted-foreground">
          After installing, the <InlineCode>dtk</InlineCode> binary should be
          available globally:
        </p>
        <CodeBlock code="dtk --help" />
      </section>

      <section id="commands" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Available commands</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
            <div className="font-mono text-sm font-semibold text-primary">dtk compress</div>
            <p className="text-sm text-muted-foreground">
              Compress images and videos with GPU acceleration when available.
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
            <div className="font-mono text-sm font-semibold text-primary">dtk cpf</div>
            <p className="text-sm text-muted-foreground">
              Generate and validate Brazilian CPF numbers.{" "}
              <Link
                to="/brazilian/cpf"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open web version →
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
            <div className="font-mono text-sm font-semibold text-primary">dtk cnpj</div>
            <p className="text-sm text-muted-foreground">
              Generate and validate Brazilian CNPJ numbers.{" "}
              <Link
                to="/brazilian/cnpj"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open web version →
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
            <div className="font-mono text-sm font-semibold text-primary">dtk person</div>
            <p className="text-sm text-muted-foreground">
              Generate fictional Brazilian person data as JSON.{" "}
              <Link
                to="/brazilian/person"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open web version →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section id="examples" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Examples</h2>
        <CodeBlock
          code={[
            "# Compress all videos in a folder to 480p",
            "dtk compress ./videos -T video -R 480p",
            "",
            "# Generate 5 valid CPFs, formatted",
            "dtk cpf generate -c 5 -f",
            "",
            "# Validate a CNPJ",
            "dtk cnpj validate 11.222.333/0001-81",
            "",
            "# Generate 3 fictional people as pretty JSON",
            "dtk person generate -c 3 -p",
          ].join("\n")}
        />
      </section>

      <section id="upgrade" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Upgrade</h2>
        <p className="text-sm text-muted-foreground">
          Re-run the install command to pull the latest version:
        </p>
        <CodeBlock code="npm install -g dev-toolkit-cli@latest" />
      </section>

      <section id="uninstall" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Uninstall</h2>
        <CodeBlock code="npm uninstall -g dev-toolkit-cli" />
      </section>
    </div>
  );
}
