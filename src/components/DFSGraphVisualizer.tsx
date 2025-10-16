import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import dfsData from "../data/dfs.json";
import { speak } from "../utils/AudioUtils";
import "./DFSGraphVisualizer.css";

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
    stack: string[];
    visited: string[];
    predecessor: Record<string, string | null>;
    order?: string[];
  };
  next_suggestion: string | null;
}

const DFSGraphVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const timeChartRef = useRef<SVGSVGElement>(null);
  const spaceChartRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = dfsData.meta.steps;
  const nodes: Node[] = dfsData.input.nodes.map((id: string) => ({ id }));
  const edges: Edge[] = dfsData.input.edges.map(([s, t]: [string, string]) => ({
    source: s,
    target: t,
  }));

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Graph Visualization
  useEffect(() => {
    const width = 600;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "graph-container-group");

    // Zoom support
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 1])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom as any);

    // Position nodes in circle
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      node.x = width / 2 + 120 * Math.cos(angle);
      node.y = height / 2 + 120 * Math.sin(angle);
    });

    const simulation = d3.forceSimulation(nodes as any)
      .alpha(1)
      .alphaDecay(0.9)
      .velocityDecay(0.2)
      .force("link", d3.forceLink(edges as any).id((d: any) => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    const link = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999");

    const node = container.append("g")
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
        d3.drag<SVGCircleElement, Node>()
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
    const label = container.append("g")
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

    // Tooltips with DFS details
    node.append("title").text((d) => {
      const state = steps[stepIndex].state;
      const pred = state.predecessor?.[d.id];
      const visited = state.visited.includes(d.id);
      return `${d.id}\nVisited: ${visited ? "Yes✅" : "No❌"}\nPredecessor: ${pred ?? "None"}`;
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

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  // D3 Time Complexity Chart
  useEffect(() => {
    const svg = d3.select(timeChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const data = [
      { inputSize: 0, time: 0 },
      { inputSize: nodes.length, time: nodes.length + edges.length },
    ];

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.inputSize)!])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.time)!])
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(3));

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(3));

    const line = d3.line<any>()
      .x(d => x(d.inputSize))
      .y(d => y(d.time));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

  }, [nodes, edges]);

  // D3 Space Complexity Chart
  useEffect(() => {
    const svg = d3.select(spaceChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const data = [
      { inputSize: 0, space: 0 },
      { inputSize: nodes.length, space: nodes.length },
    ];

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.inputSize)!])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.space)!])
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(3));

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(3));

    const line = d3.line<any>()
      .x(d => x(d.inputSize))
      .y(d => y(d.space));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2)
      .attr("d", line);

  }, [nodes]);

  const step = steps[stepIndex];

  return (
    <div className={`graph-outer ${theme}`}>
      <div className="graph-header">
        <h2 className="title">DFS Visualizer</h2>
        <button className="theme-toggle" onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="graph-and-controls">
        <div className="left-panel">
          <div className="graph-controls">
            <button onClick={() => setStepIndex(prev => Math.max(prev - 1, 0))}>⏮️ Prev</button>
            <button onClick={() => setStepIndex(prev => Math.min(prev + 1, steps.length - 1))}>⏭️ Next</button>
            <button onClick={() => setExplanationLevel(prev => prev === 0 ? 1 : 0)}>📘 {explanationLevel === 0 ? "Beginner" : "Advanced"}</button>
          </div>

          <svg ref={svgRef} width={600} height={400}></svg>

          <div className="state-panel card">
            <h3>DFS State (Step {stepIndex + 1})</h3>
            <p><strong>Stack:</strong> {step.state.stack.join(", ") || "Empty"}</p>
            <p><strong>Visited:</strong> {step.state.visited.join(", ") || "None"}</p>
            {step.state.predecessor && (
              <>
                <p><strong>Audio Transcripts:</strong></p>
                <ul>
                  {Object.entries(step.state.predecessor).map(([k, v]) => (
                    <li key={k}>{k} ← {v || "null"}</li>
                  ))}
                </ul>
              </>
            )}
            {step.state.order && <p><strong>Order:</strong> {step.state.order.join(" → ")}</p>}
          </div>

          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Stack: [{step.state.stack.join(", ") || "empty"}] | Visited: [{step.state.visited.join(", ") || "none"}]
            </p>
            {step.next_suggestion && (
              <p className="ai-suggestion small-card">
                💡 Next node to process: <strong>{step.next_suggestion}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`DFS(graph, start):
  stack = [start]
  visited = {start}
  while stack not empty:
    node = stack.pop()
    for neighbor in node.neighbors:
      if neighbor not in visited:
        visited.add(neighbor)
        predecessor[neighbor] = node
        stack.push(neighbor)`}</pre>
          </div>

          <div className="card complexity-card">
            <h3>Time Complexity</h3>
            <svg ref={timeChartRef} width={300} height={200}></svg>
          </div>

          <div className="card complexity-card">
            <h3>Space Complexity</h3>
            <svg ref={spaceChartRef} width={300} height={200}></svg>
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <h3>Steps</h3>
        <ol>
          {steps.slice(0, stepIndex + 1).map((st, idx) => (
            <li key={idx}>
              <strong>Step {idx + 1}:</strong> {st.actions[explanationLevel].replace("🔹", "").trim()} <br />
              <em>Stack:</em> [{st.state.stack.join(", ") || "empty"}] |
              <em>Visited:</em> [{st.state.visited.join(", ") || "none"}]
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default DFSGraphVisualizer;
