import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import quickSortData from "../data/quickSort.json";
import { speak } from "../utils/AudioUtils";
import "./QuickSortVisualizer.css";

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
    current_partition: number;
    pivot: number;
    pivot_index: number;
    left: number;
    right: number;
    i: number;
    j: number;
    swapped: boolean;
    array: number[];
    partitioning: boolean;
    partition_range: number[];
    comparing: number[];
  };
  next_suggestion: string | null;
}

const QuickSortVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const steps: Step[] = quickSortData.meta.steps;
  const initialArray: number[] = quickSortData.input.array;

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
        // Check if element is the pivot
        if (d.index === currentStep.state.pivot_index) {
          return "var(--pivot-color)";
        }
        // Check if element is in partition range
        if (d.index >= currentStep.state.partition_range[0] && d.index <= currentStep.state.partition_range[1]) {
          if (currentStep.state.comparing.includes(d.index)) {
            return "var(--comparing-color)";
          }
          return "var(--partition-color)";
        }
        // Check if element is sorted (outside partition range)
        return "var(--sorted-color)";
      })
      .attr("stroke", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.pivot_index) {
          return "var(--ai-color)";
        }
        if (currentStep.state.comparing.includes(d.index)) {
          return "var(--comparing-stroke-color)";
        }
        return "var(--stroke-color)";
      })
      .attr("stroke-width", (d: ArrayElement) => {
        const currentStep = steps[stepIndex];
        if (d.index === currentStep.state.pivot_index) {
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

    // Add partition indicator
    container
      .append("g")
      .attr("class", "partition-indicator")
      .append("text")
      .text(`Partition ${currentStep.state.current_partition}`)
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--primary-color)")
      .style("font-weight", "bold")
      .style("font-size", "18px");

    // Add pivot indicator
    container
      .append("g")
      .attr("class", "pivot-indicator")
      .append("text")
      .text(`Pivot: ${currentStep.state.pivot} (index ${currentStep.state.pivot_index})`)
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--pivot-color)")
      .style("font-weight", "bold")
      .style("font-size", "14px");

    // Add partition range indicator
    container
      .append("g")
      .attr("class", "range-indicator")
      .append("text")
      .text(`Range: [${currentStep.state.partition_range[0]}, ${currentStep.state.partition_range[1]}]`)
      .attr("x", width / 2)
      .attr("y", 80)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--partition-color)")
      .style("font-weight", "bold")
      .style("font-size", "14px");

    // Add partition range line
    if (currentStep.state.partition_range.length === 2) {
      const startIdx = currentStep.state.partition_range[0];
      const endIdx = currentStep.state.partition_range[1];
      const startElement = elements[startIdx];
      const endElement = elements[endIdx];
      
      container
        .append("g")
        .attr("class", "partition-range-line")
        .append("line")
        .attr("x1", startElement.x)
        .attr("y1", startY + 40)
        .attr("x2", endElement.x + endElement.width)
        .attr("y2", startY + 40)
        .attr("stroke", "var(--partition-color)")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5");
    }

    // Add swap indicator if swap occurred
    if (currentStep.state.swapped && currentStep.state.comparing.length === 2) {
      const [leftIdx, rightIdx] = currentStep.state.comparing;
      const leftElement = elements[leftIdx];
      const rightElement = elements[rightIdx];
      
      // Swap animation effect
      container
        .append("g")
        .attr("class", "swap-effect")
        .append("text")
        .text("SWAP!")
        .attr("x", (leftElement.x + rightElement.x + rightElement.width) / 2)
        .attr("y", Math.min(leftElement.y, rightElement.y) - 20)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--swapped-color)")
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

    // Add pivot highlight
    const pivotElement = elements[currentStep.state.pivot_index];
    if (pivotElement) {
      container
        .append("g")
        .attr("class", "pivot-highlight")
        .append("text")
        .text("PIVOT")
        .attr("x", pivotElement.x + pivotElement.width / 2)
        .attr("y", pivotElement.y - 30)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--ai-color)")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("opacity", 0.8);
    }

    // Add pointers (i and j) if partitioning
    if (currentStep.state.partitioning) {
      // i pointer
      if (currentStep.state.i >= 0) {
        const iElement = elements[currentStep.state.i];
        container
          .append("g")
          .attr("class", "i-pointer")
          .append("text")
          .text("i")
          .attr("x", iElement.x + iElement.width / 2)
          .attr("y", iElement.y - 50)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--i-color)")
          .style("font-weight", "bold")
          .style("font-size", "14px");
      }

      // j pointer
      if (currentStep.state.j >= 0) {
        const jElement = elements[currentStep.state.j];
        container
          .append("g")
          .attr("class", "j-pointer")
          .append("text")
          .text("j")
          .attr("x", jElement.x + jElement.width / 2)
          .attr("y", jElement.y - 70)
          .attr("text-anchor", "middle")
          .attr("fill", "var(--j-color)")
          .style("font-weight", "bold")
          .style("font-size", "14px");
      }
    }

    // Tooltips
    bars.append("title").text((d: ArrayElement) => {
      const currentStep = steps[stepIndex];
      let status = "";
      if (d.index === currentStep.state.pivot_index) {
        status = "Pivot 🎯";
      } else if (d.index >= currentStep.state.partition_range[0] && d.index <= currentStep.state.partition_range[1]) {
        if (currentStep.state.comparing.includes(d.index)) {
          status = "Comparing 🔍";
        } else {
          status = "In Partition 📍";
        }
      } else {
        status = "Sorted ✅";
      }
      return `Index ${d.index}: ${d.value}\nStatus: ${status}`;
    });

    // Speak explanation
    speak(steps[stepIndex].actions[explanationLevel]);
  }, [stepIndex, explanationLevel, theme]);

  const step = steps[stepIndex];

  return (
    <div className={`quick-sort-outer ${theme}`}>
      {/* Header */}
      <div className="quick-sort-header">
        <h2 className="title">Quick Sort Visualizer</h2>
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className="quick-sort-and-controls">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="quick-sort-controls">
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
            <h3>Quick Sort State (Step {stepIndex + 1})</h3>
            <p><strong>Current Partition:</strong> {step.state.current_partition}</p>
            <p><strong>Pivot:</strong> {step.state.pivot}</p>
            <p><strong>Pivot Index:</strong> {step.state.pivot_index}</p>
            <p><strong>Partition Range:</strong> [{step.state.partition_range.join(", ")}]</p>
            <p><strong>Left:</strong> {step.state.left}</p>
            <p><strong>Right:</strong> {step.state.right}</p>
            <p><strong>i:</strong> {step.state.i}</p>
            <p><strong>j:</strong> {step.state.j}</p>
            <p><strong>Swapped:</strong> {step.state.swapped ? "Yes 🔄" : "No ❌"}</p>
            <p><strong>Partitioning:</strong> {step.state.partitioning ? "Yes" : "No"}</p>
            <p><strong>Current Array:</strong> [{step.state.array.join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Partition: {step.state.current_partition} | Pivot: {step.state.pivot}@{step.state.pivot_index} | 
              Range: [{step.state.partition_range.join(", ")}] | Swapped: {step.state.swapped ? "Yes" : "No"}
            </p>
            {step.next_suggestion === "continue" && (
              <p className="ai-suggestion small-card">
                💡 Continue partitioning process
              </p>
            )}
            {step.next_suggestion === "partition_complete" && (
              <p className="ai-suggestion small-card">
                💡 Partition complete! Pivot is in correct position
              </p>
            )}
            {step.next_suggestion === "complete" && (
              <p className="success-message small-card">
                🎉 Quick Sort complete! Array is sorted.
              </p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card pseudocode-card">
            <h3>Pseudocode</h3>
            <pre>{`QuickSort(array, low, high):
  if low < high:
    pivotIndex = partition(array, low, high)
    QuickSort(array, low, pivotIndex - 1)
    QuickSort(array, pivotIndex + 1, high)

partition(array, low, high):
  pivot = array[high]
  i = low - 1
  for j = low to high - 1:
    if array[j] <= pivot:
      i = i + 1
      swap(array[i], array[j])
  swap(array[i + 1], array[high])
  return i + 1`}</pre>
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
              <text x={300} y={80} fill="orange" fontSize={12}>O(log n)</text>
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
              <em>Partition:</em> {st.state.current_partition} | <em>Pivot:</em> {st.state.pivot}@{st.state.pivot_index} |
              <em> Range:</em> [{st.state.partition_range.join(", ")}] | <em>Swapped:</em> {st.state.swapped ? "Yes" : "No"}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default QuickSortVisualizer;
