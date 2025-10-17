import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import mergeSortData from "../data/mergeSort.json";
import { speak } from "../utils/audioUtils";
import "./MergeSortVisualizer.css";

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
    current_level: number;
    left_array: number[];
    right_array: number[];
    merged_array: number[];
    left_index: number;
    right_index: number;
    merge_index: number;
    comparing: number[];
    merging: boolean;
    array: number[];
    temp_array: number[];
    current_merge: string;
  };
  next_suggestion: string | null;
}

const MergeSortVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = mergeSortData.meta.steps;
  const initialArray: number[] = mergeSortData.input.array;

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // D3 Visualization
  useEffect(() => {
    const width = 700;
    const height = 450;
    const barWidth = 60;
    const barSpacing = 15;
    const startX = 50;
    const startY = height - 50;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "array-container-group");

    const currentStep = steps[stepIndex];
    const currentArray = currentStep.state.array;

    // Create main array elements
    const elements: ArrayElement[] = currentArray.map((value, index) => ({
      value,
      index,
      x: startX + index * (barWidth + barSpacing),
      y: startY - value * 2, // Scale values for visualization
      width: barWidth,
      height: value * 2
    }));

    // Draw main array elements
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
        // Check if element is being compared
        if (currentStep.state.comparing.includes(d.value)) {
          return "var(--comparing-color)";
        }
        // Check if element is in merged array
        if (currentStep.state.merged_array.includes(d.value)) {
          return "var(--merged-color)";
        }
        // Check if element is in temp array
        if (currentStep.state.temp_array.includes(d.value)) {
          return "var(--temp-color)";
        }
        return "var(--unsorted-color)";
      })
      .attr("stroke", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (currentStep.state.comparing.includes(d.value)) {
          return "var(--comparing-stroke-color)";
        }
        return "var(--stroke-color)";
      })
      .attr("stroke-width", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        return currentStep.state.comparing.includes(d.value) ? 3 : 2;
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
      .style("font-size", "12px");

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
      .style("font-size", "10px");

    // Draw left array if it exists
    if (currentStep.state.left_array.length > 0) {
      const leftElements: ArrayElement[] = currentStep.state.left_array.map((value, index) => ({
        value,
        index,
        x: startX + index * (barWidth + barSpacing),
        y: startY - 120 - value * 1.5,
        width: barWidth,
        height: value * 1.5
      }));

      container
        .append("g")
        .attr("class", "left-array")
        .selectAll("rect")
        .data(leftElements)
        .enter()
        .append("rect")
        .attr("x", (d: ArrayElement) => d.x)
        .attr("y", (d: ArrayElement) => d.y)
        .attr("width", (d: ArrayElement) => d.width)
        .attr("height", (d: ArrayElement) => d.height)
        .attr("fill", "var(--left-array-color)")
        .attr("stroke", "var(--stroke-color)")
        .attr("stroke-width", 2)
        .attr("rx", 5)
        .attr("ry", 5);

      // Add labels for left array
      container
        .append("g")
        .attr("class", "left-array-labels")
        .selectAll("text")
        .data(leftElements)
        .enter()
        .append("text")
        .text((d: ArrayElement) => d.value)
        .attr("x", (d: ArrayElement) => d.x + d.width / 2)
        .attr("y", (d: ArrayElement) => d.y - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "10px");
    }

    // Draw right array if it exists
    if (currentStep.state.right_array.length > 0) {
      const rightStartX = startX + 250;
      const rightElements: ArrayElement[] = currentStep.state.right_array.map((value, index) => ({
        value,
        index,
        x: rightStartX + index * (barWidth + barSpacing),
        y: startY - 120 - value * 1.5,
        width: barWidth,
        height: value * 1.5
      }));

      container
        .append("g")
        .attr("class", "right-array")
        .selectAll("rect")
        .data(rightElements)
        .enter()
        .append("rect")
        .attr("x", (d: ArrayElement) => d.x)
        .attr("y", (d: ArrayElement) => d.y)
        .attr("width", (d: ArrayElement) => d.width)
        .attr("height", (d: ArrayElement) => d.height)
        .attr("fill", "var(--right-array-color)")
        .attr("stroke", "var(--stroke-color)")
        .attr("stroke-width", 2)
        .attr("rx", 5)
        .attr("ry", 5);

      // Add labels for right array
      container
        .append("g")
        .attr("class", "right-array-labels")
        .selectAll("text")
        .data(rightElements)
        .enter()
        .append("text")
        .text((d: ArrayElement) => d.value)
        .attr("x", (d: ArrayElement) => d.x + d.width / 2)
        .attr("y", (d: ArrayElement) => d.y - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "10px");
    }

    // Draw merged array if it exists
    if (currentStep.state.merged_array.length > 0) {
      const mergedStartX = startX + 125;
      const mergedElements: ArrayElement[] = currentStep.state.merged_array.map((value, index) => ({
        value,
        index,
        x: mergedStartX + index * (barWidth + barSpacing),
        y: startY - 240 - value * 1.5,
        width: barWidth,
        height: value * 1.5
      }));

      container
        .append("g")
        .attr("class", "merged-array")
        .selectAll("rect")
        .data(mergedElements)
        .enter()
        .append("rect")
        .attr("x", (d: ArrayElement) => d.x)
        .attr("y", (d: ArrayElement) => d.y)
        .attr("width", (d: ArrayElement) => d.width)
        .attr("height", (d: ArrayElement) => d.height)
        .attr("fill", "var(--merged-color)")
        .attr("stroke", "var(--stroke-color)")
        .attr("stroke-width", 2)
        .attr("rx", 5)
        .attr("ry", 5);

      // Add labels for merged array
      container
        .append("g")
        .attr("class", "merged-array-labels")
        .selectAll("text")
        .data(mergedElements)
        .enter()
        .append("text")
        .text((d: ArrayElement) => d.value)
        .attr("x", (d: ArrayElement) => d.x + d.width / 2)
        .attr("y", (d: ArrayElement) => d.y - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "10px");
    }

    // Add comparison arrows between elements being compared
    if (currentStep.state.comparing.length === 2) {
      const [leftVal, rightVal] = currentStep.state.comparing;
      const leftElement = elements.find(e => e.value === leftVal);
      const rightElement = elements.find(e => e.value === rightVal);
      
      if (leftElement && rightElement) {
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
    }

    // Add level indicator
    container
      .append("g")
      .attr("class", "level-indicator")
      .append("text")
      .text(`Level ${currentStep.state.current_level}`)
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--primary-color)")
      .style("font-weight", "bold")
      .style("font-size", "18px");

    // Add merge status indicator
    container
      .append("g")
      .attr("class", "merge-status")
      .append("text")
      .text(`Status: ${currentStep.state.current_merge.toUpperCase()}`)
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--merge-status-color)")
      .style("font-weight", "bold")
      .style("font-size", "14px");

    // Add merge effect if merging
    if (currentStep.state.merging && currentStep.state.comparing.length === 2) {
      const [leftVal, rightVal] = currentStep.state.comparing;
      const leftElement = elements.find(e => e.value === leftVal);
      const rightElement = elements.find(e => e.value === rightVal);
      
      if (leftElement && rightElement) {
        // Merge animation effect
        container
          .append("g")
          .attr("class", "merge-effect")
          .append("text")
          .text("MERGE!")
          .attr("x", (leftElement.x + rightElement.x + rightElement.width) / 2)
          .attr("y", Math.min(leftElement.y, rightElement.y) - 20)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--merge-color)")
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
    }

    // Add array labels
    container
      .append("g")
      .attr("class", "array-labels")
      .append("text")
      .text("Main Array")
      .attr("x", 20)
      .attr("y", startY + 40)
      .attr("fill", "var(--text-color)")
      .style("font-weight", "bold")
      .style("font-size", "12px");

    if (currentStep.state.left_array.length > 0) {
      container
        .append("g")
        .attr("class", "left-label")
        .append("text")
        .text("Left Array")
        .attr("x", 20)
        .attr("y", startY - 80)
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "12px");
    }

    if (currentStep.state.right_array.length > 0) {
      container
        .append("g")
        .attr("class", "right-label")
        .append("text")
        .text("Right Array")
        .attr("x", 270)
        .attr("y", startY - 80)
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "12px");
    }

    if (currentStep.state.merged_array.length > 0) {
      container
        .append("g")
        .attr("class", "merged-label")
        .append("text")
        .text("Merged Array")
        .attr("x", 145)
        .attr("y", startY - 200)
        .attr("fill", "var(--text-color)")
        .style("font-weight", "bold")
        .style("font-size", "12px");
    }

    // Tooltips
    bars.append("title").text((d: ArrayElement) => {
      const currentStep = steps[stepIndex];
      let status = "";
      if (currentStep.state.comparing.includes(d.value)) {
        status = "Comparing 🔍";
      } else if (currentStep.state.merged_array.includes(d.value)) {
        status = "Merged ✅";
      } else if (currentStep.state.temp_array.includes(d.value)) {
        status = "In Temp Array 📋";
      } else {
        status = "Unsorted ⏳";
      }
      return `Value: ${d.value}\nStatus: ${status}`;
    });

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`merge-sort-outer ${theme}`}>
      {/* Header */}
      <div className="merge-sort-header">
        <h2 className="title">Merge Sort Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="merge-sort-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="merge-sort-controls">
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
          <svg ref={svgRef} width={700} height={450}></svg>

          {/* State Display */}
          <div className="state-panel card">
            <h3>Merge Sort State (Step {stepIndex + 1})</h3>
            <p><strong>Current Level:</strong> {step.state.current_level}</p>
            <p><strong>Left Array:</strong> [{step.state.left_array.join(", ")}]</p>
            <p><strong>Right Array:</strong> [{step.state.right_array.join(", ")}]</p>
            <p><strong>Merged Array:</strong> [{step.state.merged_array.join(", ")}]</p>
            <p><strong>Left Index:</strong> {step.state.left_index}</p>
            <p><strong>Right Index:</strong> {step.state.right_index}</p>
            <p><strong>Merge Index:</strong> {step.state.merge_index}</p>
            <p><strong>Merging:</strong> {step.state.merging ? "Yes 🔄" : "No ❌"}</p>
            <p><strong>Current Merge:</strong> {step.state.current_merge}</p>
            <p><strong>Current Array:</strong> [{step.state.array.join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Level: {step.state.current_level} | Status: {step.state.current_merge} | 
              Merging: {step.state.merging ? "Yes" : "No"} | Left: {step.state.left_index} | Right: {step.state.right_index}
            </p>
            {step.next_suggestion === "continue" && (
              <p className="ai-suggestion small-card">
                💡 Continue merge sort process
              </p>
            )}
            {step.next_suggestion === "complete" && (
              <p className="success-message small-card">
                🎉 Merge Sort complete! Array is sorted.
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`MergeSort(array):
  if array.length <= 1:
    return array
  mid = array.length / 2
  left = MergeSort(array[0:mid])
  right = MergeSort(array[mid:])
  return merge(left, right)

merge(left, right):
  result = []
  i = j = 0
  while i < left.length and j < right.length:
    if left[i] <= right[j]:
      result.append(left[i])
      i++
    else:
      result.append(right[j])
      j++
  result.extend(left[i:])
  result.extend(right[j:])
  return result`}</pre>
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
              <text x={300} y={60} fill="steelblue" fontSize={12}>O(n log n)</text>
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
              <line x1={40} y1={220} x2={380} y2={60} stroke="orange" strokeWidth={2} />
              <text x={300} y={80} fill="orange" fontSize={12}>O(n)</text>
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
              <em>Level:</em> {st.state.current_level} | <em>Status:</em> {st.state.current_merge} |
              <em> Merging:</em> {st.state.merging ? "Yes" : "No"} | <em>Left:</em> {st.state.left_index} | <em>Right:</em> {st.state.right_index}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default MergeSortVisualizer;
