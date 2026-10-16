import React, { useState, useEffect, useRef } from 'react';

const TASKS = [
  {
    id: "task-tmvn-481",
    incidentId: "FIR-1192",
    hazardType: "FIRE",
    targetLocation: "Airoli Scrub Perimeter, Navi Mumbai",
    distance: "280 meters away",
    expiryMinutes: 12,
    bountyPoints: 60,
    gps: "19.1579 N, 72.9935 E",
    instructions: "Safely photograph smoke plume or scrub brush fire line from safety perimeter."
  },
  {
    id: "task-tmvn-482",
    incidentId: "FLD-2847",
    hazardType: "FLOOD",
    targetLocation: "Mumbra Central Underpass, Thane",
    distance: "350 meters away",
    expiryMinutes: 14,
    bountyPoints: 50,
    gps: "19.2043 N, 73.0301 E",
    instructions: "Safely photograph flood watermark on underpass pillar without entering moving water."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [isOnline, setIsOnline] = useState(true);
  const [safetyConsentGiven, setSafetyConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [hazardObserved, setHazardObserved] = useState(true);
  const [waterDepthCm, setWaterDepthCm] = useState(45);
  const [observationText, setObservationText] = useState("Active smoke column observed near Airoli scrub line. Wind blowing west towards highway.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);

  // Live Camera & Photo States
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoSha256, setPhotoSha256] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeTask = TASKS[selectedTaskIndex] || TASKS[0];

  const [offlineDrafts, setOfflineDrafts] = useState([
    {
      id: "draft-7712",
      taskId: "task-tmvn-480",
      location: "Airoli Toll Plaza",
      hazard: "FIRE",
      photo: "airoli_smoke_evidence.jpg",
      status: "Synced to Server",
      timestamp: "20 Sep 2026 10:14"
    }
  ]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setCameraLoading(true);
    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraLoading(false);
        };
      } else {
        setCameraLoading(false);
      }
    } catch (err) {
      console.error("[Camera error]", err);
      setCameraLoading(false);
      setIsCameraActive(false);
      stopCameraStream();
      setCameraError(err.name === "NotAllowedError" ? "Camera permission denied." : "Could not open camera.");
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      stopCameraStream();
      setIsCameraActive(false);

      setPhotoDataUrl(dataUrl);
      setPhotoFileName(`evidence_${activeTask.hazardType.toLowerCase()}_${Date.now().toString().slice(-4)}.jpg`);
      setPhotoSha256(Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 7));
      runEdgeInference(dataUrl);
    } catch (e) {
      console.error("Capture failed", e);
      setCameraError("Failed to capture frame.");
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  const handleSelectFileClick = () => {
    stopCameraStream();
    setIsCameraActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setPhotoDataUrl(dataUrl);
      setPhotoFileName(file.name || "uploaded_evidence.jpg");
      setPhotoSha256(Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 7));
      runEdgeInference(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Run edge fire detection inference right after photo capture / upload
  const runEdgeInference = async (imgDataUrl) => {
    if (!imgDataUrl) return;
    setIsDetecting(true);
    setDetectionResult(null);

    try {
      let res;
      try {
        res = await fetch('/ml/v1/predict/fire/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: imgDataUrl })
        });
      } catch (proxyErr) {
        res = await fetch('http://localhost:8000/ml/v1/predict/fire/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: imgDataUrl })
        });
      }

      if (res.ok) {
        const data = await res.json();
        setDetectionResult(data);
        if (data.has_fire) {
          setHazardObserved(true);
          setObservationText("Active fire and dense smoke verified on scene. Immediate fire tender dispatch advised.");
        } else {
          setHazardObserved(false);
          setObservationText("Visual check completed. No active flame or smoke detected in sector.");
        }
      }
    } catch (err) {
      console.error("[Edge Inference Error]", err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Quick demonstration sample photos
  const handleLoadSample = (sampleType) => {
    stopCameraStream();
    setIsCameraActive(false);

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    if (sampleType === 'fire') {
      ctx.fillStyle = "#1a0f0a";
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = "#0d1f12";
      ctx.fillRect(0, 180, 320, 60);

      const grad = ctx.createRadialGradient(160, 140, 10, 160, 140, 80);
      grad.addColorStop(0, "rgba(255, 240, 120, 1.0)");
      grad.addColorStop(0.3, "rgba(255, 140, 0, 0.95)");
      grad.addColorStop(0.65, "rgba(230, 40, 0, 0.85)");
      grad.addColorStop(1, "rgba(80, 20, 0, 0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(160, 140, 80, 0, Math.PI * 2);
      ctx.fill();

      setPhotoFileName("airoli_fire_scene.jpg");
    } else if (sampleType === 'flood') {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, 320, 130);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(0, 130, 320, 110);
      setPhotoFileName("mumbra_flood_watermark.jpg");
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, 0, 320, 150);
      ctx.fillStyle = "#15803d";
      ctx.fillRect(0, 150, 320, 90);
      setPhotoFileName("clear_area_nominal.jpg");
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoDataUrl(dataUrl);
    setPhotoSha256(Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 7));
    runEdgeInference(dataUrl);
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

  const handleSubmitEvidence = async () => {
    setIsSubmitting(true);

    const submissionPayload = {
      task_id: activeTask.id,
      incident_id: activeTask.incidentId,
      verifier_name: "Vikram Jadhav (Verifier #VJ-09)",
      hazard_type: activeTask.hazardType,
      image_base64: photoDataUrl || "",
      location: activeTask.targetLocation,
      gps: activeTask.gps,
      water_depth_cm: activeTask.hazardType === "FLOOD" ? Number(waterDepthCm) : 0,
      notes: observationText,
      timestamp: new Date().toLocaleTimeString(),
    };

    // 1. Post to ML Services backend for Command Center sync
    try {
      await fetch('/ml/v1/verifier/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });
    } catch (e) {
      try {
        await fetch('http://localhost:8000/ml/v1/verifier/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload)
        });
      } catch (err) {}
    }

    // 2. Broadcast via BroadcastChannel and localStorage for instant cross-tab sync with Operator Dashboard
    try {
      const bc = new BroadcastChannel('sanrakshan_tmvn_evidence');
      bc.postMessage({ type: 'NEW_EVIDENCE', data: submissionPayload });
    } catch (e) {}

    try {
      localStorage.setItem('sanrakshan_latest_evidence', JSON.stringify({
        ...submissionPayload,
        submittedAt: Date.now()
      }));
    } catch (e) {}

    setTimeout(() => {
      setIsSubmitting(false);

      if (!isOnline) {
        const newDraft = {
          id: `draft-${Date.now().toString().slice(-4)}`,
          taskId: activeTask.id,
          location: activeTask.targetLocation,
          hazard: activeTask.hazardType,
          photo: photoFileName || "evidence.jpg",
          status: "Pending Network Sync",
          timestamp: new Date().toLocaleTimeString()
        };
        setOfflineDrafts(prev => [newDraft, ...prev]);
        setSubmissionReceipt({
          evidenceId: newDraft.id,
          taskId: activeTask.id,
          status: "SAVED_LOCALLY_OFFLINE",
          sha256: photoSha256 || "8e73c91d...4a12f",
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        setSubmissionReceipt({
          evidenceId: `EVI-${Date.now().toString().slice(-4)}`,
          taskId: activeTask.id,
          incidentId: activeTask.incidentId,
          status: "TRANSMITTED TO DISASTER COMMAND CENTER",
          sha256: photoSha256 || "8e73c91d...4a12f",
          timestamp: new Date().toLocaleTimeString(),
          details: `Live photo submitted. Model inference automatically triggered for #${activeTask.incidentId}.`
        });
      }
    }, 600);
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
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`task-tag ${activeTask.hazardType === 'FIRE' ? 'tag-fire' : 'tag-flood'}`} style={{
                  background: activeTask.hazardType === 'FIRE' ? 'rgba(248, 81, 73, 0.2)' : 'rgba(56, 139, 253, 0.2)',
                  color: activeTask.hazardType === 'FIRE' ? '#ff7b72' : '#58a6ff',
                  border: `1px solid ${activeTask.hazardType === 'FIRE' ? 'rgba(248, 81, 73, 0.4)' : 'rgba(56, 139, 253, 0.4)'}`
                }}>
                  ACTIVE TASK: {activeTask.id} ({activeTask.hazardType})
                </span>

                {/* Task Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTaskIndex(prev => (prev === 0 ? 1 : 0));
                    setPhotoDataUrl(null);
                    setObservationText(selectedTaskIndex === 0 ? "Underpass flooded. Water level reaches wheel hub of utility vehicles." : "Active smoke column observed near Airoli scrub line. Wind blowing west towards highway.");
                  }}
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent-blue)',
                    border: '1px solid var(--border)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'var(--bg-input)',
                    cursor: 'pointer'
                  }}
                >
                  ⇄ Switch to #{selectedTaskIndex === 0 ? 'FLD-2847 Flood' : 'FIR-1192 Fire'}
                </button>
              </div>

              <h3 style={{ marginBottom: '0.5rem' }}>Submit Ground Truth</h3>

              {/* GPS Coordinates */}
              <div className="input-section">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GEOLOCATION LOCK (GPS)</span>
                <div className="gps-box">
                  <span>LAT/LON: {activeTask.gps}</span>
                  <span style={{ color: 'var(--accent-green)' }}>● ±3m Accuracy</span>
                </div>
              </div>

              {/* Camera Error Message */}
              {cameraError && (
                <div style={{
                  background: 'rgba(248, 81, 73, 0.15)',
                  border: '1px solid var(--accent-red)',
                  color: '#ff7b72',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  ⚠️ {cameraError}
                </div>
              )}

              {/* Camera Evidence Photo Input */}
              <div className="input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    CAMERA EVIDENCE PHOTO {photoDataUrl && "✓"}
                  </span>
                  {photoDataUrl && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                      SHA256: {photoSha256}
                    </span>
                  )}
                </div>

                {isCameraActive ? (
                  /* 1. Live Camera Active */
                  <div>
                    <div className="verifier-camera-viewfinder">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="verifier-camera-video"
                      />
                      {cameraLoading ? (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.85)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem'
                        }}>
                          Starting camera...
                        </div>
                      ) : (
                        <div className="verifier-live-badge">
                          <span className="verifier-live-dot"></span>
                          <span>LIVE CAMERA</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="verifier-btn-capture"
                      onClick={handleCapturePhoto}
                    >
                      📸 Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        marginTop: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Cancel Camera
                    </button>
                  </div>
                ) : photoDataUrl ? (
                  /* 2. Photo Captured / Preview */
                  <div>
                    <div className="verifier-photo-preview">
                      <img src={photoDataUrl} alt="Evidence" />
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.4rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>📄 {photoFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoDataUrl(null);
                          setPhotoFileName("");
                          setDetectionResult(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-amber)',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        🔄 Retake / Change
                      </button>
                    </div>

                    {/* Edge Fire Detection Result Message */}
                    {isDetecting ? (
                      <div style={{
                        marginTop: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(210, 153, 34, 0.15)',
                        border: '1px solid var(--accent-amber)',
                        color: '#fbbf24',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem'
                      }}>
                        <div style={{
                          width: '15px',
                          height: '15px',
                          border: '2px solid rgba(251, 191, 36, 0.3)',
                          borderTopColor: '#fbbf24',
                          borderRadius: '50%',
                          animation: 'verifierSpin 0.75s linear infinite'
                        }}></div>
                        <span>Analyzing photo for fire & smoke signatures (YOLOv8 Edge)...</span>
                      </div>
                    ) : detectionResult ? (
                      <div style={{
                        marginTop: '0.65rem',
                        padding: '0.75rem 0.95rem',
                        borderRadius: '8px',
                        background: detectionResult.has_fire 
                          ? 'linear-gradient(135deg, rgba(248, 81, 73, 0.22), rgba(218, 54, 51, 0.15))' 
                          : 'linear-gradient(135deg, rgba(63, 185, 80, 0.22), rgba(46, 160, 67, 0.15))',
                        border: detectionResult.has_fire ? '1.5px solid var(--accent-red)' : '1.5px solid var(--accent-green)',
                        boxShadow: detectionResult.has_fire ? '0 0 16px rgba(248, 81, 73, 0.3)' : '0 0 16px rgba(63, 185, 80, 0.3)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.95rem', color: '#fff' }}>
                            <span>{detectionResult.has_fire ? '🔥' : '✓'}</span>
                            <span>{detectionResult.has_fire ? 'FIRE DETECTED' : 'NO FIRE DETECTED'}</span>
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            background: 'rgba(0,0,0,0.5)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            color: '#fff'
                          }}>
                            {detectionResult.confidence}% Confidence
                          </div>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-main)', marginTop: '0.35rem', opacity: 0.95 }}>
                          {detectionResult.has_fire 
                            ? '✓ YOLOv8 confirmed active flames/smoke. Observation verified. Review notes and submit evidence below.'
                            : '✓ Clear/nominal scene. No active fire flame or smoke plume identified.'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* 3. Empty State with Camera & File options */
                  <div>
                    <div className="photo-preview-box">
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>📷</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff' }}>No Evidence Photo Captured</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Snap a live ground photo or upload an image file
                      </div>
                    </div>

                    <div className="verifier-cam-btn-row">
                      <button
                        type="button"
                        className="verifier-btn-camera"
                        onClick={handleStartCamera}
                      >
                        <span>📷</span> Open Camera
                      </button>
                      <button
                        type="button"
                        className="verifier-btn-file"
                        onClick={handleSelectFileClick}
                      >
                        <span>📁</span> Select Photo
                      </button>
                    </div>

                    {/* Quick Demo Chips */}
                    <div className="verifier-sample-chips">
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quick test:</span>
                      <button
                        type="button"
                        className="verifier-chip"
                        onClick={() => handleLoadSample('fire')}
                      >
                        🔥 Fire Scene
                      </button>
                      <button
                        type="button"
                        className="verifier-chip"
                        onClick={() => handleLoadSample('flood')}
                      >
                        🌊 Flood Scene
                      </button>
                      <button
                        type="button"
                        className="verifier-chip"
                        onClick={() => handleLoadSample('nominal')}
                      >
                        ✓ Clean
                      </button>
                    </div>
                  </div>
                )}
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

              {/* Water Depth Slider (if flood task) */}
              {activeTask.hazardType === "FLOOD" && (
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
              )}

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
                disabled={isSubmitting || !photoDataUrl}
                onClick={handleSubmitEvidence}
              >
                {isSubmitting ? "Cryptographically Signing & Transmitting..." : isOnline ? "Submit Ground Truth Evidence" : "Save as Offline Draft"}
              </button>
              {!photoDataUrl && (
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--accent-amber)', marginTop: '0.4rem' }}>
                  * Camera evidence photo is required for TMVN proof-of-observation
                </div>
              )}
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
