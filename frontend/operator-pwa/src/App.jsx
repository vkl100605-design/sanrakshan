import React, { useState, useEffect } from 'react';

const INITIAL_INCIDENTS = [
  {
    id: "inc-2026-blr-01",
    hazardType: "FLOOD",
    state: "VERIFYING",
    location: { latitude: 12.9716, longitude: 77.5946 },
    confidence: 0.58,
    ciLower: 0.42,
    ciUpper: 0.74,
    severity: "HIGH",
    description: "Severe inundation reported near central underpass with rising water levels",
    topSignals: [
      { source: "IoT Water Sensor #41", weight: 0.42, note: "+0.31 (Depth 42cm)" },
      { source: "Weather Radar", weight: 0.28, note: "+0.18 (Rainfall 65mm/hr)" },
      { source: "Citizen Helpline", weight: 0.18, note: "+0.09 (3 calls)" }
    ]
  },
  {
    id: "inc-2026-blr-02",
    hazardType: "WILDFIRE",
    state: "REVIEW_READY",
    location: { latitude: 13.0827, longitude: 77.5877 },
    confidence: 0.89,
    ciLower: 0.81,
    ciUpper: 0.96,
    severity: "CRITICAL",
    description: "Thermal anomaly detected by NASA FIRMS with active smoke plume confirmed by CCTV",
    topSignals: [
      { source: "NASA FIRMS Satellite", weight: 0.48, note: "+0.38 (FRP 42.1 MW)" },
      { source: "CCTV AI Classifier", weight: 0.32, note: "+0.24 (Smoke plume)" },
      { source: "Wind Vector Station", weight: 0.20, note: "+0.12 (NW direction)" }
    ]
  },
  {
    id: "inc-2026-blr-03",
    hazardType: "URBAN_FIRE",
    state: "APPROVED",
    location: { latitude: 12.9352, longitude: 77.6245 },
    confidence: 0.94,
    ciLower: 0.89,
    ciUpper: 0.98,
    severity: "CRITICAL",
    description: "Commercial facility structural fire, operator approved simulated dispatch of 2 foam tenders",
    topSignals: [
      { source: "CCTV Optical Thermal", weight: 0.52, note: "+0.45 (Active flames)" },
      { source: "Emergency 112 Dispatch", weight: 0.35, note: "+0.30 (Caller confirmed)" }
    ]
  }
];

export default function App() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [selectedId, setSelectedId] = useState("inc-2026-blr-02");
  const [filterHazard, setFilterHazard] = useState("ALL");
  const [modalAction, setModalAction] = useState(null);
  const [auditReason, setAuditReason] = useState("");
  const [notification, setNotification] = useState(null);

  const selectedIncident = incidents.find(i => i.id === selectedId) || incidents[0];

  const filteredIncidents = incidents.filter(i => {
    if (filterHazard === "ALL") return true;
    return i.hazardType === filterHazard;
  });

  const handleDecisionSubmit = () => {
    if (!auditReason.trim()) {
      alert("An audit justification reason is strictly required by the governance policy.");
      return;
    }

    const newState = modalAction === "APPROVE" ? "APPROVED" :
                     modalAction === "ADJUST" ? "ADJUSTED" : "OVERRIDDEN";

    setIncidents(prev => prev.map(inc => {
      if (inc.id === selectedIncident.id) {
        return { ...inc, state: newState };
      }
      return inc;
    }));

    setNotification(`Action '${modalAction}' recorded for ${selectedIncident.id}. Simulated dispatch command published.`);
    setModalAction(null);
    setAuditReason("");

    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div>
      {/* Top Bar */}
      <header className="top-nav">
        <div className="brand-section">
          <span className="brand-logo">SANRAKSHAN</span>
          <span className="brand-tag">EOC OPERATOR COMMAND</span>
        </div>

        <div className="status-pills">
          <div className="live-indicator">
            <span className="pulse-dot"></span>
            <span>SYSTEM HEALTH: 100% OPERATIONAL</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            TRACE ID: TRC-7F9A-2026
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Incidents Queue */}
        <section className="glass-panel queue-panel">
          <div className="panel-header">
            <span className="panel-title">Active Incidents</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {["ALL", "FLOOD", "WILDFIRE"].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterHazard(type)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: filterHazard === type ? 'var(--accent-cyan)' : 'transparent',
                    color: filterHazard === type ? '#000' : 'var(--text-secondary)',
                    fontWeight: filterHazard === type ? '700' : '400'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="incident-list">
            {filteredIncidents.map(inc => (
              <div
                key={inc.id}
                className={`incident-card ${inc.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(inc.id)}
              >
                <div className="card-top">
                  <span className={`hazard-badge ${inc.hazardType === 'FLOOD' ? 'badge-flood' : 'badge-wildfire'}`}>
                    {inc.hazardType}
                  </span>
                  <span className={`state-chip ${inc.state === 'REVIEW_READY' ? 'state-review-ready' : 'state-verifying'}`}>
                    {inc.state}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  {inc.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span>Conf: {(inc.confidence * 100).toFixed(0)}%</span>
                  <span style={{ color: 'var(--text-muted)' }}>CI: [{(inc.ciLower * 100).toFixed(0)}%-{(inc.ciUpper * 100).toFixed(0)}%]</span>
                </div>
                <div className="confidence-bar-bg">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${inc.confidence * 100}%`,
                      background: inc.confidence > 0.75 ? 'var(--accent-rose)' : inc.confidence >= 0.35 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Center Column: Tactical Geospatial Map Stub */}
        <section className="glass-panel map-panel">
          <div className="panel-header">
            <span className="panel-title">Tactical Geospatial Layer</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              COORD: {selectedIncident.location.latitude.toFixed(4)} N, {selectedIncident.location.longitude.toFixed(4)} E
            </span>
          </div>

          <div className="map-viewport">
            <div className="map-radar-circle"></div>
            <div className="map-radar-sweep"></div>

            {incidents.map((inc, idx) => (
              <div
                key={inc.id}
                className="map-node"
                style={{
                  top: `${40 + (idx - 1) * 25}%`,
                  left: `${50 + (idx - 1) * 22}%`,
                  borderColor: inc.id === selectedId ? 'var(--accent-cyan)' : 'var(--border-color)',
                  background: inc.id === selectedId ? 'rgba(0, 229, 255, 0.2)' : 'rgba(16, 22, 34, 0.9)'
                }}
                onClick={() => setSelectedId(inc.id)}
              >
                📍 {inc.hazardType} ({(inc.confidence * 100).toFixed(0)}%)
              </div>
            ))}

            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              background: 'rgba(10, 13, 20, 0.85)',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              Simulation Boundary Active: All field dispatches are simulated
            </div>
          </div>
        </section>

        {/* Right Column: Confidence Explanation & Decision Inspector */}
        <section className="glass-panel inspector-panel">
          <div className="panel-header" style={{ padding: '0 0 1rem 0' }}>
            <span className="panel-title">Decision Support</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>
              PyMC Bayesian Engine
            </span>
          </div>

          <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>POSTERIOR HAZARD PROBABILITY</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: selectedIncident.confidence > 0.75 ? 'var(--accent-rose)' : 'var(--accent-amber)', lineHeight: '1.2' }}>
              {(selectedIncident.confidence * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              90% Credible Interval: [{(selectedIncident.ciLower * 100).toFixed(1)}%, {(selectedIncident.ciUpper * 100).toFixed(1)}%]
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Top Signal Attribution
            </div>
            {selectedIncident.topSignals?.map((sig, i) => (
              <div key={i} className="signal-row">
                <div>
                  <div style={{ fontWeight: '600' }}>{sig.source}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sig.note}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
                  w={(sig.weight).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn btn-approve" onClick={() => setModalAction("APPROVE")}>
              ✓ Approve Simulated Dispatch
            </button>
            <button className="btn btn-adjust" onClick={() => setModalAction("ADJUST")}>
              ⚙ Adjust Confidence / Boundary
            </button>
            <button className="btn btn-override" onClick={() => setModalAction("OVERRIDE")}>
              ✕ Override / Stand Down
            </button>
          </div>

          {notification && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--accent-emerald)',
              color: 'var(--accent-emerald)',
              fontSize: '0.8rem'
            }}>
              {notification}
            </div>
          )}
        </section>
      </main>

      {/* Decision Modal */}
      {modalAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '1.5rem', background: 'var(--bg-secondary)' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Confirm Action: {modalAction}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Target Incident: <strong>{selectedIncident.id}</strong> ({selectedIncident.hazardType})
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              MANDATORY OPERATOR JUSTIFICATION (AUDIT TRAIL):
            </label>
            <textarea
              style={{
                width: '100%',
                height: '80px',
                padding: '0.6rem',
                borderRadius: '6px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
              placeholder="State reason for decision based on corroborated sensor evidence..."
              value={auditReason}
              onChange={e => setAuditReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-adjust"
                onClick={() => setModalAction(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-approve"
                onClick={handleDecisionSubmit}
              >
                Confirm & Publish Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
