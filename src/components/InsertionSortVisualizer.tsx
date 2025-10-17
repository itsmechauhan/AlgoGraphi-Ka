import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import insertionSortData from "../data/insertionSort.json";
import { speak } from "../utils/audioUtils";
import "./InsertionSortVisualizer.css";

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
    current_pass: number;
    current_element: number;
    current_index: number;
    key_index: number;
    comparing_index: number;
    swapped: boolean;
    array: number[];
    sorted_count: number;
    comparing: number[];
  };
  next_suggestion: string | null;
}

const InsertionSortVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = insertionSortData.meta.steps;
  const initialArray: number[] = insertionSortData.input.array;

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Visualization
  useEffect(() => {
    const width = 700;
    const height = 300;
    const barWidth = 80;
    const barSpacing = 20;
    const startX = 50;
    const startY = height - 50;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "array-container-group");

    const currentStep = steps[stepIndex];
    const currentArray = currentStep.state.array;

    // Create array elements
    const elements: ArrayElement[] = currentArray.map((value, index) => ({
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
        // Check if element is sorted (in final position)
        if (d.index < currentStep.state.sorted_count) {
          return "var(--sorted-color)";
        }
        // Check if element is the current key being inserted
        if (d.index === currentStep.state.key_index) {
          return "var(--key-color)";
        }
        // Check if element is being compared
        if (currentStep.state.comparing.includes(d.index)) {
          return "var(--comparing-color)";
        }
        // Check if element is being shifted
        if (d.index === currentStep.state.comparing_index && currentStep.state.swapped) {
          return "var(--shifted-color)";
        }
        return "var(--unsorted-color)";
      })
      .attr("stroke", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.key_index) {
          return "var(--ai-color)";
        }
        if (currentStep.state.comparing.includes(d.index)) {
          return "var(--comparing-stroke-color)";
        }
        return "var(--stroke-color)";
      })
      .attr("stroke-width", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.key_index) {
          return 4;
        }
        if (currentStep.state.comparing.includes(d.index)) {
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

    // Add comparison arrows between elements being compared
    if (currentStep.state.comparing.length === 2) {
      const [leftIdx, rightIdx] = currentStep.state.comparing;
      const leftElement = elements[leftIdx];
      const rightElement = elements[rightIdx];
      
      // Arrow from left to right
      const arrowX1 = leftElement.x + leftElement.width;
      const arrowY1 = leftElement.y + leftElement.height / 2;
      const arrowX2 = rightElement.x;
      const arrowY2 = rightElement.y + rightElement.height / 2;
      
      container
        .append("g")
        .attr("class", "comparison-arrow")
        .append("path")
        .attr("d", `M ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2}`)
        .attr("stroke", "var(--comparing-stroke-color)")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .attr("marker-end", "url(#arrowhead)")
        .style("opacity", 0.8);

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
        .attr("fill", "var(--comparing-stroke-color)");
    }

    // Add pass indicator
    container
      .append("g")
      .attr("class", "pass-indicator")
      .append("text")
      .text(`Pass ${currentStep.state.current_pass}`)
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--primary-color)")
      .style("font-weight", "bold")
      .style("font-size", "18px");

    // Add key element indicator
    container
      .append("g")
      .attr("class", "key-indicator")
      .append("text")
      .text(`Key: ${currentStep.state.current_element} (index ${currentStep.state.key_index})`)
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--key-color)")
      .style("font-weight", "bold")
      .style("font-size", "14px");

    // Add sorted elements indicator
    if (currentStep.state.sorted_count > 0) {
      container
        .append("g")
        .attr("class", "sorted-indicator")
        .append("text")
        .text(`${currentStep.state.sorted_count} elements sorted`)
        .attr("x", width / 2)
        .attr("y", 80)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--sorted-color)")
        .style("font-weight", "bold")
        .style("font-size", "14px");
    }

    // Add shift indicator if shift occurred
    if (currentStep.state.swapped && currentStep.state.comparing.length === 2) {
      const [leftIdx, rightIdx] = currentStep.state.comparing;
      const leftElement = elements[leftIdx];
      const rightElement = elements[rightIdx];
      
      // Shift animation effect
      container
        .append("g")
        .attr("class", "shift-effect")
        .append("text")
        .text("SHIFT!")
        .attr("x", (leftElement.x + rightElement.x + rightElement.width) / 2)
        .attr("y", Math.min(leftElement.y, rightElement.y) - 20)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--shifted-color)")
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .style("opacity", 0)
        .transition()
        .duration(500)
        .style("opacity", 1)
        .transition()
        .duration(500)
        .style("opacity", 0);
    }

    // Add key element highlight
    const keyElement = elements[currentStep.state.key_index];
    if (keyElement) {
      container
        .append("g")
        .attr("class", "key-highlight")
        .append("text")
        .text("KEY")
        .attr("x", keyElement.x + keyElement.width / 2)
        .attr("y", keyElement.y - 30)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--ai-color)")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("opacity", 0.8);
    }

    // Add insertion point indicator
    if (currentStep.state.comparing_index !== undefined) {
      const insertElement = elements[currentStep.state.comparing_index];
      if (insertElement) {
        container
          .append("g")
          .attr("class", "insertion-point")
          .append("text")
          .text("INSERT")
          .attr("x", insertElement.x + insertElement.width / 2)
          .attr("y", insertElement.y - 50)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--insertion-color)")
          .style("font-weight", "bold")
          .style("font-size", "12px")
          .style("opacity", 0.8);
      }
    }

    // Tooltips
    bars.append("title").text((d: ArrayElement) => {
      const currentStep = steps[stepIndex];
      let status = "";
      if (d.index < currentStep.state.sorted_count) {
        status = "Sorted ✅";
      } else if (d.index === currentStep.state.key_index) {
        status = "Key Element 🔑";
      } else if (currentStep.state.comparing.includes(d.index)) {
        status = "Comparing 🔍";
      } else if (d.index === currentStep.state.comparing_index && currentStep.state.swapped) {
        status = "Being Shifted ➡️";
      } else {
        status = "Unsorted ⏳";
      }
      return `Index ${d.index}: ${d.value}\nStatus: ${status}`;
    });

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`insertion-sort-outer ${theme}`}>
      {/* Header */}
      <div className="insertion-sort-header">
        <h2 className="title">Insertion Sort Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="insertion-sort-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="insertion-sort-controls">
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
          <svg ref={svgRef} width={700} height={300}></svg>

          {/* State Display */}
          <div className="state-panel card">
            <h3>Insertion Sort State (Step {stepIndex + 1})</h3>
            <p><strong>Current Pass:</strong> {step.state.current_pass}</p>
            <p><strong>Key Element:</strong> {step.state.current_element}</p>
            <p><strong>Key Index:</strong> {step.state.key_index}</p>
            <p><strong>Comparing Index:</strong> {step.state.comparing_index}</p>
            <p><strong>Shifted:</strong> {step.state.swapped ? "Yes ➡️" : "No ❌"}</p>
            <p><strong>Sorted Elements:</strong> {step.state.sorted_count}</p>
            <p><strong>Current Array:</strong> [{step.state.array.join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Pass: {step.state.current_pass} | Key: {step.state.current_element}@{step.state.key_index} | 
              Comparing: {step.state.comparing_index} | Shifted: {step.state.swapped ? "Yes" : "No"} | Sorted: {step.state.sorted_count}
            </p>
            {step.next_suggestion === "continue" && (
              <p className="ai-suggestion small-card">
                💡 Continue comparing and shifting elements
              </p>
            )}
            {step.next_suggestion === "pass_complete" && (
              <p className="ai-suggestion small-card">
                💡 Pass complete! Key element inserted in correct position
              </p>
            )}
            {step.next_suggestion === "complete" && (
              <p className="success-message small-card">
                🎉 Insertion Sort complete! Array is sorted.
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`InsertionSort(array):
  for i = 1 to array.length - 1:
    key = array[i]
    j = i - 1
    while j >= 0 and array[j] > key:
      array[j + 1] = array[j]
      j = j - 1
    array[j + 1] = key
  return array`}</pre>
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
              <text x={300} y={60} fill="steelblue" fontSize={12}>O(n²)</text>
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
              <em>Pass:</em> {st.state.current_pass} | <em>Key:</em> {st.state.current_element}@{st.state.key_index} |
              <em> Comparing:</em> {st.state.comparing_index} | <em>Shifted:</em> {st.state.swapped ? "Yes" : "No"}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default InsertionSortVisualizer;
