import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import linkedListData from "../data/linkedListTraversal.json";
import { speak } from "../utils/audioUtils";
import "./LinkedListTraversal.css";

interface Node {
  id: string;
  value: number;
  next: string | null;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    current_node: string;
    visited_nodes: string[];
    target_found: boolean;
    current_value: number;
    target_value: number;
    comparison_result: string;
  };
  next_suggestion: string | null;
}

const LinkedListTraversal: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = linkedListData.meta.steps;
  const nodes: Node[] = linkedListData.input.nodes.map((node: any) => ({
    ...node,
    x: undefined,
    y: undefined,
    fx: null,
    fy: null
  }));

  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // 1️⃣ Initial linked list setup (runs only once)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear any existing content
    const width = 800;
    const height = 400;

    const container = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 1.5])
      .on("zoom", (event: any) => container.attr("transform", event.transform));
    svg.call(zoom as any);

    // Node positions (horizontal layout for linked list)
    nodes.forEach((node, i) => {
      const saved = positionsRef.current[node.id];
      if (saved) {
        node.x = saved.x;
        node.y = saved.y;
      } else {
        // Arrange nodes horizontally with spacing
        node.x = 100 + i * 150;
        node.y = height / 2;
        positionsRef.current[node.id] = { x: node.x, y: node.y };
      }
      // Ensure fx and fy are null for free movement
      node.fx = null;
      node.fy = null;
    });

    // Create links between nodes
    const links: Array<{source: Node, target: Node}> = [];
    nodes.forEach((node, i) => {
      if (node.next && i < nodes.length - 1) {
        const nextNode = nodes.find(n => n.id === node.next);
        if (nextNode) {
          links.push({ source: node, target: nextNode });
        }
      }
    });

    // Simulation with continuous updates
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links as any)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50))
      .alpha(0.1)
      .alphaDecay(0.9)
      .velocityDecay(0.2);

    // Draw links (arrows)
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-width", 3)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead)");

    // Draw arrow markers
    const defs = container.append("defs");
    const arrowMarker = defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto");
    
    arrowMarker
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Draw nodes (rectangles for linked list nodes)
    const nodeGroup = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .call(
        d3
          .drag<SVGGElement, Node>()
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

    // Node rectangles
    nodeGroup
      .append("rect")
      .attr("class", "node-rect")
      .attr("width", 80)
      .attr("height", 60)
      .attr("rx", 10)
      .attr("fill", "var(--node-color)")
      .attr("stroke", "var(--stroke-color)")
      .attr("stroke-width", 3);

    // Node values
    nodeGroup
      .append("text")
      .attr("class", "node-value")
      .attr("x", 40)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .text((d: any) => d.value);

    // Node labels
    nodeGroup
      .append("text")
      .attr("class", "node-label")
      .attr("x", 40)
      .attr("y", 45)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--text-color)")
      .style("font-size", "12px")
      .text((d: any) => d.id);

    // Next pointers
    nodeGroup
      .append("text")
      .attr("class", "next-pointer")
      .attr("x", 70)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#666")
      .style("font-size", "10px")
      .text((d: any) => d.next ? `→${d.next}` : "NULL");

    // Simulation tick event for continuous updates
    simulation.on("tick", () => {
      // Update link positions
      link.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      // Update node positions
      nodeGroup.attr("transform", (d: any) => `translate(${d.x - 40},${d.y - 30})`);
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
    const currentNodeId = step.state.current_node;
    const visitedNodes = step.state.visited_nodes;
    const targetFound = step.state.target_found;

    // Highlight current node
    d3.select(svgRef.current)
      .selectAll<SVGGElement, any>(".node-group")
      .attr("class", (d: any) => {
        let className = "node-group";
        if (d.id === currentNodeId) {
          className += " current-node";
        }
        if (visitedNodes.includes(d.id)) {
          className += " visited-node";
        }
        if (targetFound && d.id === currentNodeId) {
          className += " target-found";
        }
        return className;
      });

    // Update link colors
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, any>(".link")
      .attr("stroke", (d: any) => {
        if (visitedNodes.includes(d.source.id) && visitedNodes.includes(d.target.id)) {
          return "var(--visited-color)";
        }
        return "#999";
      })
      .attr("stroke-width", (d: any) => {
        if (visitedNodes.includes(d.source.id) && visitedNodes.includes(d.target.id)) {
          return 4;
        }
        return 3;
      });

    speak(step.actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`linked-list-outer ${theme}`}>
      <div className="linked-list-header">
        <h2 className="title">Linked List Traversal Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="linked-list-and-controls">
        <div className="left-panel">
          <div className="linked-list-controls">
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

          <svg ref={svgRef} width={800} height={400} key="linked-list-graph"></svg>

          <div className="state-panel card">
            <h3>Step {step.step_number}</h3>
            <p>
              <strong>Current Node:</strong> {step.state.current_node} (Value: {step.state.current_value})
            </p>
            <p>
              <strong>Target Value:</strong> {step.state.target_value}
            </p>
            <p>
              <strong>Visited Nodes:</strong> {step.state.visited_nodes.join(" → ")}
            </p>
            <p>
              <strong>Comparison:</strong> {step.state.comparison_result}
            </p>
            {step.state.target_found && (
              <p className="target-found-message">
                🎯 Target found at node {step.state.current_node}!
              </p>
            )}
            {step.next_suggestion && (
              <p className="next-suggestion">
                💡 Next: Move to node {step.next_suggestion}
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
            <pre>{`LinkedListTraversal(head, target):
  current = head
  while current != null:
    if current.value == target:
      return current
    current = current.next
  return null`}</pre>
          </div>

          <div className="card complexity-card">
            <h3>Time Complexity</h3>
            <p>O(n) - Linear time</p>
            <p>Worst case: Visit all n nodes</p>
          </div>

          <div className="card complexity-card">
            <h3>Space Complexity</h3>
            <p>O(1) - Constant space</p>
            <p>Only uses one pointer variable</p>
          </div>

          <div className="card linked-list-info">
            <h3>Linked List Structure</h3>
            <div className="structure-info">
              <p><strong>Head:</strong> {linkedListData.input.start_node}</p>
              <p><strong>Target:</strong> {linkedListData.input.target_value}</p>
              <p><strong>Nodes:</strong> {nodes.length}</p>
              <div className="node-list">
                {nodes.map((node, index) => (
                  <div key={node.id} className="node-info">
                    <span className="node-id">{node.id}</span>
                    <span className="node-value">Value: {node.value}</span>
                    <span className="node-next">Next: {node.next || "NULL"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <h3>Traversal Transcript</h3>
        <ol>
          {steps.slice(0, stepIndex + 1).map((st, idx) => (
            <li key={idx}>
              <strong>Step {idx + 1}:</strong> {st.actions[explanationLevel]}{" "}
              <br />
              <em>Current Node:</em> {st.state.current_node} (Value: {st.state.current_value}) <br />
              <em>Visited:</em> {st.state.visited_nodes.join(" → ")} <br />
              <em>Result:</em> {st.state.comparison_result}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default LinkedListTraversal;
