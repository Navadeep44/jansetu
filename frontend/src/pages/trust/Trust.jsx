import { CheckCircle2, ExternalLink } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, Loading, PageHead } from '../../components/ui'
import { date } from '../../lib/format'

const DPG = [
  ['1. SDG relevance', 'SDG 6 water & sanitation, 7 energy, 9 infrastructure, 3 health, 4 education, 10 inequality, 11 cities, 16 accountable institutions.'],
  ['2. Open licensing', 'Code Apache-2.0; documentation CC-BY-4.0; demo data CC-BY-4.0.'],
  ['3. Clear ownership', 'Public repository with GOVERNANCE.md, maintainers list and contribution guide.'],
  ['4. Platform independence', 'Any OpenAI-compatible, Anthropic or Gemini LLM, or none (offline rules); Bhashini or Whisper for speech; SQLite or PostgreSQL; Docker on any cloud or on-premises.'],
  ['5. Documentation', 'README, architecture, deployment, API (OpenAPI at /docs), data dictionary, demo script.'],
  ['6. Non-PII data extraction', 'Aggregated CSV/JSON exports and Open311 feeds contain no personal data; BRICS exchange is aggregate-only.'],
  ['7. Privacy & applicable laws', 'PII redaction before analytics, one-way hashed identifiers, consent notice, right to erasure, data localisation via federated nodes (DPDP, LGPD, POPIA, PIPL, 152-FZ).'],
  ['8. Open standards', 'Open311 GeoReport v2, OpenAPI 3, GeoJSON-ready coordinates, ISO 3166, SDG taxonomy, SDMX-style indicators, OCDS-ready project records.'],
  ['9. Do no harm', 'Content moderation, urgent-safety escalation, anonymous reporting, anti-harassment filters, coordinated-campaign detection, human-in-the-loop, full audit log.'],
]

export function Audit() {
  const { data, loading } = useAsync(() => api.auditLog(), [])
  return (
    <div className="stack-md">
      <PageHead title="Decision log" eyebrow="Official workspace">Every decision by an official, with who and why.</PageHead>
      <Card>
        {loading ? <Loading /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>When</th><th>Role</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
            <tbody>{data.map((a) => (
              <tr key={a.id}><td className="xs">{date(a.at)}</td><td><Badge>{a.actor_role}</Badge></td><td>{a.action.replace(/_/g, ' ')}</td>
                <td className="mono xs">{a.entity} {a.entity_id}</td><td className="xs" style={{ maxWidth: 420 }}>{a.detail?.reason || a.detail?.note || JSON.stringify(a.detail).slice(0, 160)}</td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}

export default function Trust() {
  const { meta } = useApp()
  const cap = meta?.capabilities || {}
  return (
    <div className="stack-md">
      <PageHead title="Privacy & open standards" eyebrow="Open to everyone">How we keep data safe, and why any country can use JanSetu for free.</PageHead>
      <div className="grid g-main">
        <Card title="DPG standard: 9 indicators">
          <div className="stack">
            {DPG.map(([t, d]) => (
              <div key={t} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <CheckCircle2 size={20} color="#15803d" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                <div><strong>{t}</strong><div className="small muted">{d}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack-md">
          <Card title="This node's configuration">
            <dl className="kv">
              <dt>Language AI</dt><dd>{cap.llm_provider || 'offline rules'}</dd>
              <dt>Bhashini</dt><dd>{cap.bhashini ? 'connected' : 'not configured'}</dd>
              <dt>Speech-to-text</dt><dd>{cap.asr === 'none' ? 'browser on-device + human queue' : cap.asr}</dd>
              <dt>WhatsApp</dt><dd>{cap.whatsapp ? 'connected' : 'simulator'}</dd>
              <dt>Telegram</dt><dd>{cap.telegram ? 'connected' : 'simulator'}</dd>
              <dt>IVR / SMS</dt><dd>{cap.ivr ? 'connected' : 'simulator'}</dd>
              <dt>k-anonymity</dt><dd className="mono">k = {cap.k_anonymity}</dd>
              <dt>Differential privacy</dt><dd className="mono">{cap.dp_epsilon ? `ε = ${cap.dp_epsilon}` : 'off'}</dd>
            </dl>
          </Card>
          <Card title="Open APIs">
            <div className="stack small">
              <a href="/docs" target="_blank" rel="noreferrer" className="row">OpenAPI / Swagger docs <ExternalLink size={14} aria-hidden="true" /></a>
              <a href="/open311/v2/services.json" target="_blank" rel="noreferrer" className="row">Open311 GeoReport v2: services.json <ExternalLink size={14} aria-hidden="true" /></a>
              <a href="/open311/v2/requests.json?service_code=water" target="_blank" rel="noreferrer" className="row">Open311: requests.json <ExternalLink size={14} aria-hidden="true" /></a>
              <a href="/api/brics/exchange" target="_blank" rel="noreferrer" className="row">BRICS aggregate exchange <ExternalLink size={14} aria-hidden="true" /></a>
              <span className="help">Import from existing portals: <span className="mono">POST /api/connectors/csv</span> (e.g. SP156 / 1746 / CPGRAMS exports) and <span className="mono">POST /api/connectors/open311/pull</span>.</span>
            </div>
          </Card>
          <Card title="Responsible AI">
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Low-confidence output goes to humans; the AI never rejects a citizen.</li>
              <li>Every score is explainable (drivers, formula, citizen evidence).</li>
              <li>Weights are policy choices, visible and adjustable.</li>
              <li>Original language and audio are kept next to translations.</li>
              <li>Per-language accuracy is published and audited (see docs/RESPONSIBLE_AI.md).</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
