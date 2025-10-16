import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import binarySearchData from "../data/binarySearch.json";
import { speak } from "../utils/AudioUtils";
import "./BinarySearchVisualizer.css";

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
    left: number;
    right: number;
    middle: number;
    found: boolean;
  };
  next_suggestion: string | null;
}

const BinarySearchVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = binarySearchData.meta.steps;
  const array: number[] = binarySearchData.input.array;
  const target: number = binarySearchData.input.target;

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Visualization
  useEffect(() => {
    const width = 600;
    const height = 250;
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
        if (d.index === currentStep.state.middle) {
          return currentStep.state.found ? "var(--found-color)" : "var(--middle-color)";
        }
        if (d.index >= currentStep.state.left && d.index <= currentStep.state.right) {
          return "var(--search-range-color)";
        }
        return "var(--excluded-color)";
      })
      .attr("stroke", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.middle) {
          return "var(--ai-color)";
        }
        if (d.index === currentStep.state.left || d.index === currentStep.state.right) {
          return "var(--boundary-color)";
        }
        return "var(--stroke-color)";
      })
      .attr("stroke-width", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.middle) {
          return 4;
        }
        if (d.index === currentStep.state.left || d.index === currentStep.state.right) {
          return 3;
        }
        return 2;
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

    // Add search range indicators
    const currentStep = steps[stepIndex];
    if (currentStep.state.left <= currentStep.state.right) {
      const leftElement = elements[currentStep.state.left];
      const rightElement = elements[currentStep.state.right];
      
      // Left boundary indicator
      container
        .append("g")
        .attr("class", "left-boundary")
        .append("text")
        .text("L")
        .attr("x", leftElement.x + leftElement.width / 2)
        .attr("y", leftElement.y - 30)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--boundary-color)")
        .style("font-weight", "bold")
        .style("font-size", "16px");

      // Right boundary indicator
      container
        .append("g")
        .attr("class", "right-boundary")
        .append("text")
        .text("R")
        .attr("x", rightElement.x + rightElement.width / 2)
        .attr("y", rightElement.y - 30)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--boundary-color)")
        .style("font-weight", "bold")
        .style("font-size", "16px");

      // Middle indicator
      const middleElement = elements[currentStep.state.middle];
      container
        .append("g")
        .attr("class", "middle-indicator")
        .append("text")
        .text("M")
        .attr("x", middleElement.x + middleElement.width / 2)
        .attr("y", middleElement.y - 50)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--ai-color)")
        .style("font-weight", "bold")
        .style("font-size", "16px");

      // Search range line
      container
        .append("g")
        .attr("class", "search-range-line")
        .append("line")
        .attr("x1", leftElement.x)
        .attr("y1", startY + 40)
        .attr("x2", rightElement.x + rightElement.width)
        .attr("y2", startY + 40)
        .attr("stroke", "var(--search-range-color)")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5");
    }

    // Tooltips
    bars.append("title").text((d: ArrayElement) => {
      const currentStep = steps[stepIndex];
      let status = "";
      if (d.index === currentStep.state.middle) {
        status = currentStep.state.found ? "Found! ✅" : "Middle element 🔍";
      } else if (d.index >= currentStep.state.left && d.index <= currentStep.state.right) {
        status = "In search range 📍";
      } else {
        status = "Excluded ❌";
      }
      return `Index ${d.index}: ${d.value}\nStatus: ${status}`;
    });

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`binary-search-outer ${theme}`}>
      {/* Header */}
      <div className="binary-search-header">
        <h2 className="title">Binary Search Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="binary-search-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="binary-search-controls">
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
          <svg ref={svgRef} width={600} height={250}></svg>

          {/* State Display */}
          <div className="state-panel card">
            <h3>Binary Search State (Step {stepIndex + 1})</h3>
            <p><strong>Left:</strong> {step.state.left}</p>
            <p><strong>Right:</strong> {step.state.right}</p>
            <p><strong>Middle:</strong> {step.state.middle}</p>
            <p><strong>Middle Value:</strong> {array[step.state.middle]}</p>
            <p><strong>Target:</strong> {target}</p>
            <p><strong>Found:</strong> {step.state.found ? "Yes ✅" : "No ❌"}</p>
            <p><strong>Array:</strong> [{array.join(", ")}]</p>
            <p><strong>Search Range:</strong> [{array.slice(step.state.left, step.state.right + 1).join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Left: {step.state.left} | Right: {step.state.right} | 
              Middle: {step.state.middle} | Value: {array[step.state.middle]} | 
              Target: {target} | Found: {step.state.found ? "Yes" : "No"}
            </p>
            {step.next_suggestion && step.next_suggestion !== "found" && (
              <p className="ai-suggestion small-card">
                💡 Next: {step.next_suggestion === "left" ? "Search left half" : "Search right half"}
              </p>
            )}
            {step.state.found && (
              <p className="success-message small-card">
                🎉 Target found at index {step.state.middle}!
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`BinarySearch(array, target):
  left = 0, right = array.length - 1
  while left <= right:
    middle = (left + right) / 2
    if array[middle] == target:
      return middle
    elif array[middle] < target:
      left = middle + 1
    else:
      right = middle - 1
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
              <line x1={40} y1={220} x2={380} y2={40} stroke="steelblue" strokeWidth={2} />
              <text x={300} y={60} fill="steelblue" fontSize={12}>O(log n)</text>
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
              <em>Left:</em> {st.state.left} | <em>Right:</em> {st.state.right} |
              <em> Middle:</em> {st.state.middle} | <em>Value:</em> {array[st.state.middle]} |
              <em> Found:</em> {st.state.found ? "Yes" : "No"}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default BinarySearchVisualizer;
