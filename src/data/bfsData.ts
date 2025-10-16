export const bfsData = {
  name: "Breadth First Search (BFS)",
  input: {
    nodes: ["A", "B", "C", "D", "E"],
    edges: [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "D"],
      ["D", "E"],
    ],
    start_node: "A",
  },
  steps: [
    {
      step_number: 1,
      actions: [
        "Start at node A. Add neighbors B and C to the queue.",
        "Begin BFS from A. Queue updated with B and C.",
      ],
      state: { queue: ["B", "C"], visited: ["A"] },
      next_suggestion: "B",
    },
    {
      step_number: 2,
      actions: [
        "Visit node B. Add neighbor D to the queue.",
        "Node B processed. Queue now: C, D.",
      ],
      state: { queue: ["C", "D"], visited: ["A", "B"] },
      next_suggestion: "C",
    },
    {
      step_number: 3,
      actions: [
        "Visit node C. Neighbor D already in queue, skip.",
        "Process C. Queue unchanged: D.",
      ],
      state: { queue: ["D"], visited: ["A", "B", "C"] },
      next_suggestion: "D",
    },
    {
      step_number: 4,
      actions: [
        "Visit node D. Add neighbor E to the queue.",
        "Process D. Queue updated: E.",
      ],
      state: { queue: ["E"], visited: ["A", "B", "C", "D"] },
      next_suggestion: "E",
    },
    {
      step_number: 5,
      actions: [
        "Visit node E. Queue empty, BFS complete.",
        "Process E. BFS finished.",
      ],
      state: { queue: [], visited: ["A", "B", "C", "D", "E"] },
      next_suggestion: null,
    },
  ],
};
