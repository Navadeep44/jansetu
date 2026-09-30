// Which level of government is looking, and which area they cover. Used by the official pages
// (Dashboard, Projects, Priorities, Ask, Brief, Impact, Decision log) to show only the right place.
import { createElement } from 'react'
import { MapPin } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'

// 'nation' (admin, super admin) · 'state' · 'district' · 'dept' (department / field staff)
export function levelOf(role) {
  if (role === 'district_officer') return 'district'
  if (role === 'state_officer') return 'state'
  if (role === 'dept_officer' || role === 'field_officer') return 'dept'
  return 'nation'
}

export function useLevel() {
  const app = useApp()
  const { role, user, stateParam, roleInfo } = app
  const level = levelOf(role)
  const scoped = level !== 'nation'
  return {
    ...app,
    level,
    scoped,
    // state is fixed for everyone except national roles (who pick it in the workspace bar)
    state: stateParam,
    // district is fixed for Collectors and department officers
    district: level === 'district' || level === 'dept' ? user?.district || undefined : undefined,
    ri: roleInfo,
  }
}

// "Adilabad" / "Telangana" / "All India" in the chosen language, for a page's area line.
export function placeName(t, { state, district }) {
  if (district) return t(district)
  if (state) return t(state)
  return t('All India')
}

// Small line under the page header: "Showing: Adilabad, Telangana"
export function AreaLine({ place }) {
  const t = useT()
  return createElement('div', { className: 'row small', style: { gap: 6, color: '#334155', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 12px', width: 'fit-content', fontWeight: 600, flexWrap: 'nowrap' } },
    createElement(MapPin, { size: 14, 'aria-hidden': 'true' }),
    createElement('span', null, t('Showing: {p}', { p: place })))
}

export const userArea = (user, t) => jurisdictionText(user, t)
