import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [isOnline, setIsOnline] = useState(true);
  const [safetyConsentGiven, setSafetyConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [hazardObserved, setHazardObserved] = useState(true);
  const [waterDepthCm, setWaterDepthCm] = useState(45);
  const [observationText, setObservationText] = useState("Underpass flooded. Water level reaches wheel hub of utility vehicles.");
  const [hasPhoto, setHasPhoto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [offlineDrafts, setOfflineDrafts] = useState([
    {
      id: "draft-7712",
      taskId: "task-tmvn-480",
      location: "Airoli Toll Plaza",
      hazard: "FIRE",
      photo: "smoke_plume_01.jpg",
      status: "Synced to Server",
      timestamp: "20 Sep 2026 10:14"
    }
  ]);

  const activeTask = {
    id: "task-tmvn-481",
    incidentId: "FLD-2847",
    hazardType: "FLOOD",
    targetLocation: "Mumbra Central Underpass, Thane",
    distance: "350 meters away",
    expiryMinutes: 14,
    bountyPoints: 50,
    instructions: "Safely photograph flood watermark on underpass pillar without entering moving water."
  };

  const handleAcceptClick = () => {
    if (!safetyConsentGiven) {
      setShowConsentModal(true);
    } else {
      setTaskAccepted(true);
    }
  };

  const handleConfirmConsent = () => {
    setSafetyConsentGiven(true);
    setShowConsentModal(false);
    setTaskAccepted(true);
  };

  const handleSubmitEvidence = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      if (!isOnline) {
        // Save as offline draft
        const newDraft = {
          id: `draft-${Date.now().toString().slice(-4)}`,
          taskId: activeTask.id,
          location: activeTask.targetLocation,
          hazard: activeTask.hazardType,
          photo: "mumbra_flood_water.jpg",
          status: "Pending Network Sync",
          timestamp: new Date().toLocaleTimeString()
        };
        setOfflineDrafts(prev => [newDraft, ...prev]);
        setSubmissionReceipt({
          evidenceId: newDraft.id,
          taskId: activeTask.id,
          status: "SAVED_LOCALLY_OFFLINE",
          sha256: "8e73c91d...4a12f (Tamper Proof Hash)",
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        // Online submission
        setSubmissionReceipt({
          evidenceId: `evi-${Math.random().toString(36).substring(2, 9)}`,
          taskId: activeTask.id,
          status: "FUSED_WITH_BAYESIAN_ENGINE",
          sha256: "8e73c91d...4a12f (Tamper Proof Hash)",
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }, 700);
  };

  return (
    <div className="mobile-shell">
      {/* Top Header */}
      <header className="verifier-header">
        <div className="verifier-title">
          <span>🛡️ TMVN Verifier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setIsOnline(!isOnline)}
            style={{
              fontSize: '0.7rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              fontFamily: 'var(--font-mono)',
              background: isOnline ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.2)',
              color: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
              border: `1px solid ${isOnline ? 'rgba(63, 185, 80, 0.4)' : 'rgba(248, 81, 73, 0.4)'}`
            }}
          >
            {isOnline ? '● Online' : '○ Offline Mode'}
          </button>
          <span className="reputation-badge">★ 98%</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0.25rem 1rem 0 1rem'
      }}>
        {[
          { id: "tasks", label: "Active Task" },
          { id: "queue", label: `Drafts (${offlineDrafts.length})` },
          { id: "profile", label: "Profile" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.6rem 0',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Tasks */}
      {activeTab === "tasks" && (
        <div>
          {/* Safety Banner */}
          <div className="safety-alert">
            <strong>⚠️ SAFETY PROTOCOL FIRST</strong>
            Keep safe distance. Never enter deep moving water, flash flood zones, or smoke plumes.
          </div>

          {submissionReceipt ? (
            <div className="task-card" style={{ textAlign: 'center', borderColor: 'var(--accent-green)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {submissionReceipt.status === 'SAVED_LOCALLY_OFFLINE' ? '💾' : '✅'}
              </div>
              <h3 style={{ color: 'var(--accent-green)', marginBottom: '0.4rem' }}>
                {submissionReceipt.status === 'SAVED_LOCALLY_OFFLINE' ? 'Cached in Offline Storage' : 'Ground Truth Transmitted'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {submissionReceipt.status === 'SAVED_LOCALLY_OFFLINE'
                  ? 'No cellular network detected. Observation signed with SHA-256 and stored locally. Will auto-sync when online.'
                  : 'Observation corroborated and integrated into Mumbai/Thane EOC Bayesian confidence fusion engine.'}
              </p>

              <div style={{
                background: 'var(--bg-input)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                textAlign: 'left'
              }}>
                <div>Receipt: {submissionReceipt.evidenceId}</div>
                <div>Status: {submissionReceipt.status}</div>
                <div>Checksum: {submissionReceipt.sha256}</div>
                <div>Timestamp: {submissionReceipt.timestamp}</div>
              </div>

              <button
                className="btn-submit"
                style={{ marginTop: '1.25rem' }}
                onClick={() => {
                  setSubmissionReceipt(null);
                  setTaskAccepted(false);
                }}
              >
                Awaiting Next Verification
              </button>
            </div>
          ) : !taskAccepted ? (
            <div className="task-card">
              <span className="task-tag tag-flood">VERIFICATION INVITATION</span>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{activeTask.hazardType} Verification</h2>
              <div className="task-distance">📍 {activeTask.distance}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {activeTask.targetLocation}
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                margin: '1rem 0',
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                  Mission Objective:
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {activeTask.instructions}
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                ⏳ Expires in: <strong>{activeTask.expiryMinutes}m</strong> | Reward: <strong>+{activeTask.bountyPoints} pts</strong>
              </div>

              <button className="btn-submit" onClick={handleAcceptClick}>
                Accept Verification Task
              </button>
              <button
                className="btn-decline"
                onClick={() => alert("Task declined. Re-routing to next available volunteer.")}
              >
                Decline (Cannot Reach Location)
              </button>
            </div>
          ) : (
            <div className="task-card">
              <span className="task-tag tag-flood">ACTIVE TASK: {activeTask.id}</span>
              <h3 style={{ marginBottom: '0.5rem' }}>Submit Ground Truth</h3>

              {/* GPS Coordinates */}
              <div className="input-section">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GEOLOCATION LOCK (GPS)</span>
                <div className="gps-box">
                  <span>LAT: 19.2043, LON: 73.0301</span>
                  <span style={{ color: 'var(--accent-green)' }}>● ±3m Accuracy</span>
                </div>
              </div>

              {/* Camera Preview */}
              <div className="input-section">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CAMERA EVIDENCE PHOTO</span>
                <div
                  className={`photo-preview-box ${hasPhoto ? 'has-photo' : ''}`}
                  onClick={() => setHasPhoto(!hasPhoto)}
                >
                  {hasPhoto ? (
                    <>
                      <div style={{ fontSize: '1.5rem' }}>📸</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>mumbra_underpass_watermark.jpg</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>SHA256: 8e73...4a12f (Tamper Proof)</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '1.5rem' }}>📷</div>
                      <div style={{ fontSize: '0.8rem' }}>Tap to capture or select evidence photo</div>
                    </>
                  )}
                </div>
              </div>

              {/* Hazard Presence Toggle */}
              <div className="input-section">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HAZARD CONFIRMED ON SCENE?</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setHazardObserved(true)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: hazardObserved ? '2px solid var(--accent-red)' : '1px solid var(--border)',
                      background: hazardObserved ? 'rgba(248, 81, 73, 0.2)' : 'var(--bg-input)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    YES, ACTIVE HAZARD
                  </button>
                  <button
                    type="button"
                    onClick={() => setHazardObserved(false)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: !hazardObserved ? '2px solid var(--accent-green)' : '1px solid var(--border)',
                      background: !hazardObserved ? 'rgba(63, 185, 80, 0.2)' : 'var(--bg-input)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    NO, FALSE ALARM
                  </button>
                </div>
              </div>

              {/* Water Depth Slider */}
              <div className="input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>ESTIMATED WATER DEPTH</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{waterDepthCm} cm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={waterDepthCm}
                  onChange={e => setWaterDepthCm(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
              </div>

              {/* Observation Field Notes */}
              <div className="input-section">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FIELD OBSERVATION NOTES</span>
                <textarea
                  style={{
                    width: '100%',
                    height: '65px',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem'
                  }}
                  value={observationText}
                  onChange={e => setObservationText(e.target.value)}
                />
              </div>

              <button
                className="btn-submit"
                disabled={isSubmitting || !hasPhoto}
                onClick={handleSubmitEvidence}
              >
                {isSubmitting ? "Cryptographically Signing..." : isOnline ? "Submit Ground Truth Evidence" : "Save as Offline Draft"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Offline Drafts Queue */}
      {activeTab === "queue" && (
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Draft & Submission History</span>
            <button
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                padding: '0.3rem 0.6rem',
                border: '1px solid var(--border)',
                borderRadius: '6px'
              }}
              onClick={() => alert("All offline drafts synchronized with server.")}
            >
              Sync All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {offlineDrafts.map(d => (
              <div key={d.id} className="task-card" style={{ margin: 0, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{d.taskId}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: d.status.includes('Synced') ? 'var(--accent-green)' : 'var(--accent-amber)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {d.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {d.location}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  File: {d.photo} | {d.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div style={{ padding: '1rem' }}>
          <div className="task-card" style={{ textAlign: 'center', margin: 0 }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-input)',
              border: '2px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              margin: '0 auto 0.75rem auto'
            }}>
              RS
            </div>
            <h3>Riya Sharma</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Level 4 Certified Field Verifier
            </div>
            <div style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
              Thane & Mumbra Disaster Basin
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              marginTop: '1.25rem'
            }}>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-green)' }}>98%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reputation Score</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-amber)' }}>420</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verification Points</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Protocol Consent Modal */}
      {showConsentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--accent-amber)',
            borderRadius: '12px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '380px'
          }}>
            <h3 style={{ color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>⚠️ Safety & Consent Notice</h3>
            <div style={{ fontSize: '0.85rem', color: '#f0e6d2', lineHeight: '1.4', marginBottom: '1rem' }}>
              You are about to accept a field verification task near an active flood zone.
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Do not wade or drive into fast-flowing water.</li>
                <li>Stay on elevated, stable road surfaces.</li>
                <li>Retreat immediately if water or smoke expands.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-decline"
                style={{ flex: 1, marginTop: 0 }}
                onClick={() => setShowConsentModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                style={{ flex: 1, marginTop: 0, background: 'var(--accent-amber)', color: '#000' }}
                onClick={handleConfirmConsent}
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
