const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PHP_SCRIPT = path.resolve(__dirname, "export-amalena-flow.php");
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../apps/web/lib/workflow/templates/amalena-plugin.ts"
);

const NODE_TYPE_MAP = {
  start: "start",
  menu: "buttons",
  article: "send_message",
  system: "send_message",
  form: "capture_input",
  rating: "capture_input",
  queue: "human_handoff",
  escalate: "human_handoff",
  product_lookup: "api_call",
  auth_gate: "condition",
};

function mapNodeType(type) {
  return NODE_TYPE_MAP[type] || "send_message";
}

function buildConfig(node) {
  const mappedType = mapNodeType(node.type);
  const baseMessage = node.message || node.follow_up || "";

  switch (mappedType) {
    case "buttons":
      return {
        message: baseMessage || "Please choose an option.",
        buttons: (node.buttons || []).map((btn) => ({
          label: btn.label || btn.text || "Option",
          value: btn.next || btn.value || btn.label,
        })),
      };
    case "capture_input": {
      const field = (node.fields || [])[0];
      let validation = "none";
      if (field?.type === "email") validation = "email";
      if (field?.type === "tel") validation = "phone";

      return {
        prompt: baseMessage || field?.label || "Please provide the requested information.",
        variable: field?.name || node.variable || "input",
        validation,
        errorMessage: field?.errorMessage || "Please provide a valid value.",
        maxRetries: node.maxRetries ?? 3,
      };
    }
    case "human_handoff":
      return {
        message: baseMessage || node.queue_message || "Connecting you to a support agent.",
        department: node.department || node.category || "Support",
        priority: node.priority || "normal",
      };
    case "condition":
      return {
        variable: node.variable || "user.isLoggedIn",
        operator: node.operator || "equals",
        value:
          node.value ??
          (node.next_logged_in ? true : node.next_guest ? false : null) ??
          "",
      };
    case "api_call":
      return {
        message: baseMessage,
        method: node.method || "GET",
        url: node.query_field
          ? `/api/shop/search?query=${node.query_field}`
          : node.url || "/api/products/search",
        outputVariable: node.outputVariable || "apiResults",
        config: node,
      };
    default:
      return {
        message: baseMessage,
      };
  }
}

function buildEdges(nodes) {
  const edges = [];
  const existingTargets = new Set(Object.keys(nodes));

  function pushEdge(source, target, opts = {}) {
    if (!target || !existingTargets.has(target)) {
      return;
    }
    edges.push({
      edgeId: `e-${source}-${target}-${edges.length}`,
      source,
      target,
      label: opts.label,
      sourceHandle: opts.handle,
    });
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    const buttons = node.buttons || [];
    buttons.forEach((btn, index) => {
      pushEdge(nodeId, btn.next, {
        label: btn.label || `Option ${index + 1}`,
        handle: btn.next ? btn.next.replace(/[^a-z0-9]+/gi, "_") : undefined,
      });
    });

    if (node.next) {
      pushEdge(nodeId, node.next, { label: "Next" });
    }
    if (node.next_guest) {
      pushEdge(nodeId, node.next_guest, {
        label: "Guest",
        handle: "guest",
      });
    }
    if (node.next_logged_in) {
      pushEdge(nodeId, node.next_logged_in, {
        label: "Logged in",
        handle: "logged_in",
      });
    }
  }

  return edges;
}

function extractVariables(nodes) {
  const set = new Set();
  Object.values(nodes).forEach((node) => {
    if (node.fields) {
      node.fields.forEach((field) => {
        if (field.name) set.add(field.name);
      });
    }
    if (node.variable) {
      set.add(node.variable);
    }
    if (node.outputVariable) {
      set.add(node.outputVariable);
    }
  });
  return Array.from(set).map((name) => ({
    name,
    type: "string",
  }));
}

function serializeTemplate(template) {
  return `import type { WorkflowTemplate } from "./amalena";

export const AMALENA_PLUGIN_TEMPLATE: WorkflowTemplate = ${JSON.stringify(
    template,
    null,
    2
  )};

export function getAmalenaPluginTemplate(): WorkflowTemplate {
  return AMALENA_PLUGIN_TEMPLATE;
}
`;
}

function main() {
  if (!fs.existsSync(PHP_SCRIPT)) {
    throw new Error(`Cannot find PHP exporter at ${PHP_SCRIPT}`);
  }

  const phpCommand = `php "${PHP_SCRIPT}"`;
  const raw = execSync(phpCommand, {
    encoding: "utf-8",
    env: {
      ...process.env,
      AMALENA_PLUGIN_PATH: "C:\\\\xampp\\\\htdocs\\\\customer_report\\\\wordpress-plugin",
    },
  });

  const flow = JSON.parse(raw);
  const nodesMap = flow.nodes || {};
  const nodeEntries = Object.entries(nodesMap);
  const nodes = nodeEntries.map(([nodeId, node], index) => ({
    nodeId,
    type: mapNodeType(node.type),
    positionX: 180 + (index % 4) * 220,
    positionY: 80 + Math.floor(index / 4) * 140,
    config: buildConfig(node),
  }));

  const edges = buildEdges(nodesMap);
  const variables = extractVariables(nodesMap);

  const template = {
    name: flow.name || "Amalena Support Flow",
    description: flow.settings?.welcome_message || "Amalena default workflow",
    triggerType: "conversation_start",
    isDefault: true,
    nodes,
    edges,
    variables,
  };

  fs.writeFileSync(OUTPUT_PATH, serializeTemplate(template), "utf-8");
  console.log(`Generated template at ${OUTPUT_PATH}`);
}

main();
