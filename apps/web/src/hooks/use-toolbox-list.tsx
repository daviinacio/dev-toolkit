import OutSystemsExpression_ToolPage from "@/toolboxes/OutSystems/Expression-Editor";
import BrazilianCpf_ToolPage from "@/toolboxes/Brazilian/CPF";
import BrazilianCnpj_ToolPage from "@/toolboxes/Brazilian/CNPJ";
import BrazilianPerson_ToolPage from "@/toolboxes/Brazilian/Person";
import { useLocation } from "react-router-dom";

export type Tool = {
  name: string;
  description: string;
  path: string;
  element: JSX.Element;
  /** Shown on the tool card and matched by the search */
  tags?: Array<string>;
};

export type ToolBox = {
  name: string;
  description: string;
  path: string;
  tools: Array<Tool>;
};

export type UseToolListProps = {};

export function useToolboxList() {
  const toolboxes = [
    {
      name: "OutSystems",
      description: "OutSystems is a low code platform",
      path: "outsystems",
      tools: [
        {
          name: "Expression Editor",
          description: "Test expression logics before publish it",
          path: "expression-editor",
          element: <OutSystemsExpression_ToolPage />,
          tags: ["expression", "low-code", "transpiler"],
        },
      ],
    },
    {
      name: "Brazilian",
      description: "Brazilian-specific document utilities",
      path: "brazilian",
      tools: [
        {
          name: "CPF",
          description: "Generate and validate Brazilian CPF numbers",
          path: "cpf",
          element: <BrazilianCpf_ToolPage />,
          tags: ["cpf", "document", "validate"],
        },
        {
          name: "CNPJ",
          description: "Generate and validate Brazilian CNPJ numbers",
          path: "cnpj",
          element: <BrazilianCnpj_ToolPage />,
          tags: ["cnpj", "company", "validate"],
        },
        {
          name: "Person",
          description: "Generate fictional Brazilian person data as JSON",
          path: "person",
          element: <BrazilianPerson_ToolPage />,
          tags: ["person", "fake data", "json"],
        },
      ],
    },
  ] as Array<ToolBox>;

  return toolboxes;
}

/** The toolbox and tool of the current route, e.g. /brazilian/cpf */
export function useActiveTool() {
  const toolboxes = useToolboxList();
  const { pathname } = useLocation();
  const [toolboxPath, toolPath] = pathname.split("/").filter(Boolean);

  const toolbox = toolboxes.find((it) => it.path === toolboxPath);
  const tool = toolbox?.tools.find((it) => it.path === toolPath);
  return { toolbox, tool };
}
