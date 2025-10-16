import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BFSGraphVisualizer from "./components/BFSGraphVisualizer";
import DFSGraphVisualizer from "./components/DFSGraphVisualizer";
import BellmanFordVisualizer from "./components/BellmanFord";
import FloydWarshall from "./components/FloydWarshall";
import Prims from "./components/Prims";
import LinearSearchVisualizer from "./components/LinearSearchVisualizer";
import BinarySearchVisualizer from "./components/BinarySearchVisualizer";
import BubbleSortVisualizer from "./components/BubbleSortVisualizer";
import SelectionSortVisualizer from "./components/SelectionSortVisualizer";
import InsertionSortVisualizer from "./components/InsertionSortVisualizer";
import QuickSortVisualizer from "./components/QuickSortVisualizer";
import MergeSortVisualizer from "./components/MergeSortVisualizer";
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
          <Route path="/linear-search" element={<LinearSearchVisualizer />} />
          <Route path="/binary-search" element={<BinarySearchVisualizer />} />
          <Route path="/bubble-sort" element={<BubbleSortVisualizer />} />
          <Route path="/selection-sort" element={<SelectionSortVisualizer />} />
          <Route path="/insertion-sort" element={<InsertionSortVisualizer />} />
          <Route path="/quick-sort" element={<QuickSortVisualizer />} />
          <Route path="/merge-sort" element={<MergeSortVisualizer />} />
        </Routes>

    </Router>
  );
};

export default App;
