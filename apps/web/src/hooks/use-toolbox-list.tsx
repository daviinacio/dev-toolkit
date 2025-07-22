import OutSystemsExpression_ToolPage from "@/toolboxes/OutSystems/Expression-Editor";

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
  ] as Array<ToolBox>;

  return toolboxes;
}
