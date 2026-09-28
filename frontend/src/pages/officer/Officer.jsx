import { useApp } from '../../context/AppContext'
import FieldOfficerView from './FieldOfficerView'
import DeptOfficerView from './DeptOfficerView'
import DistrictCollectorView from './DistrictCollectorView'
import StateOfficerView from './StateOfficerView'
import NationalAdminView from './NationalAdminView'
import { Loading } from '../../components/ui'

export default function Officer() {
  const { user } = useApp()

  if (!user) {
    return (
      <div className="content" style={{ padding: 40, textAlign: 'center' }}>
        <Loading height={200} label="Loading officer profile" />
      </div>
    )
  }

  const role = user.role || 'field_officer'

  if (role === 'field_officer' || role === 'officer') {
    return <FieldOfficerView />
  }

  if (role === 'dept_officer') {
    return <DeptOfficerView />
  }

  if (role === 'district_officer' || role === 'district') {
    return <DistrictCollectorView />
  }

  if (role === 'state_officer') {
    return <StateOfficerView />
  }

  if (role === 'admin' || role === 'super_admin' || role === 'national') {
    return <NationalAdminView />
  }

  // Fallback to Field Officer View
  return <FieldOfficerView />
}
