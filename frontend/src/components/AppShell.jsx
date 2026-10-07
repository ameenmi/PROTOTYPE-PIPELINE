import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useRole } from '../role/RoleContext'

function NavIcon({ children }) {
  return (
    <svg
      className="nav-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const NAV_ICONS = {
  '/dashboard': (
    <NavIcon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" {...stroke} />
    </NavIcon>
  ),
  '/pipeline': (
    <NavIcon>
      <path d="M4 6h16M4 12h10M4 18h13" {...stroke} />
      <circle cx="18" cy="12" r="2" {...stroke} />
      <circle cx="20" cy="18" r="2" {...stroke} />
    </NavIcon>
  ),
  '/portfolio': (
    <NavIcon>
      <path d="M3 7h18v12H3z" {...stroke} />
      <path d="M8 7V5h8v2" {...stroke} />
    </NavIcon>
  ),
  '/ideas': (
    <NavIcon>
      <path
        d="M9 18h6M10 21h4M12 3a5 5 0 0 1 5 5c0 2-1 3.5-2.5 4.5-.9.6-1.5 1.4-1.5 2.5h-2c0-1.1-.6-1.9-1.5-2.5C8 11.5 7 10 7 8a5 5 0 0 1 5-5Z"
        {...stroke}
      />
    </NavIcon>
  ),
  '/value-streams': (
    <NavIcon>
      <path d="M4 6c4 0 4 4 8 4s4-4 8-4" {...stroke} />
      <path d="M4 12c4 0 4 4 8 4s4-4 8-4" {...stroke} />
      <path d="M4 18c4 0 4 4 8 4s4-4 8-4" {...stroke} />
    </NavIcon>
  ),
  '/solution-teams': (
    <NavIcon>
      <circle cx="9" cy="8" r="3" {...stroke} />
      <circle cx="17" cy="9" r="2.5" {...stroke} />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" {...stroke} />
      <path d="M14.5 19c.3-2 1.8-3.5 4-3.5 1.4 0 2.6.6 3.3 1.5" {...stroke} />
    </NavIcon>
  ),
  '/approvals': (
    <NavIcon>
      <path d="M9 12l2.2 2.2L16 9.5" {...stroke} />
      <circle cx="12" cy="12" r="9" {...stroke} />
    </NavIcon>
  ),
  '/solution-review': (
    <NavIcon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke} />
      <path d="M14 3v5h5M9 13h6M9 17h4" {...stroke} />
    </NavIcon>
  ),
  '/design': (
    <NavIcon>
      <path d="M12 20h9" {...stroke} />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" {...stroke} />
    </NavIcon>
  ),
  '/ready-to-build': (
    <NavIcon>
      <path d="M5 12h14" {...stroke} />
      <path d="M13 6l6 6-6 6" {...stroke} />
    </NavIcon>
  ),
  '/build': (
    <NavIcon>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-1.9-1.9z" {...stroke} />
    </NavIcon>
  ),
  '/show-and-tell': (
    <NavIcon>
      <rect x="3" y="4" width="18" height="12" rx="2" {...stroke} />
      <path d="M8 20h8M12 16v4" {...stroke} />
    </NavIcon>
  ),
  '/capability-demonstrators': (
    <NavIcon>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" {...stroke} />
      <path d="M12 12l8-4.5M12 12v9M12 12 4 7.5" {...stroke} />
    </NavIcon>
  ),
  '/solutions': (
    <NavIcon>
      <path d="M12 2l3 6h6l-5 4.5L18 20l-6-3.5L6 20l2-7.5L3 8h6z" {...stroke} />
    </NavIcon>
  ),
  '/ipsafe': (
    <NavIcon>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" {...stroke} />
      <path d="M9.5 12.2l1.8 1.8 3.4-3.6" {...stroke} />
    </NavIcon>
  ),
  '/documents': (
    <NavIcon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke} />
      <path d="M14 3v5h5M9 13h6M9 17h6" {...stroke} />
    </NavIcon>
  ),
  '/notifications': (
    <NavIcon>
      <path d="M6 16h12l-1.2-1.5V10a4.8 4.8 0 1 0-9.6 0v4.5z" {...stroke} />
      <path d="M10 19a2 2 0 0 0 4 0" {...stroke} />
    </NavIcon>
  ),
  '/copilot': (
    <NavIcon>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" {...stroke} />
      <circle cx="12" cy="12" r="4.5" {...stroke} />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" {...stroke} />
    </NavIcon>
  ),
  '/reports': (
    <NavIcon>
      <path d="M4 19V5M4 19h16" {...stroke} />
      <path d="M8 15v-4M12 15V8M16 15v-6" {...stroke} />
    </NavIcon>
  ),
  '/administration': (
    <NavIcon>
      <circle cx="12" cy="12" r="3" {...stroke} />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        {...stroke}
      />
    </NavIcon>
  ),
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['all'] },
      { to: '/pipeline', label: 'Pipeline', roles: ['all'] },
      { to: '/portfolio', label: 'Portfolio', roles: ['all'] },
    ],
  },
  {
    label: 'Intake',
    items: [{ to: '/ideas', label: 'Ideas', roles: ['all'] }],
  },
  {
    label: 'Organization',
    items: [
      { to: '/value-streams', label: 'Value Streams', roles: ['Administrator'] },
      {
        to: '/solution-teams',
        label: 'Solution Teams',
        roles: ['Administrator', 'Solution Lead'],
      },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/approvals', label: 'Approvals', roles: ['Administrator'] },
      {
        to: '/solution-review',
        label: 'Solution Review',
        roles: ['Administrator', 'Solution Lead'],
      },
      { to: '/design', label: 'Design', roles: ['Administrator', 'Solution Lead'] },
      {
        to: '/ready-to-build',
        label: 'Ready to Build',
        roles: ['Administrator', 'Solution Lead'],
      },
      { to: '/build', label: 'Build', roles: ['Administrator', 'Solution Lead'] },
      { to: '/show-and-tell', label: 'Show & Tell', roles: ['all'] },
    ],
  },
  {
    label: 'Outcomes',
    items: [
      { to: '/capability-demonstrators', label: 'Capability Demonstrators', roles: ['all'] },
      { to: '/solutions', label: 'Solutions', roles: ['all'] },
      { to: '/ipsafe', label: 'IPSAFE', roles: ['Administrator', 'Solution Lead'] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/documents', label: 'Documents', roles: ['all'] },
      { to: '/notifications', label: 'Notifications', roles: ['all'] },
      { to: '/copilot', label: 'AI Copilot', roles: ['all'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/reports', label: 'Reports & Analytics', roles: ['Administrator'] },
      { to: '/administration', label: 'Administration', roles: ['Administrator'] },
    ],
  },
]

function visibleForRole(item, role) {
  return item.roles.includes('all') || item.roles.includes(role)
}

export default function AppShell() {
  const navigate = useNavigate()
  const { personas, persona, setPersonaId } = useRole()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api
      .getNotifications()
      .then((data) => setUnread(data.unread || 0))
      .catch(() => {})
  }, [persona?.id])

  const navGroups = useMemo(() => {
    const role = persona?.role || 'Administrator'
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => visibleForRole(item, role)),
    })).filter((group) => group.items.length > 0)
  }, [persona])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-kicker">Risk & Compliance</div>
          <h1>Innovation Pipeline</h1>
        </div>
        <nav className="nav-list">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  {NAV_ICONS[item.to]}
                  <span className="nav-link-text">
                    {item.label}
                    {item.to === '/notifications' && unread > 0 ? ` (${unread})` : ''}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Risk & Compliance Innovation Pipeline</div>
            <div className="topbar-sub">
              {persona
                ? `Viewing as ${persona.name} · ${persona.role}`
                : 'Governance funnel across Risk Value Streams, Solution Teams, and deployable outcomes'}
            </div>
          </div>
          <div className="topbar-actions">
            <label className="persona-switch">
              <span>Persona</span>
              <select
                value={persona?.id || ''}
                onChange={(e) => {
                  setPersonaId(e.target.value)
                  navigate('/dashboard')
                }}
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn secondary"
              type="button"
              onClick={() => navigate('/notifications')}
            >
              Notifications{unread > 0 ? ` (${unread})` : ''}
            </button>
            <button className="btn secondary" type="button" onClick={() => navigate('/copilot')}>
              Copilot
            </button>
            <button className="btn" type="button" onClick={() => navigate('/ideas/new')}>
              + Submit New Idea
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
