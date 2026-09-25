import React, { useState, useEffect } from 'react';

const INCIDENTS_DATA = {
  "FLD-2847": {
    id: "FLD-2847",
    type: "Flood",
    title: "Flood Risk",
    location: "Mumbra, Thane",
    coords: "19.2043 N, 73.0301 E",
    mapX: 52, // %
    mapY: 34, // %
    confidence: 87,
    assessment: "High confidence",
    assessmentDesc: "Likely surface flooding due to heavy rainfall and river level rise.",
    statusDot: "#f43f5e",
    signals: [
      { name: "Satellite SAR (inundation)", percent: 42, color: "#22d3ee" },
      { name: "Weather API (rainfall)", percent: 18, color: "#f59e0b" },
      { name: "IoT Sensor (water level)", percent: 12, color: "#f43f5e" },
      { name: "Verifier submission (images)", percent: 28, color: "#fb7185" },
    ],
    verifiers: [
      { initials: "RS", name: "Riya Sharma", dist: "1.2 km", status: "En route", statusClass: "status-enroute", rating: "4.8" },
      { initials: "AK", name: "Aman Kulkarni", dist: "2.4 km", status: "Tasked", statusClass: "status-tasked", rating: "4.6" },
      { initials: "NP", name: "Neha Patil", dist: "3.1 km", status: "Available", statusClass: "status-available", rating: "4.9" },
      { initials: "AM", name: "Aditya More", dist: "4.0 km", status: "En route", statusClass: "status-enroute", rating: "4.3" },
      { initials: "SK", name: "Sneha Kadam", dist: "5.6 km", status: "Available", statusClass: "status-available", rating: "4.5" },
    ]
  },
  "FIR-1192": {
    id: "FIR-1192",
    type: "Fire",
    title: "Wildfire / Scrub Fire",
    location: "Airoli, Navi Mumbai",
    coords: "19.1579 N, 72.9935 E",
    mapX: 47,
    mapY: 52,
    confidence: 76,
    assessment: "High confidence",
    assessmentDesc: "Active thermal anomaly detected by FIRMS with verifier smoke photo confirmed.",
    statusDot: "#f59e0b",
    signals: [
      { name: "NASA FIRMS (thermal FRP)", percent: 48, color: "#22d3ee" },
      { name: "CCTV Smoke Classifier", percent: 24, color: "#f59e0b" },
      { name: "Wind Vector Feeds", percent: 10, color: "#f43f5e" },
      { name: "Verifier ground photo", percent: 18, color: "#fb7185" },
    ],
    verifiers: [
      { initials: "VJ", name: "Vikram Jadhav", dist: "0.8 km", status: "Tasked", statusClass: "status-tasked", rating: "4.9" },
      { initials: "SD", name: "Sunil Deshmukh", dist: "2.1 km", status: "Available", statusClass: "status-available", rating: "4.7" },
    ]
  },
  "FLD-2831": {
    id: "FLD-2831",
    type: "Flood",
    title: "Severe Urban Inundation",
    location: "Kurla, Mumbai",
    coords: "19.0726 N, 72.8845 E",
    mapX: 21,
    mapY: 57,
    confidence: 92,
    assessment: "Critical confidence",
    assessmentDesc: "Mithi river water level crossed critical alert threshold (2.3m). Underpass submerged.",
    statusDot: "#f43f5e",
    signals: [
      { name: "Mithi River Gauge Telemetry", percent: 55, color: "#22d3ee" },
      { name: "IMD Doppler Radar (heavy rain)", percent: 25, color: "#f59e0b" },
      { name: "Citizen Helpline 112 calls", percent: 20, color: "#f43f5e" },
    ],
    verifiers: [
      { initials: "RK", name: "Rahul Kamble", dist: "1.5 km", status: "En route", statusClass: "status-enroute", rating: "4.8" },
      { initials: "MS", name: "Meena Sawant", dist: "2.7 km", status: "Tasked", statusClass: "status-tasked", rating: "4.7" },
    ]
  },
  "LND-0714": {
    id: "LND-0714",
    type: "Landslide",
    title: "Slope Instability Alert",
    location: "Kalyan, Thane",
    coords: "19.2403 N, 73.1305 E",
    mapX: 68,
    mapY: 26,
    confidence: 64,
    assessment: "Ambiguous (TMVN Tasked)",
    assessmentDesc: "InSAR satellite analysis flagged potential slope displacement after rainfall.",
    statusDot: "#f59e0b",
    signals: [
      { name: "Sentinel-1 InSAR displacement", percent: 50, color: "#22d3ee" },
      { name: "Soil Moisture Telemetry", percent: 30, color: "#f59e0b" },
      { name: "Local Spotter Check", percent: 20, color: "#fb7185" },
    ],
    verifiers: [
      { initials: "TC", name: "Tanmay Chitnis", dist: "1.9 km", status: "Tasked", statusClass: "status-tasked", rating: "4.6" }
    ]
  }
};

const RECENT_EVENTS = [
  { time: "11:24:17", id: "FLD-2847", type: "Flood", location: "Mumbra, Thane", details: "Model confidence increased to 87%", dot: "#f43f5e" },
  { time: "11:17:03", id: "FIR-1192", type: "Fire", location: "Airoli, Navi Mumbai", details: "Verifier submission received (image)", dot: "#f59e0b" },
  { time: "11:12:46", id: "FLD-2831", type: "Flood", location: "Kurla, Mumbai", details: "Water level crossed alert threshold (2.3 m)", dot: "#22d3ee" },
  { time: "10:58:21", id: "LND-0714", type: "Landslide", location: "Kalyan, Thane", details: "Satellite analysis flagged potential slope failure", dot: "#22d3ee" },
  { time: "10:41:09", id: "FLD-2828", type: "Flood", location: "Andheri, Mumbai", details: "Incident escalated to municipal team", dot: "#f43f5e" },
  { time: "09:26:33", id: "FIR-1187", type: "Fire", location: "Belapur, Navi Mumbai", details: "Marked as resolved", dot: "#10b981" },
];

export default function App() {
  const [selectedIncidentId, setSelectedIncidentId] = useState("FLD-2847");
  const [activeNav, setActiveNav] = useState("Map");
  const [activeMode, setActiveMode] = useState("Disaster");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState("20 Sep 2026 11:24:17");
  const [modalAction, setModalAction] = useState(null);
  const [justification, setJustification] = useState("");
  const [notification, setNotification] = useState(null);

  const incident = INCIDENTS_DATA[selectedIncidentId] || INCIDENTS_DATA["FLD-2847"];

  // Real-time clock update simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setCurrentTime(`20 Sep 2026 ${timeStr}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActionClick = (action) => {
    setModalAction(action);
    setJustification(
      action === "Approve" ? "Ground verifier photos and IoT river level sensors corroborate inundation; approving simulated flood rescue unit dispatch." :
      action === "Adjust" ? "Adjusting spatial boundary buffer to 500m to account for drainage overflow gradient." :
      "Thermal sensor noise detected; standing down dispatch."
    );
  };

  const handleConfirmDecision = () => {
    if (!justification.trim()) {
      alert("Mandatory operator audit justification is required by policy.");
      return;
    }

    setNotification(`Action '${modalAction.toUpperCase()}' recorded for #${incident.id}. Immutable audit event published.`);
    setModalAction(null);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="app-container">
      {/* 1. Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="brand-title">Sanrakshan</span>
          <span className="brand-subtitle">Integrated Disaster Command Center</span>
        </div>

        <div className="header-center">
          <button
            className={`toggle-label ${activeMode === 'Disaster' ? 'active' : ''}`}
            onClick={() => setActiveMode('Disaster')}
          >
            Disaster
          </button>
          <button
            className={`toggle-label ${activeMode === 'Civic' ? 'active' : ''}`}
            onClick={() => setActiveMode('Civic')}
          >
            Civic
          </button>
        </div>

        <div className="header-right">
          <span>{currentTime}</span>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="workspace">
        {/* Left Navigation Sidebar */}
        <aside className="nav-sidebar">
          {[
            { id: "Map", icon: "🌐", label: "Map" },
            { id: "Layers", icon: "☵", label: "Layers" },
            { id: "Incidents", icon: "⚠", label: "Incidents" },
            { id: "Verifiers", icon: "👥", label: "Verifiers" },
            { id: "Weather", icon: "☁", label: "Weather" },
            { id: "Tools", icon: "🔧", label: "Tools" },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <div className="nav-icon-box">{item.icon}</div>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Center Content: Map + Bottom Drawer */}
        <section className="center-content">
          <div className="map-canvas">
            {/* Search Input */}
            <div className="map-search-bar">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input
                type="text"
                placeholder="Search location (e.g. Thane, Kurla, Mumbra...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tactical Map Backdrop with SVG Heatmap Gradients */}
            <svg className="map-background-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="heatMumbra" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.65" />
                  <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#080c12" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatKurla" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#080c12" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatAiroli" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#080c12" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Geographic Coastline / Water Body Simulation */}
              <path d="M 0,0 L 260,0 C 270,120 220,240 180,340 C 150,420 190,520 240,680 L 0,680 Z" fill="#060e18" opacity="0.9" />

              {/* Heatmap Blobs matching reference image */}
              <circle cx="52%" cy="34%" r="160" fill="url(#heatMumbra)" />
              <circle cx="21%" cy="57%" r="90" fill="url(#heatKurla)" />
              <circle cx="47%" cy="52%" r="80" fill="url(#heatAiroli)" />
              <circle cx="35%" cy="16%" r="65" fill="url(#heatKurla)" opacity="0.6" />
            </svg>

            {/* Geographic Place Names */}
            <div className="region-label major" style={{ top: '30%', left: '38%' }}>Thane</div>
            <div className="region-label" style={{ top: '15%', left: '48%' }}>Bhiwandi</div>
            <div className="region-label" style={{ top: '24%', left: '56%' }}>Dombivli</div>
            <div className="region-label" style={{ top: '20%', left: '63%' }}>Kalyan</div>
            <div className="region-label" style={{ top: '32%', left: '46%' }}>Mumbra</div>
            <div className="region-label major" style={{ top: '51%', left: '24%' }}>Mumbai</div>
            <div className="region-label" style={{ top: '45%', left: '32%' }}>Vikhroli</div>
            <div className="region-label" style={{ top: '42%', left: '27%' }}>Powai</div>
            <div className="region-label" style={{ top: '41%', left: '21%' }}>Andheri</div>
            <div className="region-label" style={{ top: '26%', left: '21%' }}>Borivali</div>
            <div className="region-label" style={{ top: '10%', left: '23%' }}>Bhayandar</div>
            <div className="region-label" style={{ top: '57%', left: '27%' }}>Chembur</div>
            <div className="region-label major" style={{ top: '56%', left: '44%' }}>Navi Mumbai</div>
            <div className="region-label" style={{ top: '50%', left: '40%' }}>Vashi</div>

            {/* Water label */}
            <div style={{ position: 'absolute', top: '30%', left: '8%', color: 'rgba(56, 189, 248, 0.25)', fontStyle: 'italic', fontSize: '1.2rem', fontWeight: '600', pointerEvents: 'none' }}>
              Arabian<br />Sea
            </div>

            {/* Interactive Markers */}
            {Object.values(INCIDENTS_DATA).map(inc => {
              const isSelected = inc.id === selectedIncidentId;
              return (
                <div
                  key={inc.id}
                  className={`map-marker ${isSelected ? 'active' : ''}`}
                  style={{ top: `${inc.mapY}%`, left: `${inc.mapX}%` }}
                  onClick={() => setSelectedIncidentId(inc.id)}
                >
                  <div className="marker-pulse" style={{ borderColor: inc.statusDot }} />
                  <div className={`marker-pin ${inc.type === 'Fire' ? 'fire' : inc.type === 'Flood' ? 'flood' : 'warning'}`}>
                    {inc.type === 'Fire' ? '🔥' : inc.type === 'Flood' ? '🌊' : '⚠'}
                  </div>

                  {isSelected && (
                    <div className="marker-callout">
                      <div className="id-tag">ID #{inc.id}</div>
                      <div className="hazard-title">
                        <span>{inc.type}</span>
                        <span className="confidence-text">({inc.confidence}% Conf)</span>
                      </div>
                      <div className="sub-info">{inc.location}</div>
                      <div className="sub-info" style={{ fontFamily: 'var(--font-mono)' }}>{inc.coords}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Left Legend */}
            <div className="map-legend">
              <div className="legend-title">Hazard Confidence</div>
              <div className="legend-bar"></div>
              <div className="legend-labels">
                <span>Low (0–30%)</span>
                <span>Ambiguous (30–70%)</span>
                <span>High (70–100%)</span>
              </div>
            </div>

            {/* Bottom Right Scale & Compass */}
            <div className="map-scale">
              <div className="scale-graphic">
                <span>0</span>
                <span>5</span>
                <span>10 km</span>
                <div className="scale-ticks"></div>
              </div>
              <div className="compass-rose">
                <span>▲</span>
                <span>N</span>
              </div>
            </div>
          </div>

          {/* Bottom Drawer: Recent Events */}
          <div className="bottom-drawer">
            <div className="drawer-header">
              <span className="drawer-title">Recent Events</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                6 EVENTS RECORDED
              </span>
            </div>
            <div className="events-table-wrapper">
              <table className="events-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Time</th>
                    <th style={{ width: '110px' }}>ID</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th style={{ width: '190px' }}>Location</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_EVENTS.map((evt, idx) => (
                    <tr
                      key={idx}
                      onClick={() => {
                        if (INCIDENTS_DATA[evt.id]) {
                          setSelectedIncidentId(evt.id);
                        }
                      }}
                      style={{
                        backgroundColor: evt.id === selectedIncidentId ? 'rgba(34, 211, 238, 0.05)' : 'transparent'
                      }}
                    >
                      <td className="event-time">
                        <span className="event-dot" style={{ backgroundColor: evt.dot }}></span>
                        {evt.time}
                      </td>
                      <td className="event-id">{evt.id}</td>
                      <td>{evt.type}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{evt.location}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{evt.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right Inspector Column */}
        <aside className="inspector-column">
          {/* Header */}
          <div>
            <div className="incident-top-header">
              <span className="section-label">Selected Incident</span>
              <span className="incident-id-badge">ID #{incident.id}</span>
            </div>

            <div className="incident-main-card">
              <div className="incident-avatar-box">
                <div className="hazard-icon-circle">
                  {incident.type === 'Fire' ? '🔥' : '🌊'}
                </div>
                <div>
                  <div className="hazard-title-text">{incident.title}</div>
                  <div className="hazard-location-text">📍 {incident.location}</div>
                </div>
              </div>
              <div className="hazard-coords-box">
                <div>{incident.coords.split(',')[0]}</div>
                <div>{incident.coords.split(',')[1]}</div>
              </div>
            </div>
          </div>

          {/* Model Confidence */}
          <div className="confidence-section">
            <span className="section-label">Model Confidence</span>
            <div className="confidence-display-row">
              <span className="confidence-large-number" style={{ color: incident.statusDot }}>
                {incident.confidence}%
              </span>
              <div className="confidence-assessment-box">
                <div className="assessment-tag">{incident.assessment}</div>
                <div className="assessment-desc">{incident.assessmentDesc}</div>
              </div>
            </div>
          </div>

          {/* Signal Contribution */}
          <div>
            <span className="section-label">Signal Contribution</span>
            <div className="stacked-contribution-bar">
              {incident.signals.map((sig, idx) => (
                <div
                  key={idx}
                  style={{ width: `${sig.percent}%`, backgroundColor: sig.color }}
                  title={`${sig.name}: ${sig.percent}%`}
                />
              ))}
            </div>

            <div className="signal-legend-list">
              {incident.signals.map((sig, idx) => (
                <div key={idx} className="signal-legend-item">
                  <div className="signal-legend-left">
                    <span className="signal-legend-dot" style={{ backgroundColor: sig.color }}></span>
                    <span>{sig.name}</span>
                  </div>
                  <span className="signal-percent">{sig.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Verifiers */}
          <div>
            <div className="verifiers-header">
              <span className="section-label">Nearby Verifiers ({incident.verifiers.length})</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                within 10 km
              </span>
            </div>

            <div className="verifiers-list">
              {incident.verifiers.map((v, idx) => (
                <div key={idx} className="verifier-row">
                  <div className="verifier-left">
                    <div className="verifier-avatar">{v.initials}</div>
                    <span className="verifier-name">{v.name}</span>
                  </div>
                  <span className="verifier-distance">{v.dist}</span>
                  <span className={`verifier-status-badge ${v.statusClass}`}>{v.status}</span>
                  <span className="verifier-rating">★ {v.rating}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            <div className="action-buttons-row">
              <button className="btn-action approve" onClick={() => handleActionClick("Approve")}>
                Approve
              </button>
              <button className="btn-action adjust" onClick={() => handleActionClick("Adjust")}>
                Adjust
              </button>
              <button className="btn-action override" onClick={() => handleActionClick("Override")}>
                Override
              </button>
            </div>

            {notification && (
              <div style={{
                marginTop: '0.85rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--color-emerald)',
                color: 'var(--color-emerald)',
                fontSize: '0.75rem'
              }}>
                ✓ {notification}
              </div>
            )}
          </div>

          {/* Live Feeds */}
          <div className="live-feeds-box">
            <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
              Live Feeds
            </div>
            <div className="live-feed-row">
              <span className="feed-name">Rainfall (IMD)</span>
              <span className="feed-val">Moderate - 48 mm/hr</span>
            </div>
            <div className="live-feed-row">
              <span className="feed-name">River Level (Ulhas)</span>
              <span className="feed-val" style={{ color: 'var(--color-rose)' }}>Above danger level (2.8 m)</span>
            </div>
            <div className="live-feed-row">
              <span className="feed-name">Wind Speed</span>
              <span className="feed-val">12 km/h</span>
            </div>
            <div className="live-feed-row">
              <span className="feed-name">Satellite (Latest)</span>
              <span className="feed-val">19 Sep 2026 11:10</span>
            </div>
            <div className="live-feed-row">
              <span className="feed-name">IoT Sensors</span>
              <span className="feed-val">42 online | 3 offline</span>
            </div>
            <div className="live-feed-row">
              <span className="feed-name">Verifier Network</span>
              <span className="feed-val" style={{ color: 'var(--color-emerald)' }}>156 active</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Decision Justification Modal */}
      {modalAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            width: '460px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>Operator Action: {modalAction}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Target: #{incident.id} ({incident.title}, {incident.location})
            </p>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              MANDATORY AUDIT REASON (IMMUTABLE LOG):
            </label>
            <textarea
              style={{
                width: '100%',
                height: '80px',
                padding: '0.6rem',
                borderRadius: '6px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.8rem',
                fontFamily: 'inherit',
                marginBottom: '1rem'
              }}
              value={justification}
              onChange={e => setJustification(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}
                onClick={() => setModalAction(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  background: modalAction === 'Approve' ? 'var(--color-emerald)' : modalAction === 'Adjust' ? 'var(--color-amber)' : 'var(--color-rose)',
                  color: modalAction === 'Adjust' ? '#000' : '#fff',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
                onClick={handleConfirmDecision}
              >
                Submit & Sign Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
