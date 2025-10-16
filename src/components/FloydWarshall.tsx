import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import floydData from "../data/FloydWarshall.json"; // put your Floyd-Warshall JSON here
import { speak } from "../utils/AudioUtils";
import "./FloydWarshall.css";

interface Node {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string;
  target: string;
  weight?: number;
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    // distances can be nested {A: {A:0, B:6}} or flat {"A-B":6}
    distances: Record<string, any>;
    k?: string | null; // current intermediate node if provided
    // optionally the step may include the explicitly updated cell like ["A","B"]
    updated_cell?: [string, string] | null;
  };
  next_suggestion: string | null;
}

const FloydWarshallVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = floydData.meta.steps;
  const nodes: Node[] = floydData.input.nodes.map((id: string) => ({ id }));
  const edges: Edge[] =
    floydData.input.edges?.map(([s, t, w]: [string, string, number]) => ({
      source: s,
      target: t,
      weight: w,
    })) ?? [];

  // Theme handling (same pattern as BFS)
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 graph visualization (nodes + edges)
  useEffect(() => {
    const width = 600;
    const height = 400;
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "graph-container-group");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 1.5])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom as any);

    // Position nodes on circle (stable)
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      node.x = width / 2 + 140 * Math.cos(angle);
      node.y = height / 2 + 140 * Math.sin(angle);
    });

    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(edges as any).id((d: any) => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(40))
      .stop();

    // links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999");

    // nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 20)
      .attr("fill", "var(--node-color)")
      .attr("stroke", "var(--stroke-color)")
      .attr("stroke-width", 2)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // labels
    const label = container
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold");

    // edge weight labels (optional)
    if (edges.length > 0) {
      const edgeLabels = container
        .append("g")
        .attr("class", "edge-labels")
        .selectAll("text")
        .data(edges)
        .enter()
        .append("text")
        .text((d: any) => (d.weight !== undefined ? d.weight : ""))
        .attr("font-size", 12)
        .attr("fill", "var(--text-color)");
      simulation.on("tick", () => {
        edgeLabels
          .attr("x", (d: any) => ((d.source as any).x + (d.target as any).x) / 2)
          .attr("y", (d: any) => ((d.source as any).y + (d.target as any).y) / 2);
      });
    }

    // simulate just one tick to place nodes initially (we don't need continuous animation)
    simulation.tick(300);

    // set positions
    link
      .attr("x1", (d: any) => (d.source as any).x)
      .attr("y1", (d: any) => (d.source as any).y)
      .attr("x2", (d: any) => (d.target as any).x)
      .attr("y2", (d: any) => (d.target as any).y);

    node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);

    // highlight logic based on matrix updates — nothing more to do for graph nodes here
    // (we will highlight matrix cells in the matrix display below)

    // cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, edges]);

  // helper: convert distances object into matrix and detect one updated cell compared to prev step
  function parseDistances(distObj: any) {
    // Accept either nested {A:{B:val}} or flat {"A-B":val}
    const matrix: Record<string, Record<string, number>> = {};
    const ids = floydData.input.nodes;
    ids.forEach((i: string) => (matrix[i] = {}));

    // try nested
    let nested = true;
    for (const k of Object.keys(distObj)) {
      if (typeof distObj[k] !== "object") {
        nested = false;
        break;
      }
    }

    if (nested) {
      for (const i of Object.keys(distObj)) {
        for (const j of Object.keys(distObj[i])) {
          matrix[i][j] = distObj[i][j];
        }
      }
    } else {
      // flat style "A-B": val
      for (const key of Object.keys(distObj)) {
        const [a, b] = key.split("-"); 
        if (!matrix[a]) matrix[a] = {};
        matrix[a][b] = distObj[key];
      }
    }

    // ensure every pair exists, fill missing with large number (999999 or Infinity)
    const INF = 999999;
    for (const i of floydData.input.nodes) {
      for (const j of floydData.input.nodes) {
        if (matrix[i][j] === undefined) matrix[i][j] = i === j ? 0 : INF;
      }
    }

    return matrix;
  }

  // derive updated cell by diffing matrices
  function detectUpdatedCell(prev: any, curr: any): [string, string] | null {
    if (!prev) return null;
    const p = parseDistances(prev);
    const c = parseDistances(curr);
    for (const i of Object.keys(p)) {
      for (const j of Object.keys(p[i])) {
        if (p[i][j] !== c[i][j]) return [i, j];
      }
    }
    return null;
  }

  // render matrix table (right panel)
  function renderMatrix(stepIdx: number) {
    const step = steps[stepIdx];
    const currMatrix = parseDistances(step.state.distances);
    const prevMatrix = stepIdx > 0 ? parseDistances(steps[stepIdx - 1].state.distances) : null;
    const explicit = step.state.updated_cell ?? null;
    const inferred = detectUpdatedCell(
      stepIdx > 0 ? steps[stepIdx - 1].state.distances : null,
      step.state.distances
    );
    const changed = explicit ?? inferred;

    const ids = floydData.input.nodes;

    return (
      <div className="card" style={{ overflowX: "auto" }}>
        <h3>Distance Matrix {steps[stepIdx].state.k ? `(via ${steps[stepIdx].state.k})` : ""}</h3>
        <table style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}>
          <thead>
            <tr>
              <th style={{ padding: 6 }}>i \ j</th>
              {ids.map((j: string) => (
                <th key={j} style={{ padding: 6 }}>{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((i: string) => (
              <tr key={i}>
                <td style={{ padding: 6, fontWeight: 700 }}>{i}</td>
                {ids.map((j: string) => {
                  const val = currMatrix[i][j];
                  const show = val === 999999 ? "∞" : String(val);
                  const isChanged = changed ? changed[0] === i && changed[1] === j : false;
                  return (
                    <td
                      key={j}
                      style={{
                        padding: 8,
                        border: "1px solid rgba(0,0,0,0.06)",
                        background: isChanged ? "var(--ai-color)" : "transparent",
                        color: isChanged ? "white" : "var(--text-color)",
                        transition: "background 0.25s, color 0.25s",
                        minWidth: 48,
                      }}
                    >
                      {show}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {changed && (
          <p style={{ marginTop: 8 }}>
            <strong>Updated:</strong> {changed[0]} → {changed[1]}
          </p>
        )}
      </div>
    );
  }

  // Speak current step text when stepIndex or explanationLevel changes
  useEffect(() => {
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel]);

  const step = steps[stepIndex];

  return (
    <div className={`graph-outer ${theme}`}>
      <div className="graph-header">
        <h2 className="title">Floyd–Warshall Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="graph-and-controls">
        <div className="left-panel">
          <div className="graph-controls">
            <button onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}>⏮️ Prev</button>
            <button onClick={() => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))}>⏭️ Next</button>
            <button onClick={() => setExplanationLevel((prev) => (prev === 0 ? 1 : 0))}>
              📘 {explanationLevel === 0 ? "Beginner" : "Advanced"}
            </button>
          </div>

          <svg ref={svgRef} width={600} height={400}></svg>

          <div className="state-panel card">
            <h3>Step {step.step_number}</h3>
            <p>{step.actions[explanationLevel]}</p>
            {step.next_suggestion && <p className="ai-suggestion">💡 Next: {step.next_suggestion}</p>}
          </div>
        </div>

        <div className="right-panel">
          {renderMatrix(stepIndex)}

          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`FloydWarshall(W):
  for i in 1..n:
    for j in 1..n:
      dist[i][j] = W[i][j]
  for k in 1..n:
    for i in 1..n:
      for j in 1..n:
        if dist[i][k] + dist[k][j] < dist[i][j]:
          dist[i][j] = dist[i][k] + dist[k][j]`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloydWarshallVisualizer;
