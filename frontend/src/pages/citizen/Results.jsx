import { useMemo, useState } from 'react'
import { ArrowDown, CheckCircle2, Hammer, Megaphone, MessageCircle, RotateCcw, ThumbsUp, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useAsync } from '../../lib/useAsync'
import { useT } from '../../i18n'
import { CitizenStyles } from '../../components/citizen/VoiceInput'
import { Loading, PageHead, SectorTag, Stat, StatusBadge } from '../../components/ui'
import { STATES, date, fmt, money } from '../../lib/format'

const GROUPS = [
  { status: 'completed', title: 'Done ({n})', tone: 'green', Icon: CheckCircle2 },
  { status: 'in_progress', title: 'Work started ({n})', tone: 'blue', Icon: Hammer },
  { status: 'approved', title: 'Approved ({n})', tone: 'blue', Icon: ThumbsUp },
]

// Numbers in words, for people who find big numbers hard to read.
function inWords(n, t) {
  if (n === null || n === undefined) return ''
  if (n >= 1e7) return t('about {n} crore', { n: Math.round(n / 1e7) })
  if (n >= 1e5) return t('about {n} lakh', { n: Math.round(n / 1e5) })
  if (n >= 1000) return t('about {n} thousand', { n: Math.round(n / 1000) })
  return ''
}

export default function Results() {
  const t = useT()
  const [st, setSt] = useState('all')
  const { data, loading } = useAsync(() => api.board(st), [st])
  const items = useMemo(() => data?.items || [], [data])
  const count = (s) => items.filter((i) => i.status === s).length
  const voices = items.reduce((a, i) => a + (i.citizen_voices || 0), 0)

  const tiles = data ? [
    { label: 'Reports', value: data.requests, Icon: MessageCircle, tone: 'blue', note: 'people wrote or called' },
    { label: 'Works done', value: count('completed'), Icon: CheckCircle2, tone: 'green', note: 'finished by government' },
    { label: 'Fixes people confirmed', value: data.verified_fixed, Icon: ThumbsUp, tone: 'green', note: 'people said: yes, fixed' },
    { label: 'Said “not fixed”', value: data.reopened, Icon: RotateCcw, tone: 'red', note: 'opened again' },
  ] : [
    { label: 'Families heard', value: voices, Icon: Users, tone: 'blue', note: 'asked for these works' },
    { label: 'Works done', value: count('completed'), Icon: CheckCircle2, tone: 'green', note: 'finished by government' },
    { label: 'Work started', value: count('in_progress'), Icon: Hammer, tone: 'blue', note: 'being built now' },
    { label: 'Approved', value: count('approved'), Icon: ThumbsUp, tone: 'amber', note: 'money given, work next' },
  ]

  return (
    <div className="stack-md">
      <CitizenStyles />
      <PageHead title="You asked, we did" eyebrow="Open to everyone" icon={Megaphone}
        steps={['Pick your state', 'See what people asked', 'See what was done']}>
        What people asked for, and what the government did.
      </PageHead>
      <div className="cz-chips" role="group" aria-label={t('State')}>
        {['all', ...STATES].map((s) => (
          <button key={s} type="button" className={`btn ${st === s ? 'btn-primary' : ''}`} aria-pressed={st === s} onClick={() => setSt(s)}>
            {s === 'all' ? t('All India') : t(s)}
          </button>
        ))}
      </div>
      {loading || !data ? <Loading height={300} /> : (
        <>
          <div className="cz-stats">
            {tiles.map((x) => (
              <Stat key={x.label} label={x.label} icon={x.Icon} tone={x.tone}
                value={<span>{fmt(x.value)}{inWords(x.value, t) && <span className="cz-words" style={{ display: 'block', fontWeight: 500 }}>{inWords(x.value, t)}</span>}</span>}
                note={x.note} />
            ))}
          </div>
          {items.length === 0 && <div className="empty">{t('No finished or started works here yet.')}</div>}
          {GROUPS.map((g) => {
            const list = items.filter((i) => i.status === g.status)
            if (!list.length) return null
            return (
              <section key={g.status} className="stack">
                <h2 className="section-title row"><span className={`icon-tile tone-${g.tone}`}><g.Icon size={18} aria-hidden="true" /></span>{t(g.title, { n: list.length })}</h2>
                <div className="grid g-3">
                  {list.map((p) => (
                    <article key={p.id} className={`card stack tile-${g.tone}`} style={{ gap: 10 }}>
                      <div className="row-between"><SectorTag sector={p.sector} short /><StatusBadge status={p.status} /></div>
                      <div className="cz-said">
                        <span className="icon-tile tone-violet" style={{ width: 40, height: 40 }}><Users size={18} aria-hidden="true" /></span>
                        <div><div className="cz-lab">{t('You asked')}</div>
                          <strong>{t('{n} families', { n: fmt(p.citizen_voices) })}</strong>
                          <div className="small muted">{p.area} · {t(p.district)}, {t(p.state)}</div></div>
                      </div>
                      <div className="cz-arrow" aria-hidden="true"><ArrowDown size={18} /></div>
                      <div className="cz-said">
                        <span className={`icon-tile tone-${g.tone}`} style={{ width: 40, height: 40 }}><g.Icon size={18} aria-hidden="true" /></span>
                        <div><div className="cz-lab">{t('We did')}</div>
                          <strong>{p.title}</strong>
                          <div className="xs muted">{p.scheme}</div></div>
                      </div>
                      <div className="row xs muted" style={{ gap: 8 }}>
                        <span>{t('{n} people benefit', { n: fmt(p.beneficiaries) })}</span>
                        <span>· {money(p.cost_local)}</span>
                        {p.completed_at && <span>· {t('Done on {d}', { d: date(p.completed_at) })}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
