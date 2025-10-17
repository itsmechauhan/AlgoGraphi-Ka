import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import primsData from "../data/Prims.json";
import { speak } from "../utils/audioUtils";
import "./Prims.css";

interface Node {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  weight?: number;
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    mst_nodes: string[];
    mst_edges: string[][];
    candidate_edges: (string | number)[][];
  };
  next_suggestion: string | null;
}

const Prims: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = primsData.meta.steps;
  const nodes: Node[] = primsData.input.nodes.map((id: string) => ({ 
    id,
    x: undefined,
    y: undefined,
    fx: null,
    fy: null
  }));
  const edges: Edge[] = primsData.input.edges.map(
    (edge: (string | number)[]) => ({
      source: edge[0] as string,
      target: edge[1] as string,
      weight: edge[2] as number,
    })
  );

  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // 1️⃣ Initial graph setup (runs only once)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear any existing content
    const width = 600;
    const height = 400;

    const container = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 1.5])
      .on("zoom", (event: any) => container.attr("transform", event.transform));
    svg.call(zoom as any);

    // Node positions (persistent) - ensure unique positions
    nodes.forEach((node, i) => {
      const saved = positionsRef.current[node.id];
      if (saved) {
        node.x = saved.x;
        node.y = saved.y;
      } else {
        const angle = (2 * Math.PI * i) / nodes.length;
        node.x = width / 2 + 140 * Math.cos(angle);
        node.y = height / 2 + 140 * Math.sin(angle);
        positionsRef.current[node.id] = { x: node.x, y: node.y };
      }
      // Ensure fx and fy are null for free movement
      node.fx = null;
      node.fy = null;
    });

    // Link edges to node objects
    const edgesWithNodes: Edge[] = edges.map((e) => ({
      ...e,
      source: nodes.find((n) => n.id === e.source)!,
      target: nodes.find((n) => n.id === e.target)!,
    }));

    // Simulation with continuous updates
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(edgesWithNodes as any)
          .id((d: any) => d.id)
          .distance(160)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(40))
      .alpha(0.1)
      .alphaDecay(0.9)
      .velocityDecay(0.2);

    // Draw links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edgesWithNodes)
      .enter()
      .append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999");

    // Draw nodes
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
      .attr("stroke-width", 3)
      .attr("class", "floating")
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Labels
    const label = container
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d: any) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold");

    // Edge weights
    const edgeLabel = container
      .append("g")
      .attr("class", "edge-labels")
      .selectAll("text")
      .data(edgesWithNodes)
      .enter()
      .append("text")
      .text((d: any) => d.weight)
      .attr("font-size", 12)
      .attr("fill", "var(--text-color)")
      .attr("text-anchor", "middle");

    // Simulation tick event for continuous updates
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);

      node.attr("cx", (d: any) => d.x!).attr("cy", (d: any) => d.y!);

      label.attr("x", (d: any) => d.x!).attr("y", (d: any) => d.y!);

      edgeLabel
        .attr("x", (d: any) => ((d.source as any).x + (d.target as any).x) / 2)
        .attr("y", (d: any) => ((d.source as any).y + (d.target as any).y) / 2);
    });

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, []); // <-- run only once

  // 2️⃣ Update highlights and audio (on step change)
  useEffect(() => {
    if (!svgRef.current) return;

    const step = steps[stepIndex];
    const mstEdgeSet = new Set(step.state.mst_edges.map((e) => e.join("-")));

    // Highlight edges
    d3.select(svgRef.current)
      .selectAll<SVGLineElement, any>(".links line")
      .attr("stroke", (d: any) => {
        const key1 = `${d.source.id}-${d.target.id}`;
        const key2 = `${d.target.id}-${d.source.id}`;
        return mstEdgeSet.has(key1) || mstEdgeSet.has(key2)
          ? "var(--visited-color)"
          : "#999";
      });

    // Highlight nodes
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, any>(".nodes circle")
      .attr("fill", (d: any) =>
        step.state.mst_nodes.includes(d.id)
          ? "var(--visited-color)"
          : "var(--node-color)"
      )
      .attr("stroke", (d: any) =>
        d.id === step.next_suggestion
          ? "var(--ai-color)"
          : "var(--stroke-color)"
      )
      .attr("class", (d: any) => {
        const baseClass = "floating";
        return step.state.mst_nodes.includes(d.id) ? `${baseClass} mst-node` : baseClass;
      });

    speak(step.actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`graph-outer ${theme}`}>
      <div className="graph-header">
        <h2 className="title">Prim's Algorithm Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="graph-and-controls">
        <div className="left-panel">
          <div className="graph-controls">
            <button onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}>
              ⏮️ Prev
            </button>
            <button
              onClick={() =>
                setStepIndex(Math.min(stepIndex + 1, steps.length - 1))
              }
            >
              ⏭️ Next
            </button>
            <button
              onClick={() =>
                setExplanationLevel(explanationLevel === 0 ? 1 : 0)
              }
            >
              📘 {explanationLevel === 0 ? "Beginner" : "Advanced"}
            </button>
          </div>

          <svg ref={svgRef} width={600} height={400} key="prims-graph"></svg>

          <div className="state-panel card">
            <h3>Step {step.step_number}</h3>
            <p>
              <strong>MST Nodes:</strong>{" "}
              {step.state.mst_nodes.join(", ") || "Empty"}
            </p>
            <p>
              <strong>MST Edges:</strong>{" "}
              {step.state.mst_edges.map((e) => e.join("–")).join(", ") || "None"}
            </p>
            {step.state.candidate_edges.length > 0 && (
              <p>
                <strong>Candidate Edges:</strong>{" "}
                {step.state.candidate_edges
                  .map((e) => `${e[0]}–${e[1]} (${e[2]})`)
                  .join(", ")}
              </p>
            )}
            {step.next_suggestion && (
              <p className="ai-suggestion">
                💡 Next Node: {step.next_suggestion}
              </p>
            )}
          </div>

          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
          </div>
        </div>

        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`Prim's Algorithm(graph, start):
  mst = {start}
  edges = []
  while mst.size < graph.nodes.size:
    pick minimum weight edge (u, v) with u in mst and v not in mst
    add v to mst
    add (u, v) to edges`}</pre>
          </div>

          <div className="card complexity-card">
            <h3>Time Complexity</h3>
            <p>O(E log V)</p>
          </div>

          <div className="card complexity-card">
            <h3>Space Complexity</h3>
            <p>O(V + E)</p>
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <h3>Audio Transcript</h3>
        <ol>
          {steps.slice(0, stepIndex + 1).map((st, idx) => (
            <li key={idx}>
              <strong>Step {idx + 1}:</strong> {st.actions[explanationLevel]}{" "}
              <br />
              <em>MST Nodes:</em> {st.state.mst_nodes.join(", ")} <br />
              <em>MST Edges:</em>{" "}
              {st.state.mst_edges.map((e) => e.join("–")).join(", ")}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default Prims;
