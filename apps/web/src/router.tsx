import { BrowserRouter, Route, Routes } from "react-router-dom";
import DocumentationLayout from "./components/layout/doc-layout";
import { useToolboxList } from "./hooks/use-toolbox-list";
import { Fragment } from "react/jsx-runtime";

import HomePage from "./pages/Home";
import ToolboxDetailsPage from "./pages/ToolboxDetails";
import CommandLinePage from "./pages/CommandLine";

export function AppRouter() {
  const toolboxes = useToolboxList();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentationLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/cli" element={<CommandLinePage />} />

          {toolboxes.map((toolbox) => (
            <Fragment key={toolbox.path}>
              <Route
                path={`/${toolbox.path}`}
                element={<ToolboxDetailsPage />}
              />
              {toolbox.tools.map((tool) => (
                <Route
                  key={tool.path}
                  path={`/${toolbox.path}/${tool.path}`}
                  element={tool.element}
                />
              ))}
            </Fragment>
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
