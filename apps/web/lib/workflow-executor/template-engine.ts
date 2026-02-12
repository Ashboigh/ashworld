/**
 * Template engine for variable interpolation
 * Supports {{variableName}} syntax with nested object access
 */

/**
 * Interpolate variables in a template string
 * @example interpolateTemplate("Hello {{name}}", { name: "World" }) => "Hello World"
 * @example interpolateTemplate("{{user.name}}", { user: { name: "John" } }) => "John"
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  if (!template) return "";

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(variables, trimmedPath);

    if (value === undefined || value === null) {
      return match; // Keep original if not found
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Get a nested value from an object using dot notation
 * @example getNestedValue({ user: { name: "John" } }, "user.name") => "John"
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract all variable names from a template
 * @example extractVariables("Hello {{name}}, {{greeting}}") => ["name", "greeting"]
 */
export function extractVariables(template: string): string[] {
  if (!template) return [];

  const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
  const variables = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      variables.add(match[1].trim());
    }
  }

  return Array.from(variables);
}

/**
 * Check if a template contains any variables
 */
export function hasVariables(template: string): boolean {
  return /\{\{[^}]+\}\}/.test(template);
}

/**
 * Evaluate a condition expression
 * Supports operators: equals, not_equals, contains, starts_with, ends_with,
 * greater_than, less_than, is_empty, is_not_empty, matches_regex
 */
export function evaluateCondition(
  leftValue: unknown,
  operator: string,
  rightValue: unknown
): boolean {
  const left = String(leftValue ?? "");
  const right = String(rightValue ?? "");

  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return left.toLowerCase().includes(right.toLowerCase());
    case "not_contains":
      return !left.toLowerCase().includes(right.toLowerCase());
    case "starts_with":
      return left.toLowerCase().startsWith(right.toLowerCase());
    case "ends_with":
      return left.toLowerCase().endsWith(right.toLowerCase());
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "greater_or_equal":
      return Number(left) >= Number(right);
    case "less_or_equal":
      return Number(left) <= Number(right);
    case "is_empty":
      return left === "" || left === "undefined" || left === "null";
    case "is_not_empty":
      return left !== "" && left !== "undefined" && left !== "null";
    case "matches_regex":
      try {
        return new RegExp(right).test(left);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
