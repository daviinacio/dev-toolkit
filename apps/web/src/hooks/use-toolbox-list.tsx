import OutSystemsExpression_ToolPage from "@/toolboxes/OutSystems/Expression-Editor";
import BrazilianCpf_ToolPage from "@/toolboxes/Brazilian/CPF";
import BrazilianCnpj_ToolPage from "@/toolboxes/Brazilian/CNPJ";
import BrazilianPerson_ToolPage from "@/toolboxes/Brazilian/Person";

export type Tool = {
  name: string;
  description: string;
  path: string;
  element: JSX.Element;
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
        },
        {
          name: "CNPJ",
          description: "Generate and validate Brazilian CNPJ numbers",
          path: "cnpj",
          element: <BrazilianCnpj_ToolPage />,
        },
        {
          name: "Person",
          description: "Generate fictional Brazilian person data as JSON",
          path: "person",
          element: <BrazilianPerson_ToolPage />,
        },
      ],
    },
  ] as Array<ToolBox>;

  return toolboxes;
}
