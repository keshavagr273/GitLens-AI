export interface SccResult {
  components: string[][];
  cycles: string[][];
  hasCycles: boolean;
}

export function findStronglyConnectedComponents(
  adjacencyList: Map<string, string[]>
): SccResult {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const stack: string[] = [];
  const components: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.set(v, true);

    const neighbors = adjacencyList.get(v) || [];
    for (const w of neighbors) {
      if (!indices.has(w)) {
        // Successor w has not yet been visited; recurse
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.get(w)) {
        // Successor w is in stack and hence in the current SCC
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowlinks.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.set(w, false);
        component.push(w);
      } while (w !== v);

      components.push(component);
    }
  }

  for (const node of adjacencyList.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  // A component with > 1 node (or a self-loop) represents a circular dependency cycle
  const cycles = components.filter((comp) => {
    if (comp.length > 1) return true;
    const singleNode = comp[0];
    const neighbors = adjacencyList.get(singleNode) || [];
    return neighbors.includes(singleNode);
  });

  return {
    components,
    cycles,
    hasCycles: cycles.length > 0,
  };
}
