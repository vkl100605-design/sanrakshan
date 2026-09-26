import React, { useState, useEffect, useRef } from 'react';

// Fallback embedded scenario datasets to guarantee immediate rendering offline or online
import scenarioEscalation from '../../public/simulation/sim_scenario_escalation.json';
import scenarioFire from '../../public/simulation/sim_scenario_fire_airoli.json';
import scenarioFloodStandard from '../../public/simulation/sim_scenario_flood_mumbra.json';

const SCENARIOS = {
  "FLOOD_MUMBRA_ESCALATION": scenarioEscalation,
  "FIRE_AIROLI_SCRUB": scenarioFire,
  "FLOOD_MUMBRA_STANDARD": scenarioFloodStandard,
};

export default function SimulationStudioModal({ onClose }) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("FLOOD_MUMBRA_ESCALATION");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1500); // ms per step
  const timerRef = useRef(null);

  const scenario = SCENARIOS[selectedScenarioKey] || scenarioEscalation;
  const events = scenario.event_log || [];
  const maxStep = events.length > 0 ? events.length - 1 : 0;
  const currentEvent = events[currentStepIndex] || events[0] || {};

  // Auto-play timer loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxStep, playSpeedMs]);

  // Switch scenario
  const handleScenarioChange = (key) => {
    setIsPlaying(false);
    setSelectedScenarioKey(key);
    setCurrentStepIndex(0);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.min(maxStep, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleJumpEnd = () => {
    setIsPlaying(false);
    setCurrentStepIndex(maxStep);
  };

  // Derive current simulated state
  const currentConfidence = currentEvent.confidence_at_event !== undefined
    ? currentEvent.confidence_at_event
    : scenario.initial_confidence;

  const isAmbiguous = currentConfidence >= 0.35 && currentConfidence <= 0.75;
  const isReviewReady = currentConfidence > 0.75;

  const getEventBadgeColor = (eventType) => {
    switch (eventType) {
      case "AMBIGUITY_BAND_DETECTED": return "#f59e0b";
      case "VERIFIERS_RANKED": return "#38bdf8";
      case "INVITATION_DISPATCHED": return "#818cf8";
      case "ESCALATION_TRIGGERED": return "#f43f5e";
      case "INVITATION_ACCEPTED": return "#34d399";
      case "VERIFIER_EN_ROUTE": return "#38bdf8";
      case "VERIFIER_ON_SCENE": return "#a855f7";
      case "EVIDENCE_SUBMITTED": return "#10b981";
      case "BAYESIAN_FUSION_RESOLVED": return "#06b6d4";
      case "DISPATCH_PACKAGE_STAGED": return "#ec4899";
      case "OPERATOR_APPROVAL_SIGNED": return "#10b981";
      default: return "#94a3b8";
    }
  };

  return (
    <div className="sim-modal-backdrop" onClick={onClose}>
      <div className="sim-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sim-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className="sim-phase-badge">Phase 5 Simulation</span>
            <div>
              <h2 className="sim-header-title">TMVN Discrete-Event Simulation & Explainability Studio</h2>
              <div className="sim-header-subtitle">
                Interactive SimPy disaster lifecycle: Ambiguity band detection, road routing, verifier escalation & multi-agency staging
              </div>
            </div>
          </div>
          <button className="sim-close-btn" onClick={onClose}>✕ Close Studio</button>
        </div>

        {/* Top Control Bar: Scenario Selector & Playback Controls */}
        <div className="sim-controls-bar">
          <div className="sim-scenario-selector">
            <span className="sim-control-label">SCENARIO:</span>
            <select
              value={selectedScenarioKey}
              onChange={e => handleScenarioChange(e.target.value)}
              className="sim-select"
            >
              <option value="FLOOD_MUMBRA_ESCALATION">🌊 Mumbra Creek Flood: Verifier Timeout & Escalation</option>
              <option value="FIRE_AIROLI_SCRUB">🔥 Airoli Scrub Fire: FIRMS Anomaly & Ground Corroboration</option>
              <option value="FLOOD_MUMBRA_STANDARD">🌊 Mumbra Flash Flood: Rapid Verification Baseline</option>
            </select>
          </div>

          <div className="sim-playback-group">
            <button className="sim-btn" onClick={handleReset} title="Reset to Start">⏮ Reset</button>
            <button className="sim-btn" onClick={handleStepPrev} disabled={currentStepIndex === 0}>◀ Prev</button>
            <button
              className={`sim-btn primary ${isPlaying ? 'active' : ''}`}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play Simulation'}
            </button>
            <button className="sim-btn" onClick={handleStepNext} disabled={currentStepIndex === maxStep}>Next ▶</button>
            <button className="sim-btn" onClick={handleJumpEnd} title="Jump to Final Resolution">⏭ End</button>
          </div>

          <div className="sim-speed-group">
            <span className="sim-control-label">SPEED:</span>
            {[
              { label: '1x', ms: 2200 },
              { label: '2x', ms: 1200 },
              { label: '5x', ms: 500 },
            ].map(s => (
              <button
                key={s.label}
                className={`sim-speed-btn ${playSpeedMs === s.ms ? 'active' : ''}`}
                onClick={() => setPlaySpeedMs(s.ms)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="sim-clock-display">
            <span style={{ color: '#94a3b8' }}>SIM TIME:</span>
            <span className="sim-clock-val">{currentEvent.sim_time_formatted || "T+00:00"}</span>
            <span className="sim-step-val">Step {currentStepIndex + 1}/{events.length}</span>
          </div>
        </div>

        {/* Studio Grid Body */}
        <div className="sim-studio-grid">
          {/* Column 1: Discrete Event Timeline */}
          <div className="sim-panel event-timeline-panel">
            <div className="sim-panel-title">
              <span>⏱️</span> Discrete Event Chronology
            </div>
            <div className="sim-events-scroll">
              {events.map((ev, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div
                    key={idx}
                    className={`sim-event-row ${isCurrent ? 'current' : isPassed ? 'passed' : 'upcoming'}`}
                    onClick={() => { setIsPlaying(false); setCurrentStepIndex(idx); }}
                  >
                    <div className="sim-event-meta">
                      <span className="sim-event-time">{ev.sim_time_formatted}</span>
                      <span
                        className="sim-event-badge"
                        style={{
                          background: `${getEventBadgeColor(ev.event_type)}20`,
                          color: getEventBadgeColor(ev.event_type),
                          borderColor: `${getEventBadgeColor(ev.event_type)}60`
                        }}
                      >
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="sim-event-headline">{ev.headline}</div>
                    {isCurrent && (
                      <div className="sim-event-details-box">
                        <pre>{JSON.stringify(ev.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: TMVN Road Routing & Bayesian Confidence */}
          <div className="sim-panel center-panel">
            {/* Bayesian Confidence Gauge & Ambiguity Band */}
            <div className="sim-card">
              <div className="sim-card-title">
                <span>🧠</span> Bayesian Posterior Probability & Ambiguity Band
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  State: <strong style={{ color: isReviewReady ? '#34d399' : isAmbiguous ? '#f59e0b' : '#38bdf8' }}>
                    {isReviewReady ? 'REVIEW_READY' : isAmbiguous ? 'VERIFYING (TMVN Tasked)' : 'REPORTED'}
                  </strong>
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: isReviewReady ? '#34d399' : isAmbiguous ? '#f59e0b' : '#38bdf8' }}>
                  {(currentConfidence * 100).toFixed(1)}%
                </span>
              </div>

              {/* Progress bar with Ambiguity Band [35%, 75%] */}
              <div className="sim-gauge-bar-track">
                <div
                  className="sim-ambiguity-band-zone"
                  style={{ left: '35%', width: '40%' }}
                  title="Ambiguity Band [0.35, 0.75]: Triggers TMVN Tasking"
                >
                  <span className="sim-band-label">TMVN AMBIGUITY BAND [35% - 75%]</span>
                </div>
                <div
                  className="sim-gauge-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, currentConfidence * 100))}%`,
                    background: isReviewReady
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : isAmbiguous
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #0284c7, #38bdf8)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                <span>0.0 (Baseline Background)</span>
                <span>0.35 (Tasking Threshold)</span>
                <span>0.75 (Approval Threshold)</span>
                <span>1.0 (Certain)</span>
              </div>
            </div>

            {/* TMVN Road Corridor & Verifier Tasking Card */}
            <div className="sim-card">
              <div className="sim-card-title">
                <span>📍</span> TMVN Active Verifier & Road Network Routing
              </div>
              <div className="sim-verifier-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>
                      {scenario.task_summary.assigned_verifier || "Riya Sharma"}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                      ⭐ 4.8 Rating
                    </span>
                  </div>
                  <span
                    className="sim-badge"
                    style={{
                      background: scenario.task_summary.escalation_tier === 2 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: scenario.task_summary.escalation_tier === 2 ? '#f43f5e' : '#38bdf8',
                      border: `1px solid ${scenario.task_summary.escalation_tier === 2 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
                    }}
                  >
                    Tier-{scenario.task_summary.escalation_tier || 1} {scenario.task_summary.escalation_tier === 2 ? 'Escalated Backup' : 'Primary Candidate'}
                  </span>
                </div>

                <div style={{ marginTop: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.76rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Assigned Target:</span>
                    <div style={{ color: '#e2e8f0', fontWeight: '600' }}>{scenario.target_location}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Task State:</span>
                    <div style={{ color: '#38bdf8', fontWeight: '600' }}>
                      {currentStepIndex >= 9 ? 'EVIDENCE_SUBMITTED' : currentStepIndex >= 6 ? 'EN_ROUTE' : 'INVITED'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Network Corridor:</span>
                    <div style={{ color: '#e2e8f0' }}>Retibunder Circle ➔ Mumbra Creek Link</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Estimated Transit:</span>
                    <div style={{ color: '#e2e8f0' }}>1.8 km (approx 4.2 min)</div>
                  </div>
                </div>

                {scenario.task_summary.evidence_submitted && (
                  <div style={{ marginTop: '0.85rem', padding: '0.6rem', background: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', marginBottom: '0.25rem' }}>
                      ✓ VERIFIED GROUND EVIDENCE INTAKE:
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                      {scenario.task_summary.evidence_submitted.verifier_notes}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                      SHA256: {scenario.task_summary.evidence_submitted.sha256} | Geofence: 28.5m centroid lock
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: XAI Explainability & Multi-Agency Dispatch Planner */}
          <div className="sim-panel right-panel">
            {/* Explainable AI (XAI) Attribution */}
            <div className="sim-card">
              <div className="sim-card-title">
                <span>🔍</span> Explainable AI (XAI) Signal Attributions
              </div>
              <p style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '0.75rem' }}>
                {scenario.xai_explanation.executive_summary || "Multi-sensor additive signal contribution breakdown."}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(scenario.xai_explanation.signal_attributions || []).map((attr, idx) => (
                  <div key={idx} style={{ fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: '600' }}>{attr.source}</span>
                      <span style={{ color: '#38bdf8', fontWeight: '700' }}>{attr.share_percent.toFixed(1)}% share</span>
                    </div>
                    <div style={{ height: '6px', background: '#0b1120', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${attr.share_percent}%`,
                          background: idx === 0 ? '#38bdf8' : idx === 1 ? '#a855f7' : '#10b981'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Multi-Agency Dispatch Package */}
            <div className="sim-card">
              <div className="sim-card-title">
                <span>🚨</span> Simulated Multi-Agency Dispatch Plan
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Mobilized: <strong style={{ color: '#f8fafc' }}>{scenario.dispatch_plan.total_personnel} Personnel</strong> |
                Evac Radius: <strong style={{ color: '#f8fafc' }}>{scenario.dispatch_plan.evacuation_zone_radius_m}m</strong> |
                Shelter: <strong style={{ color: '#34d399' }}>{scenario.dispatch_plan.transit_shelter}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                {(scenario.dispatch_plan.resources || []).map((res, idx) => (
                  <div key={idx} style={{ padding: '0.45rem', background: '#070d17', borderRadius: '6px', border: '1px solid #1f2937', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#e2e8f0' }}>{res.type}</strong>
                      <span style={{ color: '#f59e0b', fontWeight: '700' }}>ETA: {res.eta_min} min</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '0.15rem' }}>
                      Origin: {res.station} ({res.agency})
                    </div>
                  </div>
                ))}
              </div>

              {/* Operator Decision Sign-Off */}
              {scenario.operator_decision && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '700' }}>
                    ✓ OPERATOR SIGN-OFF CONFIRMED:
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                    {scenario.operator_decision.justification}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                    Sig: {scenario.operator_decision.digital_signature ? scenario.operator_decision.digital_signature.slice(0, 24) + '...' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
