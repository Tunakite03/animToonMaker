import { Routes, Route } from "react-router-dom";

import { EditorLayout } from "@/components/editor-layout";
import SettingsLayout from "@/app/settings/layout";
import SettingsPage from "@/app/settings/page";
import AIProviderPage from "@/app/settings/ai-provider/page";
import CanvasPage from "@/app/settings/canvas/page";
import EditorSettingsPage from "@/app/settings/editor/page";
import ExportPage from "@/app/settings/export/page";
import GenerationPage from "@/app/settings/generation/page";
import { Providers } from "./provider/provider";


export function App() {
  return (
   <Providers>
        <div
          className="font-sans antialiased"
          style={{
            fontFamily: "'Source Sans 3', var(--font-sans), system-ui, sans-serif",
          }}
        >
          <Routes>
            <Route path="/" element={<EditorLayout />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<SettingsPage />} />
              <Route path="ai-provider" element={<AIProviderPage />} />
              <Route path="canvas" element={<CanvasPage />} />
              <Route path="editor" element={<EditorSettingsPage />} />
              <Route path="export" element={<ExportPage />} />
              <Route path="generation" element={<GenerationPage />} />
            </Route>
          </Routes>
        </div>
   </Providers>
  );
}
