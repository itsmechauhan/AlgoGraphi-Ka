import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import mergeSortData from "../data/mergeSort.json";
import { speak, stopSpeaking } from "../utils/audioUtils";
import "./MergeSortTreeVisualizer.css";

interface TreeNode {
  id: string;
  array: number[];
  level: number;
  isLeaf: boolean;
  isSorted: boolean;
  children?: TreeNode[];
  parent?: TreeNode;
  x?: number;
  y?: number;
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

const MergeSortTreeVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<0 | 1>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [resetKey, setResetKey] = useState(0);

  const steps: Step[] = mergeSortData.meta.steps;
  const initialArray: number[] = mergeSortData.input.array;

  // Create tree structure for merge sort
  const createTreeStructure = (arr: number[], level: number = 0, parent?: TreeNode): TreeNode => {
    const node: TreeNode = {
      id: `${level}-${arr.join(',')}`,
      array: [...arr],
      level,
      isLeaf: arr.length === 1,
      isSorted: arr.length === 1,
      parent
    };

    if (arr.length > 1) {
      const mid = Math.floor(arr.length / 2);
      const left = arr.slice(0, mid);
      const right = arr.slice(mid);
      
      node.children = [
        createTreeStructure(left, level + 1, node),
        createTreeStructure(right, level + 1, node)
      ];
    }

    return node;
  };

  const treeData = createTreeStructure(initialArray);

  // Theme handling
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // D3 Tree Visualization
  useEffect(() => {
    const width = 1000;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g")
      .attr("class", "tree-container")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Calculate current step state
    const currentStep = steps[stepIndex];
    const currentLevel = currentStep.state.current_level;
    const isMerging = currentStep.state.merging;

    // Create separate containers for different arrays
    const mainArrayContainer = container.append("g")
      .attr("class", "main-array-container")
      .attr("transform", "translate(50, 50)");

    const mergeArrayContainer = container.append("g")
      .attr("class", "merge-array-container")
      .attr("transform", "translate(50, 150)");

    const treeContainer = container.append("g")
      .attr("class", "tree-visualization")
      .attr("transform", "translate(0, 250)");

    // Draw Main Array (Original Array)
    mainArrayContainer.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "var(--primary-color)")
      .text("Main Array (Original)");

    const mainArrayElements = mainArrayContainer.append("g")
      .attr("class", "main-array-elements");

    mainArrayElements.selectAll("rect")
      .data(currentStep.state.array)
      .enter()
      .append("rect")
      .attr("x", (d: any, i: number) => i * 35)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 5)
      .attr("fill", (d: any) => {
        if (currentStep.state.comparing.includes(d)) {
          return "var(--comparing-color)";
        }
        return "var(--current-element-color)";
      })
      .attr("stroke", "var(--stroke-color)")
      .attr("stroke-width", 2)
      .attr("class", "floating draggable")
      .call(d3.drag<any, any>()
        .on("start", function(event: any, d: any) {
          d3.select(this as any).raise();
        })
        .on("drag", function(event: any, d: any) {
          d3.select(this as any)
            .attr("x", event.x - 15)
            .attr("y", event.y - 15);
        })
        .on("end", function(event: any, d: any) {
          // Snap back to grid or keep position
        }));

    mainArrayElements.selectAll("text")
      .data(currentStep.state.array)
      .enter()
      .append("text")
      .attr("x", (d: any, i: number) => i * 35 + 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "var(--text-color)")
      .text((d: any) => d);

    // Draw Merge Array (if exists)
    if (currentStep.state.merged_array.length > 0) {
      mergeArrayContainer.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "var(--merged-color)")
        .text("Merge Array (Result)");

      const mergeArrayElements = mergeArrayContainer.append("g")
        .attr("class", "merge-array-elements");

      mergeArrayElements.selectAll("rect")
        .data(currentStep.state.merged_array)
        .enter()
        .append("rect")
        .attr("x", (d: any, i: number) => i * 35)
        .attr("y", 0)
        .attr("width", 30)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("fill", "var(--merged-color)")
        .attr("stroke", "var(--stroke-color)")
        .attr("stroke-width", 2)
        .attr("class", "floating draggable")
        .call(d3.drag<any, any>()
          .on("start", function(event: any, d: any) {
            d3.select(this as any).raise();
          })
          .on("drag", function(event: any, d: any) {
            d3.select(this as any)
              .attr("x", event.x - 15)
              .attr("y", event.y - 15);
          })
          .on("end", function(event: any, d: any) {
            // Snap back to grid or keep position
          }));

      mergeArrayElements.selectAll("text")
        .data(currentStep.state.merged_array)
        .enter()
        .append("text")
        .attr("x", (d: any, i: number) => i * 35 + 15)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "var(--text-color)")
        .text((d: any) => d);
    }

    // Draw Left and Right Arrays (if they exist)
    if (currentStep.state.left_array.length > 0 || currentStep.state.right_array.length > 0) {
      const leftArrayContainer = container.append("g")
        .attr("class", "left-array-container")
        .attr("transform", "translate(50, 200)");

      const rightArrayContainer = container.append("g")
        .attr("class", "right-array-container")
        .attr("transform", "translate(300, 200)");

      // Left Array
      if (currentStep.state.left_array.length > 0) {
        leftArrayContainer.append("text")
          .attr("x", 0)
          .attr("y", -10)
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("fill", "var(--processing-color)")
          .text("Left Array");

        const leftArrayElements = leftArrayContainer.append("g")
          .attr("class", "left-array-elements");

        leftArrayElements.selectAll("rect")
          .data(currentStep.state.left_array)
          .enter()
          .append("rect")
          .attr("x", (d: any, i: number) => i * 30)
          .attr("y", 0)
          .attr("width", 25)
          .attr("height", 25)
          .attr("rx", 3)
          .attr("fill", "var(--processing-element-color)")
          .attr("stroke", "var(--stroke-color)")
          .attr("stroke-width", 1)
          .attr("class", "floating draggable");

        leftArrayElements.selectAll("text")
          .data(currentStep.state.left_array)
          .enter()
          .append("text")
          .attr("x", (d: any, i: number) => i * 30 + 12.5)
          .attr("y", 17)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "var(--text-color)")
          .text((d: any) => d);
      }

      // Right Array
      if (currentStep.state.right_array.length > 0) {
        rightArrayContainer.append("text")
          .attr("x", 0)
          .attr("y", -10)
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("fill", "var(--processing-color)")
          .text("Right Array");

        const rightArrayElements = rightArrayContainer.append("g")
          .attr("class", "right-array-elements");

        rightArrayElements.selectAll("rect")
          .data(currentStep.state.right_array)
          .enter()
          .append("rect")
          .attr("x", (d: any, i: number) => i * 30)
          .attr("y", 0)
          .attr("width", 25)
          .attr("height", 25)
          .attr("rx", 3)
          .attr("fill", "var(--processing-element-color)")
          .attr("stroke", "var(--stroke-color)")
          .attr("stroke-width", 1)
          .attr("class", "floating draggable");

        rightArrayElements.selectAll("text")
          .data(currentStep.state.right_array)
          .enter()
          .append("text")
          .attr("x", (d: any, i: number) => i * 30 + 12.5)
          .attr("y", 17)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "var(--text-color)")
          .text((d: any) => d);
      }
    }

    // Create tree layout for the tree visualization part
    const treeLayout = d3.tree<TreeNode>()
      .size([width - margin.left - margin.right, 300])
      .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 2) / a.depth);

    // Convert tree data to D3 hierarchy
    const root = d3.hierarchy(treeData, (d: any) => d.children);
    const treeNodes = treeLayout(root);

    // Draw links in tree container
    const links = treeContainer.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(treeNodes.links())
      .enter()
      .append("path")
      .attr("d", d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr("fill", "none")
      .attr("stroke", "var(--tree-line-color)")
      .attr("stroke-width", 2)
      .attr("opacity", (d: any) => {
        const sourceLevel = d.source.data.level;
        return sourceLevel < currentLevel ? 1 : 0.3;
      });

    // Draw nodes in tree container
    const nodes = treeContainer.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(treeNodes.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
      .call(d3.drag<any, any>()
        .on("start", function(event: any, d: any) {
          d3.select(this as any).raise();
          // Store original position for reference
          d.originalX = d.x;
          d.originalY = d.y;
        })
        .on("drag", function(event: any, d: any) {
          // Update node position
          d.x = event.x;
          d.y = event.y;
          d3.select(this as any)
            .attr("transform", `translate(${event.x}, ${event.y})`);
          
          // Update all connected links with visual feedback
          links
            .classed("updating", true)
            .attr("d", d3.linkVertical<any, any>()
              .x((linkData: any) => linkData.x)
              .y((linkData: any) => linkData.y));
        })
        .on("end", function(event: any, d: any) {
          // Keep the new position and update links one final time
          links
            .classed("updating", false)
            .attr("d", d3.linkVertical<any, any>()
              .x((linkData: any) => linkData.x)
              .y((linkData: any) => linkData.y));
        }));

    // Add node circles
    nodes.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => {
        const nodeLevel = d.data.level;
        if (nodeLevel < currentLevel) {
          return d.data.isSorted ? "var(--sorted-color)" : "var(--processing-color)";
        } else if (nodeLevel === currentLevel) {
          return isMerging ? "var(--merging-color)" : "var(--current-color)";
        } else {
          return "var(--pending-color)";
        }
      })
      .attr("stroke", "var(--stroke-color)")
      .attr("stroke-width", 2)
      .attr("class", "floating");

    // Add array boxes
    const arrayBoxes = nodes.append("g")
      .attr("class", "array-box")
      .attr("transform", (d: any) => `translate(0, 25)`);

    arrayBoxes.selectAll("rect")
      .data((d: any) => d.data.array.map((value: number, index: number) => ({
        value,
        index,
        x: index * 25 - (d.data.array.length * 25) / 2,
        nodeLevel: d.data.level,
        isSorted: d.data.isSorted
      })))
      .enter()
      .append("rect")
      .attr("x", (d: any) => d.x)
      .attr("y", 0)
      .attr("width", 20)
      .attr("height", 20)
      .attr("rx", 3)
      .attr("fill", (d: any) => {
        const currentStep = steps[stepIndex];
        
        if (d.nodeLevel < currentLevel) {
          return d.isSorted ? "var(--sorted-element-color)" : "var(--processing-element-color)";
        } else if (d.nodeLevel === currentLevel) {
          if (currentStep.state.comparing.includes(d.value)) {
            return "var(--comparing-color)";
          }
          if (currentStep.state.merged_array.includes(d.value)) {
            return "var(--merged-color)";
          }
          return "var(--current-element-color)";
        } else {
          return "var(--pending-element-color)";
        }
      })
      .attr("stroke", "var(--stroke-color)")
      .attr("stroke-width", 1)
      .attr("class", "floating draggable")
      .call(d3.drag<any, any>()
        .on("start", function(event: any, d: any) {
          d3.select(this as any).raise();
        })
        .on("drag", function(event: any, d: any) {
          d3.select(this as any)
            .attr("x", event.x - 10)
            .attr("y", event.y - 10);
        })
        .on("end", function(event: any, d: any) {
          // Keep the new position
        }));

    // Add value labels
    arrayBoxes.selectAll("text")
      .data((d: any) => d.data.array.map((value: number, index: number) => ({
        value,
        index,
        x: index * 25 - (d.data.array.length * 25) / 2,
        nodeLevel: d.data.level,
        isSorted: d.data.isSorted
      })))
      .enter()
      .append("text")
      .attr("x", (d: any) => d.x + 10)
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "var(--text-color)")
      .text((d: any) => d.value);

    // Add level labels
    nodes.append("text")
      .attr("x", 0)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "var(--level-color)")
      .text((d: any) => `Level ${d.data.level}`)
      .attr("class", "draggable")
      .call(d3.drag<any, any>()
        .on("start", function(event: any, d: any) {
          d3.select(this as any).raise();
        })
        .on("drag", function(event: any, d: any) {
          d3.select(this as any)
            .attr("x", event.x)
            .attr("y", event.y);
        })
        .on("end", function(event: any, d: any) {
          // Keep the new position
        }));

    // Add merge arrows for current step
    if (isMerging && currentStep.state.left_array.length > 0 && currentStep.state.right_array.length > 0) {
      const mergeArrow = container.append("g")
        .attr("class", "merge-arrow");

      // Arrow from left array to merge array
      mergeArrow.append("path")
        .attr("d", "M 100 200 Q 200 100 100 150")
        .attr("fill", "none")
        .attr("stroke", "var(--merge-arrow-color)")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#arrowhead)");

      // Arrow from right array to merge array
      mergeArrow.append("path")
        .attr("d", "M 350 200 Q 250 100 350 150")
        .attr("fill", "none")
        .attr("stroke", "var(--merge-arrow-color)")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#arrowhead)");

      mergeArrow.append("text")
        .attr("x", 225)
        .attr("y", 120)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "var(--merge-arrow-color)")
        .text("MERGE");
    }

    // Add connection arrows from main array to left/right arrays
    if (currentStep.state.left_array.length > 0 || currentStep.state.right_array.length > 0) {
      const connectionArrows = container.append("g")
        .attr("class", "connection-arrows");

      if (currentStep.state.left_array.length > 0) {
        connectionArrows.append("path")
          .attr("d", "M 100 80 Q 50 140 100 200")
          .attr("fill", "none")
          .attr("stroke", "var(--processing-color)")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr("marker-end", "url(#small-arrowhead)");
      }

      if (currentStep.state.right_array.length > 0) {
        connectionArrows.append("path")
          .attr("d", "M 350 80 Q 400 140 350 200")
          .attr("fill", "none")
          .attr("stroke", "var(--processing-color)")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr("marker-end", "url(#small-arrowhead)");
      }
    }

    // Add arrowhead markers
    const defs = svg.append("defs");
    
    // Main arrowhead for merge arrows
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
      .attr("fill", "var(--merge-arrow-color)");

    // Small arrowhead for connection arrows
    defs.append("marker")
      .attr("id", "small-arrowhead")
      .attr("viewBox", "0 -3 6 6")
      .attr("refX", 3)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L6,0L0,3")
      .attr("fill", "var(--processing-color)");

    // Speak explanation with delay to prevent rapid calls
    setTimeout(() => {
      speak(steps[stepIndex].actions[explanationLevel]);
    }, 200);
  }, [stepIndex, explanationLevel, theme, resetKey]);

  const step = steps[stepIndex];

  return (
    <div className={`merge-sort-tree-outer ${theme}`}>
      {/* Header */}
      <div className="merge-sort-header">
        <h2 className="title">Merge Sort Tree Visualizer</h2>
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
            <button
              onClick={() => {
                setResetKey(prev => prev + 1);
                // The useEffect will handle the reset by re-rendering with original positions
              }}
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
            >
              🔄 Reset Layout
            </button>
          </div>

          {/* Step Slider */}
          <div className="step-slider-container">
            <label htmlFor="step-slider">Step: {stepIndex + 1} / {steps.length}</label>
            <input
              id="step-slider"
              type="range"
              min="0"
              max={steps.length - 1}
              value={stepIndex}
              onChange={(e) => setStepIndex(parseInt(e.target.value))}
              className="step-slider"
            />
          </div>

          {/* Tree Visualization */}
          <div className="visualization-container">
            <svg ref={svgRef} width={1000} height={600}></svg>
          </div>

          {/* State Display */}
          <div className="state-panel card">
            <h3>Merge Sort State (Step {stepIndex + 1})</h3>
            <p><strong>Current Level:</strong> {step.state.current_level}</p>
            <p><strong>Left Array:</strong> [{step.state.left_array.join(", ")}]</p>
            <p><strong>Right Array:</strong> [{step.state.right_array.join(", ")}]</p>
            <p><strong>Merged Array:</strong> [{step.state.merged_array.join(", ")}]</p>
            <p><strong>Merging:</strong> {step.state.merging ? "Yes 🔄" : "No ❌"}</p>
            <p><strong>Current Merge:</strong> {step.state.current_merge}</p>
            <p><strong>Current Array:</strong> [{step.state.array.join(", ")}]</p>
          </div>

          {/* Explanation */}
          <div className="explanation">
            <p>{step.actions[explanationLevel]}</p>
            <p className="extra-info">
              Level: {step.state.current_level} | Status: {step.state.current_merge} | 
              Merging: {step.state.merging ? "Yes" : "No"}
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
              <em> Merging:</em> {st.state.merging ? "Yes" : "No"}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default MergeSortTreeVisualizer;
