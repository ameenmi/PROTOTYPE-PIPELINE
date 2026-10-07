import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import PipelinePage from './pages/PipelinePage'
import PortfolioPage from './pages/PortfolioPage'
import InitiativeDetailPage from './pages/InitiativeDetailPage'
import PlaceholderPage from './pages/PlaceholderPage'
import IdeasPage from './pages/IdeasPage'
import SubmitIdeaPage from './pages/SubmitIdeaPage'
import ApprovalsPage from './pages/ApprovalsPage'
import SolutionReviewPage from './pages/SolutionReviewPage'
import DesignPage from './pages/DesignPage'
import ReadyToBuildPage from './pages/ReadyToBuildPage'
import BuildPage from './pages/BuildPage'
import ShowTellPage from './pages/ShowTellPage'
import IpsafePage from './pages/IpsafePage'
import CopilotPage from './pages/CopilotPage'
import AdministrationPage from './pages/AdministrationPage'
import ReportsPage from './pages/ReportsPage'
import DocumentsPage from './pages/DocumentsPage'
import NotificationsPage from './pages/NotificationsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/initiatives/:ideaId" element={<InitiativeDetailPage />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/ideas/new" element={<SubmitIdeaPage />} />
        <Route path="/value-streams" element={<AdministrationPage />} />
        <Route path="/solution-teams" element={<AdministrationPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/solution-review" element={<SolutionReviewPage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/ready-to-build" element={<ReadyToBuildPage />} />
        <Route path="/build" element={<BuildPage />} />
        <Route path="/show-and-tell" element={<ShowTellPage />} />
        <Route path="/capability-demonstrators" element={<IpsafePage mode="cd" />} />
        <Route path="/solutions" element={<IpsafePage mode="solutions" />} />
        <Route path="/ipsafe" element={<IpsafePage mode="ipsafe" />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/administration" element={<AdministrationPage />} />
      </Route>
    </Routes>
  )
}
