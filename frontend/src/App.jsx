import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout, { RequireOfficial } from './components/layout/Layout'
import { Loading } from './components/ui'

// Route-level code splitting keeps the citizen app light on low-end phones.
const Home = lazy(() => import('./pages/Home'))
const Landing = lazy(() => import('./pages/Landing'))
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
const Trust = lazy(() => import('./pages/trust/Trust'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const Audit = lazy(() => import('./pages/trust/Trust').then((m) => ({ default: m.Audit })))

export default function App() {
  return (
    <Suspense fallback={<div className="content"><Loading height={300} /></div>}>
      <Routes>
        <Route index element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="overview" element={<Home />} />
          <Route path="report" element={<Report />} />
          <Route path="track" element={<Track />} />
          <Route path="track/:tid" element={<Track />} />
          <Route path="channels" element={<Channels />} />
          <Route path="results" element={<Results />} />
          <Route path="login" element={<Login />} />
          <Route path="officer" element={<RequireOfficial page="officer"><Officer /></RequireOfficial>} />
          <Route path="dashboard" element={<RequireOfficial page="dashboard"><Dashboard /></RequireOfficial>} />
          <Route path="clusters" element={<RequireOfficial page="clusters"><ClusterList /></RequireOfficial>} />
          <Route path="clusters/:id" element={<RequireOfficial page="clusters"><ClusterDetail /></RequireOfficial>} />
          <Route path="priorities" element={<RequireOfficial page="priorities"><Priorities /></RequireOfficial>} />
          <Route path="projects" element={<RequireOfficial page="projects"><Projects /></RequireOfficial>} />
          <Route path="ask" element={<RequireOfficial page="ask"><Ask /></RequireOfficial>} />
          <Route path="brief" element={<RequireOfficial page="brief"><Brief /></RequireOfficial>} />
          <Route path="impact" element={<RequireOfficial page="impact"><Impact /></RequireOfficial>} />
          <Route path="trust" element={<Trust />} />
          <Route path="audit" element={<RequireOfficial page="audit"><Audit /></RequireOfficial>} />
          <Route path="admin/users" element={<RequireOfficial page="users"><UserManagement /></RequireOfficial>} />
          <Route path="*" element={<div className="empty">Page not found.</div>} />
        </Route>
      </Routes>
    </Suspense>
  )
}
