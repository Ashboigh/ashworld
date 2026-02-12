# API Documentation (v1)

## Overview
- **Base path:** `/api/v1`
- **Style:** RESTful resources with predictable CRUD semantics.
- **Pagination:** Cursor-based (see query parameters below) plus standard `limit`/`page_size` headers.
- **Error format:** All errors return the `ApiError` envelope with `status`, `code`, `message`, and optional `details` array describing field-level or business-rule failures.

## Authentication & Rate Limiting
| Scheme | Description |
| --- | --- |
| `X-API-Key` header | Primary API key scheme for service-to-service calls. Scopes are tied to the key and must be declared in the onboarding portal. |
| `Authorization: Bearer <token>` | OAuth/JWT token issued via user login. Use for user-context actions (e.g., resolving conversations). |

- **Rate limits:** Defined per API key with a default of 120 requests/minute and burstable to 300 requests/minute; clients receive `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
- **Scopes:** At minimum, the following scopes apply: `chatbots:read`, `chatbots:write`, `conversations:read`, `conversations:write`, `analytics:read`, `webhooks:manage`. API keys can optionally limit to subsets for least privilege.

## Pagination Pattern
- Query parameters:
  - `limit` (integer): number of records to return (default: 20, max: 100).
  - `cursor` (string): opaque cursor returned from prior response.
- Responses include `meta.nextCursor` when more data exists and a `meta.count` of returned items.
- Example:
  ```json
  {
    "data": [...],
    "meta": {
      "count": 20,
      "nextCursor": "Z3Vlc3QtMTIz"
    }
  }
  ```

## Common Error Envelope
```json
{
  "status": 400,
  "code": "validation_error",
  "message": "One or more fields are invalid.",
  "details": [
    { "field": "name", "issue": "required" }
  ]
}
```

## Resources
### Chatbots
| Endpoint | Description |
| --- | --- |
| `GET /chatbots` | List workspaces' chatbots. Supports pagination and filtering by `status` or `workspace_id`. |
| `POST /chatbots` | Create a new chatbot. Body includes `name`, `workspace_id`, and configuration payloads. |
| `GET /chatbots/{chatbotId}` | Retrieve configuration, status, and widget settings. |
| `PATCH /chatbots/{chatbotId}` | Update persona, model, behavior, or widget customization. |
| `DELETE /chatbots/{chatbotId}` | Decommission a chatbot. |
| `POST /chatbots/{chatbotId}/publish` | Activate a new version and refresh deployments. |

### Conversations
| Endpoint | Description |
| --- | --- |
| `GET /conversations` | Inbox-style list (filter by status/channel/workspace). Returns `assigned_to`, `priority`, tags, and `first_response_time_ms`. |
| `GET /conversations/{conversationId}` | Full history, metadata, and assignment data. |
| `PATCH /conversations/{conversationId}` | Update status, add tags, or reassign. |

### Messages
| Endpoint | Description |
| --- | --- |
| `POST /conversations/{conversationId}/messages` | Append a message from an agent or bot. Body: `role`, `content`, optional `citations` and `feedback_rating`. |

### Knowledge Bases
| Endpoint | Description |
| --- | --- |
| `GET /knowledge-bases` | List KBs with sync status. |
| `POST /knowledge-bases` | Create KB entry with metadata, documents, or URLs. |
| `GET /knowledge-bases/{kbId}` | Fetch KB metadata. |
| `PATCH /knowledge-bases/{kbId}` | Update config, sources, or embeddings. |
| `DELETE /knowledge-bases/{kbId}` | Remove KB. |
| `POST /knowledge-bases/{kbId}/upload` | Push documents/files. |
| `POST /knowledge-bases/{kbId}/search` | Query KB. Body: `query`, `filter`, `topK`, `cursor`. |

### Workflows & Nodes
| Endpoint | Description |
| --- | --- |
| `GET /workflows` | List workflows with latest status. |
| `POST /workflows` | Create or import workflow definitions (nodes, edges). |
| `GET /workflows/{workflowId}` | Get structure, execution history, and variables. |
| `PATCH /workflows/{workflowId}` | Update nodes, conditions, or publish settings. |
| `DELETE /workflows/{workflowId}` | Delete workflow. |
| `POST /workflows/{workflowId}/publish` | Push workflow to runtime/execution engine. |

### Webhooks
| Endpoint | Description |
| --- | --- |
| `GET /webhooks` | List registered webhook endpoints. |
| `POST /webhooks` | Register a new webhook (event list, secret). |
| `GET /webhooks/{webhookId}` | View configuration and deliveries. |
| `PATCH /webhooks/{webhookId}` | Update URL, events, or retry policy. |
| `DELETE /webhooks/{webhookId}` | Remove webhook. |
| `POST /webhooks/{webhookId}/test` | Send a signed test payload. |

### Analytics
| Endpoint | Description |
| --- | --- |
| `GET /analytics/metrics` | Retrieve aggregated metrics (conversations, messages, satisfaction) by query filters (chatbot, channel, date). Supports `from`, `to`, `chatbot_id`, `channel`, and `variant`. |

## SDKs
### JavaScript / TypeScript
```ts
import { ApiClient } from "@repo/sdk";

const client = new ApiClient({
  apiKey: process.env.CHATBOT_API_KEY,
  baseUrl: process.env.API_BASE_URL,
});

await client.chatbots.create({
  name: "Support Hero",
  workspaceId: "ws_123",
});
```
- Supports `get`, `list`, `create`, `update`, and streaming message helpers.
- Use `client.auth.setBearer(token)` for user-context operations.

### Python
```py
from chatbot_sdk import ApiClient

client = ApiClient(api_key="x-key", base_url="https://api.example.com")
convo = client.conversations.create(chatbot_id="cb_456")
```
- Mirrors HTTP endpoints; includes helpers for cursor pagination and error handling via `ApiError` class.

## Documentation Site Organization
1. **Getting Started** – Quickstart steps for API access, authentication, and SDK initialization.
2. **Authentication** – Details on both API key and OAuth flows, including scope tables and rate limit headers.
3. **API Reference** – Auto-generated from `docs/openapi/api-v1.yml` with specs for every endpoint.
4. **Webhooks** – Registration, signing secrets, retry logic, and sample payloads.
5. **SDKs & Examples** – Download/install links plus sample integrations (JS, Python, serverless).
6. **Change Log** – Document API changes between versions for stable migration.

Manual navigation should render the OpenAPI schema for easy testing (Swagger UI or Redoc) and include code snippets from the SDK section.
EOF
