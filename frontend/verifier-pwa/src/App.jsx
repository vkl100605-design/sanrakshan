import React, { useState } from 'react';

export default function App() {
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [hazardObserved, setHazardObserved] = useState(true);
  const [observationText, setObservationText] = useState("Underpass water depth ~40cm; road impassable for small cars");
  const [hasPhoto, setHasPhoto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);

  const mockTask = {
    id: "task-tmvn-481",
    incidentId: "inc-2026-blr-01",
    hazardType: "FLOOD",
    targetLocation: "Central Underpass, 4th Cross",
    distance: "350 meters away",
    expiryMinutes: 18,
    bountyPoints: 50
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionReceipt({
        evidenceId: "evi-77491-sha",
        taskId: mockTask.id,
        status: "RECORDED_AND_QUEUED_FOR_BAYESIAN_FUSION",
        sha256: "9f83a4b2c1d0...a829e",
        timestamp: new Date().toLocaleTimeString()
      });
    }, 800);
  };

  return (
    <div className="mobile-shell">
      {/* Header */}
      <header className="verifier-header">
        <div className="verifier-title">
          <span>🛡️ TMVN Verifier</span>
        </div>
        <span className="reputation-badge">★ Rep Score: 98%</span>
      </header>

      {/* Safety Warning */}
      <div className="safety-alert">
        <strong>⚠️ SAFETY PROTOCOL FIRST</strong>
        Do NOT put yourself in danger or enter deep rushing water/flames. Verify strictly from a secure distance.
      </div>

      {submissionReceipt ? (
        <div className="task-card" style={{ textAlign: 'center', borderColor: 'var(--accent-green)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>Evidence Verified & Submitted</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Thank you! Your observation has been hashed and submitted to the Bayesian Fusion engine.
          </p>
          <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }}>
            <div>Receipt ID: {submissionReceipt.evidenceId}</div>
            <div>Task: {submissionReceipt.taskId}</div>
            <div>SHA-256: {submissionReceipt.sha256}</div>
            <div>Recorded At: {submissionReceipt.timestamp}</div>
          </div>
          <button
            className="btn-submit"
            style={{ marginTop: '1.5rem' }}
            onClick={() => {
              setSubmissionReceipt(null);
              setTaskAccepted(false);
            }}
          >
            Awaiting Next Nearby Task
          </button>
        </div>
      ) : !taskAccepted ? (
        <div className="task-card">
          <span className="task-tag tag-flood">VERIFICATION INVITATION</span>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{mockTask.hazardType} Verification</h2>
          <div className="task-distance">📍 {mockTask.distance} ({mockTask.targetLocation})</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.75rem 0' }}>
            Ambiguity band detected ($0.35 \le P \le 0.75$). Control room requests ground truth confirmation before resource dispatch.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            ⏳ Auto-expires in: <strong>{mockTask.expiryMinutes} minutes</strong> | Reward: <strong>+{mockTask.bountyPoints} pts</strong>
          </div>

          <button className="btn-submit" onClick={() => setTaskAccepted(true)}>
            Accept Verification Task
          </button>
          <button className="btn-decline" onClick={() => alert("Task declined. Re-routing to next available volunteer.")}>
            Decline (Too Far / Busy)
          </button>
        </div>
      ) : (
        <div className="task-card">
          <span className="task-tag tag-flood">IN PROGRESS: {mockTask.id}</span>
          <h3 style={{ marginBottom: '0.5rem' }}>Submit Ground Truth</h3>

          {/* GPS Coordinates */}
          <div className="input-section">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>GEOLOCATION SENSOR</span>
            <div className="gps-box">
              <span>LAT: 12.9716, LON: 77.5946</span>
              <span style={{ color: 'var(--accent-green)' }}>● ±3m Accuracy</span>
            </div>
          </div>

          {/* Photo Preview */}
          <div className="input-section">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CAMERA EVIDENCE</span>
            <div
              className={`photo-preview-box ${hasPhoto ? 'has-photo' : ''}`}
              onClick={() => setHasPhoto(!hasPhoto)}
            >
              {hasPhoto ? (
                <>
                  <div style={{ fontSize: '1.5rem' }}>📸</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>flood_water_underpass.jpg (1.8 MB)</div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>SHA256: 9f83...a829e (Validated)</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '1.5rem' }}>📷</div>
                  <div style={{ fontSize: '0.8rem' }}>Tap to capture or select photo</div>
                </>
              )}
            </div>
          </div>

          {/* Hazard Confirmed Toggle */}
          <div className="input-section" style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>IS HAZARD PRESENT?</span>
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
                  fontWeight: '700'
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
                  fontWeight: '700'
                }}
              >
                NO, FALSE ALARM
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="input-section">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>FIELD NOTES</span>
            <textarea
              style={{
                width: '100%',
                height: '70px',
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
            onClick={handleSubmit}
          >
            {isSubmitting ? "Uploading & Hashing..." : "Submit Ground Truth Evidence"}
          </button>
        </div>
      )}
    </div>
  );
}
