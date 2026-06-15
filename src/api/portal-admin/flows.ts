import { http } from './http'
import type {
  FlowsListResponse,
  FlowTemplatesResponse,
  CampaignFlow,
  FlowSimulation,
  FlowSimulationRequest
} from './types'

/**
 * Portal admin · Flows view API.
 *
 * Mirrors the legacy `kixLoadFlows()` fetcher in
 * `kix-platform/landing/portal.html` (~line 8750), which calls
 *   `fetch(KIX_FLOWS_API + '?brand=' + encodeURIComponent(KIX_BRAND_ID))`
 * with `KIX_FLOWS_API = '/api/v1/portal-admin/flows'` (line 8588).
 *
 * Unlike `/portal-admin/campaigns` (which infers brand from the JWT),
 * the flows endpoint takes an explicit `brand` query param — the v2
 * caller resolves it via `resolveBrandId()` the same way `Games.vue` does.
 *
 * @see src/views/kix/Flows.vue
 */
export const listFlows = (brand: string) =>
  http.get<FlowsListResponse>('/api/v1/portal-admin/flows', {
    params: { brand }
  })

// ---------------------------------------------------------------------------
// 4-step creation wizard (deferred feature, now shipped)
// ---------------------------------------------------------------------------

/** GET /flows/templates — the 6 starter templates (campaign_flows.py ~237). */
export const listFlowTemplates = () =>
  http.get<FlowTemplatesResponse>('/api/v1/portal-admin/flows/templates')

/** POST /flows?brand= — create a flow from a template (or blank when
 *  template_id is omitted). Returns the full flow with steps + default dates. */
export const createFlow = (brand: string, body: { template_id?: string }) =>
  http.post<CampaignFlow>('/api/v1/portal-admin/flows', body, { params: { brand } })

/** PUT /flows/{id}?brand= — update the editable fields (name + window). */
export const updateFlow = (
  flowId: string,
  brand: string,
  body: { name?: string; start_date?: string; end_date?: string }
) =>
  http.put<CampaignFlow>(`/api/v1/portal-admin/flows/${encodeURIComponent(flowId)}`, body, {
    params: { brand }
  })

/** POST /flows/{id}/simulate?brand= — backend-computed funnel + costs. */
export const simulateFlow = (flowId: string, brand: string, body: FlowSimulationRequest) =>
  http.post<FlowSimulation>(
    `/api/v1/portal-admin/flows/${encodeURIComponent(flowId)}/simulate`,
    body,
    { params: { brand } }
  )

/** POST /flows/{id}/publish?brand= — draft/paused → published. */
export const publishFlow = (flowId: string, brand: string) =>
  http.post<CampaignFlow>(
    `/api/v1/portal-admin/flows/${encodeURIComponent(flowId)}/publish`,
    null,
    {
      params: { brand }
    }
  )
