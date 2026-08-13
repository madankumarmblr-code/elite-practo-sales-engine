import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatCurrency, formatDate, stageBadge } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="panel">
        <p>Could not load dashboard: {error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="panel muted">Loading dashboard…</div>;
  }

  const { kpis, byStage, stages, activities, hotLeads } = data;
  const isEmpty = !kpis.openLeads && !(activities || []).length;

  const kpiCards = [
    {
      label: 'Open leads',
      value: kpis.openLeads,
      delta: `${kpis.activeCampaigns} active campaigns`,
    },
    {
      label: 'Pipeline value',
      value: formatCurrency(kpis.pipelineValue),
      delta: `Won ${formatCurrency(kpis.wonValue)}`,
    },
    {
      label: 'Avg lead score',
      value: kpis.avgScore,
      delta: `${kpis.conversionRate}% conversion`,
    },
    {
      label: 'Active campaigns',
      value: kpis.activeCampaigns,
      delta: 'Autopilot AI running',
    },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Enterprise sales</div>
          <h1>Practo Sales Automation</h1>
          <p>
            Pipeline health, hot clinic leads, and Autopilot across WhatsApp, Gmail, and calls —
            built for Practo commercial teams.
          </p>
        </div>
        <div className="topbar-actions">
          <Link className="btn btn-secondary" to="/lead-generator">
            Generate leads →
          </Link>
          <Link className="btn btn-primary" to="/autopilot">
            Open Autopilot →
          </Link>
        </div>
      </div>

      {isEmpty ? (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Workspace is ready</h2>
          <p className="muted">
            No CRM demo data is loaded. Use Lead Generator to discover clinics, or add leads
            manually.
          </p>
          <Link className="btn btn-primary" to="/lead-generator">
            Start with Lead Generator →
          </Link>
        </div>
      ) : null}

      <div className="bento" style={{ marginBottom: '1rem' }}>
        {kpiCards.map((card, i) => (
          <div className="panel kpi bento-kpi" key={card.label}>
            <span className="kpi-index" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="label">{card.label}</span>
            <span className="value">{card.value}</span>
            <span className="delta">{card.delta}</span>
          </div>
        ))}

        <div className="panel bento-main">
          <div className="panel-head">
            <h2>Pipeline by stage</h2>
            <Link className="btn btn-ghost" to="/leads">
              Open board →
            </Link>
          </div>
          <div className="grid" style={{ gap: '0.95rem' }}>
            {stages.map((s) => {
              const count = byStage[s.slug] || 0;
              const max = Math.max(...Object.values(byStage), 1);
              return (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="muted">{count}</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${(count / max) * 100}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel bento-side">
          <div className="panel-head">
            <h2>Hot leads</h2>
            <span className="badge badge-coral">Priority</span>
          </div>
          {(hotLeads || []).length ? (
            hotLeads.map((l) => (
              <div className="list-row" key={l.id}>
                <div>
                  <strong>{l.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {l.company} · {l.assigned_to}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="score">{l.score}</div>
                  <span className={`badge ${stageBadge(l.stage)}`}>{l.stage}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No hot leads yet.
            </p>
          )}
          <div style={{ marginTop: '0.85rem' }}>
            <Link className="btn btn-ghost" to="/leads">
              Manage leads →
            </Link>
          </div>
        </div>

        <div className="panel bento-wide">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <Link className="btn btn-ghost" to="/autopilot">
              Autopilot feed →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Title</th>
                  <th>Channel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(activities || []).length ? (
                  activities.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.created_at)}</td>
                      <td>
                        <strong>{a.title}</strong>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {a.detail}
                        </div>
                      </td>
                      <td>
                        <span className="badge">{a.channel || a.type}</span>
                      </td>
                      <td>{a.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="muted">
                      No activity yet — launch Autopilot or import leads.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
