import { BackgroundPaths } from "./components/ui/background-paths";
import DspVisualizer from "./pages/DspVisualizer";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<BackgroundPaths title="Signal Visualizer" />} />
                <Route path="/dsp" element={<DspVisualizer />} />
            </Routes>
        </Router>
    );
}

export default App;