import type React from "react";

export { StartNode } from "./start-node";
export { EndNode } from "./end-node";
export { ConditionNode } from "./condition-node";
export { SwitchNode } from "./switch-node";
export { ButtonsNode } from "./buttons-node";
export { IntentClassifierNode } from "./intent-classifier-node";
export {
  AIResponseNode,
  KnowledgeLookupNode,
  SendMessageNode,
  CaptureInputNode,
  SetVariableNode,
  APICallNode,
  HumanHandoffNode,
} from "./action-node";

import { StartNode } from "./start-node";
import { EndNode } from "./end-node";
import { ConditionNode } from "./condition-node";
import { SwitchNode } from "./switch-node";
import { ButtonsNode } from "./buttons-node";
import { IntentClassifierNode } from "./intent-classifier-node";
import {
  AIResponseNode,
  KnowledgeLookupNode,
  SendMessageNode,
  CaptureInputNode,
  SetVariableNode,
  APICallNode,
  HumanHandoffNode,
} from "./action-node";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, React.ComponentType<any>> = {
  start: StartNode,
  end: EndNode,
  condition: ConditionNode,
  switch: SwitchNode,
  buttons: ButtonsNode,
  intent_classifier: IntentClassifierNode,
  ai_response: AIResponseNode,
  knowledge_lookup: KnowledgeLookupNode,
  send_message: SendMessageNode,
  capture_input: CaptureInputNode,
  set_variable: SetVariableNode,
  api_call: APICallNode,
  human_handoff: HumanHandoffNode,
};
