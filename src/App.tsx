import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BFSGraphVisualizer from "./components/BFSGraphVisualizer";
import DFSGraphVisualizer from "./components/DFSGraphVisualizer";
import BellmanFordVisualizer from "./components/BellmanFord";
import FloydWarshall from "./components/FloydWarshall";
import Prims from "./components/Prims";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>

      

        <Routes>
          <Route path="/" element={<BFSGraphVisualizer />} />
          <Route path="/bfs" element={<BFSGraphVisualizer />} />
          <Route path="/dfs" element={<DFSGraphVisualizer />} />
          <Route path="/bellman-ford" element={<BellmanFordVisualizer />} />
          <Route path="/floyd-warshall" element={<FloydWarshall />} />
          <Route path="/prims" element={<Prims />} />
        </Routes>

    </Router>
  );
};

export default App;
