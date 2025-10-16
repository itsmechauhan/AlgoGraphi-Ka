import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import linearSearchData from "../data/linearSearch.json";
import { speak } from "../utils/AudioUtils";
import "./LinearSearchVisualizer.css";

interface ArrayElement {
  value: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Step {
  step_number: number;
  actions: string[];
  state: {
    current_index: number;
    found: boolean;
  };
  next_suggestion: number | null;
}

const LinearSearchVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = linearSearchData.meta.steps;
  const array: number[] = linearSearchData.input.array;
  const target: number = linearSearchData.input.target;

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Visualization
  useEffect(() => {
    const width = 600;
    const height = 200;
    const barWidth = 80;
    const barSpacing = 20;
    const startX = 50;
    const startY = height - 50;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "array-container-group");

    // Create array elements
    const elements: ArrayElement[] = array.map((value, index) => ({
      value,
      index,
      x: startX + index * (barWidth + barSpacing),
      y: startY - value * 2, // Scale values for visualization
      width: barWidth,
      height: value * 2
    }));

    // Draw array elements
    const bars = container
      .append("g")
      .attr("class", "array-bars")
      .selectAll("rect")
      .data(elements)
      .enter()
      .append("rect")
      .attr("x", (d: ArrayElement) => d.x)
      .attr("y", (d: ArrayElement) => d.y)
      .attr("width", (d: ArrayElement) => d.width)
      .attr("height", (d: ArrayElement) => d.height)
      .attr("fill", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.current_index) {
          return currentStep.state.found ? "var(--found-color)" : "var(--current-color)";
        }
        if (d.index < currentStep.state.current_index) {
          return "var(--checked-color)";
        }
        return "var(--unchecked-color)";
      })
      .attr("stroke", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.current_index) {
          return "var(--ai-color)";
        }
        return "var(--stroke-color)";
      })
      .attr("stroke-width", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        return d.index === currentStep.state.current_index ? 4 : 2;
      })
      .attr("rx", 5)
      .attr("ry", 5)
      .on("click", (event: any) => {
        if (event.defaultPrevented) return;
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("transform", "scale(1.1)")
          .transition()
          .duration(200)
          .attr("transform", "scale(1)");
      });

    // Add value labels on bars
    container
      .append("g")
      .attr("class", "value-labels")
      .selectAll("text")
      .data(elements)
      .enter()
      .append("text")
      .text((d: ArrayElement) => d.value)
      .attr("x", (d: ArrayElement) => d.x + d.width / 2)
      .attr("y", (d: ArrayElement) => d.y - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold")
      .style("font-size", "14px");

    // Add index labels below bars
    container
      .append("g")
      .attr("class", "index-labels")
      .selectAll("text")
      .data(elements)
      .enter()
      .append("text")
      .text((d: ArrayElement) => d.index)
      .attr("x", (d: ArrayElement) => d.x + d.width / 2)
      .attr("y", startY + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold")
      .style("font-size", "12px");

    // Add target indicator
    container
      .append("g")
      .attr("class", "target-indicator")
      .append("text")
      .text(`Target: ${target}`)
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--target-color)")
      .style("font-weight", "bold")
      .style("font-size", "16px");

    // Add comparison arrows
    const currentStep = steps[stepIndex];
    if (currentStep.state.current_index < array.length) {
      const currentElement = elements[currentStep.state.current_index];
      container
        .append("g")
        .attr("class", "comparison-arrow")
        .append("path")
        .attr("d", `M ${currentElement.x + currentElement.width / 2} ${currentElement.y - 20} 
                   L ${currentElement.x + currentElement.width / 2} ${currentElement.y - 40}`)
        .attr("stroke", "var(--ai-color)")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .attr("marker-end", "url(#arrowhead)");

      // Add arrowhead marker
      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "var(--ai-color)");
    }

    // Tooltips
    bars.append("title").text((d: ArrayElement) => {
      const currentStep = steps[stepIndex];
      const status = d.index === currentStep.state.current_index 
        ? (currentStep.state.found ? "Found! ✅" : "Currently checking 🔍")
        : d.index < currentStep.state.current_index 
        ? "Already checked ❌" 
        : "Not yet checked ⏳";
      return `Index ${d.index}: ${d.value}\nStatus: ${status}`;
    });

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`linear-search-outer ${theme}`}>
      {/* Header */}
      <div className="linear-search-header">
        <h2 className="title">Linear Search Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="linear-search-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="linear-search-controls">
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

          {/* Array Visualization */}
          <svg ref={svgRef} width={600} height={200}></svg>

          {/* State Display */}
          <div className="state-panel card">
            <h3>Linear Search State (Step {stepIndex + 1})</h3>
            <p><strong>Current Index:</strong> {step.state.current_index}</p>
            <p><strong>Current Value:</strong> {array[step.state.current_index]}</p>
            <p><strong>Target:</strong> {target}</p>
            <p><strong>Found:</strong> {step.state.found ? "Yes ✅" : "No ❌"}</p>
            <p><strong>Array:</strong> [{array.join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Current Index: {step.state.current_index} | 
              Current Value: {array[step.state.current_index]} | 
              Target: {target} | 
              Found: {step.state.found ? "Yes" : "No"}
            </p>
            {step.next_suggestion !== null && (
              <p className="ai-suggestion small-card">
                💡 Next index to check: <strong>{step.next_suggestion}</strong>
              </p>
            )}
            {step.state.found && (
              <p className="success-message small-card">
                🎉 Target found at index {step.state.current_index}!
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`LinearSearch(array, target):
  for i = 0 to array.length - 1:
    if array[i] == target:
      return i
  return -1`}</pre>
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
                Input Size (n)
              </text>
              <line x1={40} y1={220} x2={380} y2={60} stroke="steelblue" strokeWidth={2} />
              <text x={300} y={80} fill="steelblue" fontSize={12}>O(n)</text>
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
                Input Size (n)
              </text>
              <line x1={40} y1={200} x2={380} y2={200} stroke="orange" strokeWidth={2} />
              <text x={300} y={220} fill="orange" fontSize={12}>O(1)</text>
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
              <em>Index:</em> {st.state.current_index} |
              <em> Value:</em> {array[st.state.current_index]} |
              <em> Found:</em> {st.state.found ? "Yes" : "No"}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default LinearSearchVisualizer;
