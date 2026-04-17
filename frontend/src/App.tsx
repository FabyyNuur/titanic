import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import EnsemblePage from "./pages/EnsemblePage";
import ExplorationPage from "./pages/ExplorationPage";
import ModelingPage from "./pages/ModelingPage";
import MlopsPage from "./pages/MlopsPage";
import OptimizationPage from "./pages/OptimizationPage";
import OverfittingPage from "./pages/OverfittingPage";
import OverviewPage from "./pages/OverviewPage";
import PredictPage from "./pages/PredictPage";
import PreparationPage from "./pages/PreparationPage";
import VisualizationPage from "./pages/VisualizationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="exploration" element={<ExplorationPage />} />
          <Route path="visualization" element={<VisualizationPage />} />
          <Route path="preparation" element={<PreparationPage />} />
          <Route path="modeling" element={<ModelingPage />} />
          <Route path="overfitting" element={<OverfittingPage />} />
          <Route path="optimization" element={<OptimizationPage />} />
          <Route path="ensemble" element={<EnsemblePage />} />
          <Route path="mlops" element={<MlopsPage />} />
          <Route path="predict" element={<PredictPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
