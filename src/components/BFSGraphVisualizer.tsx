import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import bfsData from "../data/bfs.json";
import { speak } from "../utils/AudioUtils";
import "./BFSGraphVisualizer.css";

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
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    queue: string[];
    visited: string[];
    predecessor: Record<string, string | null>;
    level?: Record<string, number>;
    order?: string[];
  };
  next_suggestion: string | null;
}

const GraphVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = bfsData.meta.steps;
  const nodes: Node[] = bfsData.input.nodes.map((id: string) => ({ id }));
  const edges: Edge[] = bfsData.input.edges.map(([s, t]: [string, string]) => ({
    source: s,
    target: t,
  }));

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Visualization
  useEffect(() => {
    const width = 600;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "graph-container-group");

    // Zoom support
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 1])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom as any);

    // Position nodes in circle
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      node.x = width / 2 + 120 * Math.cos(angle);
      node.y = height / 2 + 120 * Math.sin(angle);
    });

    const simulation = d3
      .forceSimulation(nodes as any)
      .alpha(1)
      .alphaDecay(0.9)
      .velocityDecay(0.2)
      .force("link", d3.forceLink(edges as any).id((d: any) => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999");

    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) =>
        steps[stepIndex].state.visited.includes(d.id)
          ? "var(--visited-color)"
          : "var(--node-color)"
      )
      .attr("stroke", (d) =>
        d.id === steps[stepIndex].next_suggestion
          ? "var(--ai-color)"
          : "var(--stroke-color)"
      )
      .attr("stroke-width", (d) =>
        d.id === steps[stepIndex].next_suggestion ? 6 : 3
      )
      .on("click", (event, d) => {
        if (event.defaultPrevented) return;
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.currentTarget)
          .transition()
          .duration(500)
          .attr("transform", `translate(0, -20)`)
          .transition()
          .duration(500)
          .attr("transform", `translate(0, 0)`)
          .on("end", () => {
            d.fx = null;
            d.fy = null;
          });
      })
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

    // Labels
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

    // Tooltips with BFS details
    node.append("title").text((d) => {
      const state = steps[stepIndex].state;
      const level = state.level?.[d.id];
      const pred = state.predecessor?.[d.id];
      const visited = state.visited.includes(d.id);
      return `${d.id}\nVisited: ${visited ? "Yes✅" : "No❌"}\nPredecessor: ${
        pred ?? "None"
      }\nLevel: ${level ?? "?"}`;
    });

    // Tick update
    simulation.on("tick", () => {
  d3.select(svgRef.current)
    .selectAll<SVGLineElement, any>(".links line")
    .attr("x1", (d) => (d.source as Node).x!)
    .attr("y1", (d) => (d.source as Node).y!)
    .attr("x2", (d) => (d.target as Node).x!)
    .attr("y2", (d) => (d.target as Node).y!);

  d3.select(svgRef.current)
    .selectAll<SVGCircleElement, any>(".nodes circle")
    .attr("cx", (d) => d.x!)
    .attr("cy", (d) => d.y!);

  d3.select(svgRef.current)
    .selectAll<SVGTextElement, any>(".labels text")
    .attr("x", (d) => d.x!)
    .attr("y", (d) => d.y!);
});

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`graph-outer ${theme}`}>
      {/* Header */}
      <div className="graph-header">
        <h2 className="title">BFS Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="graph-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="graph-controls">
            <button
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
            >
              ⏮️ Prev
            </button>
            <button
              onClick={() =>
                setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
              }
            >
              ⏭️ Next
            </button>
            <button
              onClick={() => setExplanationLevel((prev) => (prev === 0 ? 1 : 0))}
            >
              📘 {explanationLevel === 0 ? "Beginner" : "Advanced"}
            </button>
          </div>

          {/* Graph */}
          <svg ref={svgRef} width={600} height={400}></svg>

   

          {/* State Display */}
          <div className="state-panel card">
            <h3>BFS State (Step {stepIndex + 1})</h3>
            <p><strong>Queue:</strong> {step.state.queue.join(", ") || "Empty"}</p>
            <p><strong>Visited:</strong> {step.state.visited.join(", ") || "None"}</p>
            {step.state.predecessor && (
              <>
                <p><strong>Predecessor:</strong></p>
<ul className="predecessor-list">
  {Object.entries(step.state.predecessor).map(([k, v]) => (
    <li key={k}>
      <span className="key">{k} ←</span>
      <span className="value">{v || "null"}</span>
    </li>
  ))}
</ul>

              </>
            )}
            {step.state.level && (
              <>
                <p><strong>Level:</strong></p>
                <ul>
                  {Object.entries(step.state.level).map(([k, v]) => (
                    <li key={k}>
                      {k}: Level {v}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {step.state.order && (
              <p><strong>Order:</strong> {step.state.order.join(" → ")}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Queue: [{step.state.queue.join(", ") || "empty"}] | Visited: [
              {step.state.visited.join(", ") || "none"}]
            </p>
            {step.next_suggestion && (
              <p className="ai-suggestion small-card">
                💡 Next node to process: <strong>{step.next_suggestion}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`BFS(graph, start):
  queue = [start]
  visited = {start}
  level[start] = 0
  while queue not empty:
    node = queue.dequeue()
    for neighbor in node.neighbors:
      if neighbor not in visited:
        visited.add(neighbor)
        predecessor[neighbor] = node
        level[neighbor] = level[node] + 1
        queue.enqueue(neighbor)`}</pre>
          </div>

          <div className="card complexity-card">
            <h3>Time Complexity</h3>
            <svg width={400} height={250}>
              <line x1={40} y1={20} x2={40} y2={220} stroke="gray" strokeWidth={1} />
              <line x1={40} y1={220} x2={380} y2={220} stroke="gray" strokeWidth={1} />
              <text x={10} y={130} transform="rotate(-90,10,130)" fill="var(--text-color)" fontSize={12}>
                Time
              </text>
              <text x={210} y={240} textAnchor="middle" fill="var(--text-color)" fontSize={12}>
                Input Size (V + E)
              </text>
              <line x1={40} y1={220} x2={380} y2={60} stroke="steelblue" strokeWidth={2} />
              <text x={300} y={80} fill="steelblue" fontSize={12}>O(V + E)</text>
            </svg>
          </div>

          <div className="card complexity-card">
            <h3>Space Complexity</h3>
            <svg width={400} height={250}>
              <line x1={40} y1={20} x2={40} y2={220} stroke="gray" strokeWidth={1} />
              <line x1={40} y1={220} x2={380} y2={220} stroke="gray" strokeWidth={1} />
              <text x={10} y={130} transform="rotate(-90,10,130)" fill="var(--text-color)" fontSize={12}>
                Space
              </text>
              <text x={210} y={240} textAnchor="middle" fill="var(--text-color)" fontSize={12}>
                Input Size (V)
              </text>
              <line x1={40} y1={180} x2={380} y2={60} stroke="orange" strokeWidth={2} />
              <text x={300} y={80} fill="orange" fontSize={12}>O(V)</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="bottom-panel">
        <h3>Audio Transcript</h3>
        <ol>
          {steps.slice(0, stepIndex + 1).map((st, idx) => (
            <li key={idx}>
  <strong>Step {idx + 1}:</strong> {st.actions[explanationLevel].replace("🔹", "").trim()} <br />
  <em>Queue:</em> [{st.state.queue.join(", ") || "empty"}] |
  <em> Visited:</em> [{st.state.visited.join(", ") || "none"}]
</li>

          ))}
        </ol>
      </div>
    </div>
  );
};

export default GraphVisualizer;
