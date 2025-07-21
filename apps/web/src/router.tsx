import { BrowserRouter, Route, Routes } from "react-router-dom";
import DocumentationLayout from "./components/layout/doc-layout";
import HomePage from "./pages/Home";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentationLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
