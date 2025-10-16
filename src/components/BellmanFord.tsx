import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import bellmanData from "../data/bellmanford.json";
import { speak } from "../utils/AudioUtils";
import "./BellmanFord.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  weight: number;
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    distances: Record<string, number>;
    predecessor: Record<string, string | null>;
    relaxed_edge: [string, string] | null;
  };
  next_suggestion: string | null;
}

const BellmanFordVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = bellmanData.meta.steps;
  const nodes: Node[] = bellmanData.input.nodes.map((id: string) => ({ id }));
  const edges: Edge[] = bellmanData.input.edges.map(([s, t, w]: [string, string, number]) => ({
    source: s,
    target: t,
    weight: w,
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
        steps[stepIndex].state.predecessor[d.id] || d.id === bellmanData.input.start_node
          ? "var(--visited-color)"
          : "var(--node-color)"
      )
      .attr("stroke", (d) =>
        steps[stepIndex].state.relaxed_edge?.includes(d.id)
          ? "var(--ai-color)"
          : "var(--stroke-color)"
      )
      .attr("stroke-width", 3)
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

    // Tooltip for distances
    node.append("title").text((d) => {
      const state = steps[stepIndex].state;
      return `${d.id}\nDistance: ${
        state.distances[d.id] === Infinity ? "∞" : state.distances[d.id]
      }\nPredecessor: ${state.predecessor[d.id] ?? "None"}`;
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);

      node.attr("cx", (d: any) => d.x!).attr("cy", (d: any) => d.y!);

      label.attr("x", (d: any) => d.x!).attr("y", (d: any) => d.y!);
    });

    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  const complexityData = [
    { name: "Time Complexity", value: bellmanData.input.nodes.length * bellmanData.input.edges.length },
    { name: "Space Complexity", value: bellmanData.input.nodes.length },
  ];

  return (
    <div className={`graph-outer ${theme}`}>
      <div className="graph-header">
        <h2 className="title">Bellman-Ford Visualizer</h2>
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
        <div className="left-panel">
          <div className="graph-controls">
            <button onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}>
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

          <svg ref={svgRef} width={600} height={400}></svg>

          <div className="state-panel card">
            <h3>Distances (Step {stepIndex + 1})</h3>
            <ul>
              {Object.entries(step.state.distances).map(([node, dist]) => (
                <li key={node}>
                  {node}: {dist === Infinity ? "∞" : dist} | Predecessor: {step.state.predecessor[node] ?? "None"}
                </li>
              ))}
            </ul>
          </div>

          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            {step.next_suggestion && (
              <p className="ai-suggestion small-card">
                💡 Next: <strong>{step.next_suggestion}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`BellmanFord(graph, start):
  distance[start] = 0
  for each node v != start: distance[v] = ∞
  for i in 1..V-1:
    for edge u → v with weight w:
      if distance[u] + w < distance[v]:
        distance[v] = distance[u] + w
        predecessor[v] = u
  check for negative cycles`}</pre>
          </div>

          <div className="card complexity-card">
            <h3>Complexity Graph</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complexityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary-color)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BellmanFordVisualizer;
