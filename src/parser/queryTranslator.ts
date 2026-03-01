export interface ParsedStep {
  method: string;
  args: string[];
}

export interface ExecutableAction {
  action: string;
  target?: string;
  search?: string;
  limit?: number;
}

export function parseQueryString(query: string): ParsedStep[] {
  const steps: ParsedStep[] = [];


  const methodRegex = /([a-zA-Z_]\w*)\s*\(([^)]*)\)/g;

  let match;
  while ((match = methodRegex.exec(query)) !== null) {
    const method = match[1];
    const argsString = match[2];

    const args = argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0)
      .map((arg) => {
        if (
          (arg.startsWith('"') && arg.endsWith('"')) ||
          (arg.startsWith("'") && arg.endsWith("'"))
        ) {
          return arg.slice(1, -1);
        }
        return arg;
      });

    steps.push({ method, args });
  }

  return steps;
}

export function translateQuery(query: string): ExecutableAction[] {
  const steps = parseQueryString(query);

  if (steps.length === 0) {
    throw new Error("Invalid or empty query");
  }

  const actions: ExecutableAction[] = [];
  let currentTarget: string | undefined;
  let currentSearch: string | undefined;

  for (const step of steps) {
    switch (step.method) {
      case "target":
        currentTarget = step.args[0];
        break;
      case "search":
        currentSearch = step.args[0];
        break;
      case "blast_radius":
      case "depends_on":
      case "history":
        let limit: number | undefined;
        if (step.method === "history" && step.args[0]) {
          const parsed = parseInt(step.args[0], 10);
          if (!isNaN(parsed)) limit = parsed;
        }

        if (currentTarget) {
          actions.push({
            action: step.method,
            target: currentTarget,
            ...(limit !== undefined ? { limit } : {}),
          });
        } else if (currentSearch) {
          actions.push({
            action: step.method,
            search: currentSearch,
            ...(limit !== undefined ? { limit } : {}),
          });
        } else {
          actions.push({
            action: step.method,
            ...(step.args[0] && step.method !== "history"
              ? { target: step.args[0] }
              : {}),
            ...(limit !== undefined ? { limit } : {}),
          });
        }
        break;
      default:
        throw new Error(`Unknown method in query: ${step.method}`);
    }
  }

  return actions;
}
