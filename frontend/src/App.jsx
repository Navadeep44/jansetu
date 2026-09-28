import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { RequireRole, RequireOfficial } from './components/layout/RequireRole'
import { Loading } from './components/ui'

// Route-level code splitting keeps the citizen app light on low-end phones.
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Results = lazy(() => import('./pages/citizen/Results'))
const Report = lazy(() => import('./pages/citizen/Report'))
const Track = lazy(() => import('./pages/citizen/Track'))
const Channels = lazy(() => import('./pages/citizen/Channels'))
const Officer = lazy(() => import('./pages/officer/Officer'))
const Dashboard = lazy(() => import('./pages/gov/Dashboard'))
const ClusterList = lazy(() => import('./pages/gov/Clusters').then((m) => ({ default: m.ClusterList })))
const ClusterDetail = lazy(() => import('./pages/gov/Clusters').then((m) => ({ default: m.ClusterDetail })))
const Priorities = lazy(() => import('./pages/gov/Priorities'))
const Projects = lazy(() => import('./pages/gov/Projects'))
const Ask = lazy(() => import('./pages/gov/Ask'))
const Brief = lazy(() => import('./pages/gov/Brief'))
const Impact = lazy(() => import('./pages/gov/Impact'))
const Brics = lazy(() => import('./pages/brics/Brics'))
const Trust = lazy(() => import('./pages/trust/Trust'))
const Audit = lazy(() => import('./pages/trust/Trust').then((m) => ({ default: m.Audit })))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))

export default function App() {
  return (
    <Suspense fallback={<div className="content"><Loading height={300} /></div>}>
      <Routes>
        <Route element={<Layout />}>
          {/* Public & Citizen Accessible Pages */}
          <Route index element={<Home />} />
          <Route path="report" element={<Report />} />
          <Route path="track" element={<Track />} />
          <Route path="track/:tid" element={<Track />} />
          <Route path="channels" element={<Channels />} />
          <Route path="results" element={<Results />} />
          <Route path="login" element={<Login />} />
          <Route path="brics" element={<Brics />} />
          <Route path="trust" element={<Trust />} />

          {/* Officer Scoped Routes with RBAC Guards */}
          <Route
            path="officer"
            element={
              <RequireRole roles={['field_officer', 'dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']}>
                <Officer />
              </RequireRole>
            }
          />
          <Route
            path="dashboard"
            element={
              <RequireRole roles={['district_officer', 'state_officer', 'admin', 'super_admin']}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="clusters"
            element={
              <RequireRole roles={['dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']}>
                <ClusterList />
              </RequireRole>
            }
          />
          <Route
            path="clusters/:id"
            element={
              <RequireRole roles={['dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']}>
                <ClusterDetail />
              </RequireRole>
            }
          />
          <Route
            path="priorities"
            element={
              <RequireRole roles={['district_officer', 'state_officer', 'admin', 'super_admin']}>
                <Priorities />
              </RequireRole>
            }
          />
          <Route
            path="projects"
            element={
              <RequireRole roles={['dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']}>
                <Projects />
              </RequireRole>
            }
          />
          <Route
            path="ask"
            element={
              <RequireRole roles={['district_officer', 'state_officer', 'admin', 'super_admin']}>
                <Ask />
              </RequireRole>
            }
          />
          <Route
            path="brief"
            element={
              <RequireRole roles={['state_officer', 'admin', 'super_admin']}>
                <Brief />
              </RequireRole>
            }
          />
          <Route
            path="impact"
            element={
              <RequireRole roles={['state_officer', 'admin', 'super_admin']}>
                <Impact />
              </RequireRole>
            }
          />
          <Route
            path="audit"
            element={
              <RequireRole roles={['super_admin', 'admin', 'state_officer']}>
                <Audit />
              </RequireRole>
            }
          />
          <Route
            path="admin/users"
            element={
              <RequireRole roles={['super_admin', 'admin']}>
                <UserManagement />
              </RequireRole>
            }
          />

          <Route path="*" element={<div className="empty">Page not found.</div>} />
        </Route>
      </Routes>
    </Suspense>
  )
}
