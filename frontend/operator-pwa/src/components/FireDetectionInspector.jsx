import React, { useState, useRef, useEffect } from 'react';

export default function FireDetectionInspector({ incident }) {
  // 1. Initial State: No image selected initially (no preloaded/default image)
  const [imageSrc, setImageSrc] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeVerifierSubmission, setActiveVerifierSubmission] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastProcessedSubmissionId = useRef(null);

  // Sync with Verifier submissions in real time
  useEffect(() => {
    // 1. BroadcastChannel listener
    let bc;
    try {
      bc = new BroadcastChannel('sanrakshan_tmvn_evidence');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_EVIDENCE' && event.data.data?.image_base64) {
          handleIncomingVerifierEvidence(event.data.data);
        }
      };
    } catch (e) {}

    // 2. Storage event listener (across browser windows/ports)
    const handleStorage = (e) => {
      if (e.key === 'sanrakshan_latest_evidence' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.image_base64) {
            handleIncomingVerifierEvidence(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Periodic backend polling from /ml/v1/verifier/latest
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/ml/v1/verifier/latest');
        if (res.ok) {
          const json = await res.json();
          if (json.submission && json.submission.id !== lastProcessedSubmissionId.current) {
            handleIncomingVerifierEvidence(json.submission);
          }
        }
      } catch (err) {}
    }, 2500);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
      stopCameraStream();
    };
  }, []);

  const handleIncomingVerifierEvidence = (submission) => {
    if (!submission?.image_base64) return;
    if (submission.id && submission.id === lastProcessedSubmissionId.current) return;
    lastProcessedSubmissionId.current = submission.id;

    setActiveVerifierSubmission(submission);
    setImageSrc(submission.image_base64);
    setIsCameraOpen(false);
    stopCameraStream();

    // Automatically trigger YOLOv8 & vision pipeline
    runInference(submission.image_base64);
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // Option 1: Select File
  // -------------------------------------------------------------
  const handleSelectFileClick = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setImageSrc(dataUrl);
      // Auto-analyze or let user click Analyze
      runInference(dataUrl);
    };
    reader.onerror = () => {
      setError("Failed to read the selected file. Please try another image.");
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Option 2: Open Camera (Webcam / Mobile Camera)
  // -------------------------------------------------------------
  const handleOpenCameraClick = async () => {
    setError(null);
    setResult(null);
    setImageSrc(null);
    setCameraError(null);
    setCameraLoading(true);
    setIsCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
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
      console.error("[Camera Error]", err);
      setCameraLoading(false);
      setIsCameraOpen(false);
      stopCameraStream();

      let friendlyMsg = "Unable to access camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        friendlyMsg = "Camera permission was denied. Please allow camera permissions in your browser or select an image file.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        friendlyMsg = "No camera hardware detected on this device. Please use 'Select File' to test with an image.";
      } else {
        friendlyMsg = `Camera error: ${err.message || "Device busy or unsupported"}. Please upload a file instead.`;
      }
      setCameraError(friendlyMsg);
    }
  };

  const handleCaptureImage = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);

      const capturedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

      // Stop camera hardware
      stopCameraStream();
      setIsCameraOpen(false);

      // Set captured image and run inference
      setImageSrc(capturedDataUrl);
      runInference(capturedDataUrl);
    } catch (err) {
      console.error("[Capture Error]", err);
      setError("Failed to capture frame from camera stream. Please try again.");
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraLoading(false);
    setCameraError(null);
  };

  // -------------------------------------------------------------
  // Fire Detection Inference Pipeline
  // -------------------------------------------------------------
  const runInference = async (imgDataUrl) => {
    const dataToSend = imgDataUrl || imageSrc;
    if (!dataToSend) {
      setError("Please select or capture an image first.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // First try relative proxy endpoint /ml/v1/predict/fire/image
      // Fallback to direct http://localhost:8000/ml/v1/predict/fire/image
      let response;
      try {
        response = await fetch('/ml/v1/predict/fire/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: dataToSend }),
        });
      } catch (proxyErr) {
        // Fallback direct port
        response = await fetch('http://localhost:8000/ml/v1/predict/fire/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: dataToSend }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("[Inference Error]", err);
      setError(
        err.message?.includes("Failed to fetch")
          ? "ML inference service is unreachable at port 8000. Ensure 'python -m uvicorn src.main:app' is running."
          : `Inference failed: ${err.message}`
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    stopCameraStream();
    setImageSrc(null);
    setIsCameraOpen(false);
    setResult(null);
    setError(null);
    setCameraError(null);
  };

  // Quick test sample loader for convenient demonstration
  const handleLoadSample = (sampleType) => {
    stopCameraStream();
    setIsCameraOpen(false);
    setError(null);
    setResult(null);

    // Create a canvas-generated real fire or non-fire test image
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    if (sampleType === 'fire') {
      // Fire scene: dark background with bright yellow-orange-red flame core
      ctx.fillStyle = "#1a0f0a";
      ctx.fillRect(0, 0, 320, 240);

      // Forest silhouette
      ctx.fillStyle = "#0d1f12";
      ctx.fillRect(0, 180, 320, 60);

      // Intense flame gradient
      const grad = ctx.createRadialGradient(160, 140, 10, 160, 140, 80);
      grad.addColorStop(0, "rgba(255, 240, 120, 1.0)");
      grad.addColorStop(0.3, "rgba(255, 140, 0, 0.95)");
      grad.addColorStop(0.65, "rgba(230, 40, 0, 0.85)");
      grad.addColorStop(1, "rgba(80, 20, 0, 0.0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(160, 140, 80, 0, Math.PI * 2);
      ctx.fill();

      // Smoke haze
      ctx.fillStyle = "rgba(100, 95, 90, 0.35)";
      ctx.fillRect(100, 40, 120, 70);
    } else {
      // Non-fire scene: blue sky and green landscape
      const sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, "#38bdf8");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 320, 160);

      // Green grass
      ctx.fillStyle = "#15803d";
      ctx.fillRect(0, 160, 320, 80);

      // Neutral structure/building
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(110, 100, 100, 70);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setImageSrc(dataUrl);
    runInference(dataUrl);
  };

  return (
    <div className="fire-inspector-card">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="fire-inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.05rem' }}>🔥</span>
          <span className="section-label" style={{ color: '#fff', fontSize: '0.85rem' }}>
            Visual Fire Detection (AI Inference)
          </span>
        </div>
        <span className="fire-status-tag">YOLOv8 Real-Time</span>
      </div>

      {/* Live Verifier Sync Notification Banner */}
      {activeVerifierSubmission && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(16, 185, 129, 0.12))',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          borderRadius: '6px',
          padding: '0.45rem 0.65rem',
          fontSize: '0.74rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📡</span>
            <span style={{ color: '#fff' }}>
              Ground Verifier Evidence: <strong>{activeVerifierSubmission.verifier_name}</strong>
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#38bdf8' }}>
            {activeVerifierSubmission.timestamp}
          </span>
        </div>
      )}

      {/* Camera Error Message */}
      {cameraError && (
        <div className="fire-error-banner" style={{ marginBottom: '0.75rem' }}>
          <span>⚠️ {cameraError}</span>
          <button className="fire-banner-close" onClick={() => setCameraError(null)}>✕</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fire-error-banner" style={{ marginBottom: '0.75rem' }}>
          <span>⚠️ {error}</span>
          <button className="fire-banner-close" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* State A: Live Camera Active */}
      {/* -------------------------------------------------------- */}
      {isCameraOpen ? (
        <div className="fire-camera-container">
          <div className="fire-camera-viewfinder">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="fire-camera-video"
            />
            {cameraLoading ? (
              <div className="fire-camera-loading-overlay">
                <div className="fire-spinner"></div>
                <span>Requesting camera permission...</span>
              </div>
            ) : (
              <div className="fire-camera-badge">
                <span className="fire-live-dot"></span>
                <span>LIVE CAMERA FEED</span>
              </div>
            )}
          </div>

          <div className="fire-camera-controls">
            <button
              className="fire-btn-capture"
              onClick={handleCaptureImage}
              disabled={cameraLoading}
            >
              <span>📸</span> Capture Image
            </button>
            <button
              className="fire-btn-secondary"
              onClick={handleCloseCamera}
            >
              ✕ Close Camera
            </button>
          </div>
        </div>
      ) : imageSrc ? (
        /* -------------------------------------------------------- */
        /* State B: Image Preview Area (Selected or Captured)       */
        /* -------------------------------------------------------- */
        <div className="fire-preview-container">
          <div className="fire-preview-viewport">
            <img src={imageSrc} alt="Input Frame" className="fire-preview-img" />

            {/* Bounding box overlays if fire detected */}
            {result?.has_fire && result?.bounding_boxes?.map((box, idx) => (
              <div
                key={idx}
                className="fire-bounding-box"
                style={{
                  left: `${box.x_percent}%`,
                  top: `${box.y_percent}%`,
                  width: `${box.width_percent}%`,
                  height: `${box.height_percent}%`,
                }}
              >
                <span className="fire-box-label">
                  FLAME {box.confidence}%
                </span>
              </div>
            ))}

            {/* Processing Loading Overlay */}
            {analyzing && (
              <div className="fire-analyzing-overlay">
                <div className="fire-spinner"></div>
                <span className="fire-analyzing-text">Analyzing image...</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Running YOLOv8 & Chromatic Vision Pipeline
                </span>
              </div>
            )}
          </div>

          {/* Action Row for Preview */}
          <div className="fire-preview-actions">
            <button
              className="fire-btn-analyze"
              onClick={() => runInference()}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <div className="fire-btn-spinner"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>⚡</span> Run Fire Detection
                </>
              )}
            </button>

            <button
              className="fire-btn-secondary"
              onClick={handleReset}
              disabled={analyzing}
              title="Change image or retake"
            >
              🔄 Change / Retake
            </button>
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------- */
        /* State C: Empty/Initial State (No image selected)        */
        /* -------------------------------------------------------- */
        <div className="fire-empty-state">
          <div className="fire-empty-dropzone">
            <div className="fire-empty-icon-circle">
              <span>📷</span>
            </div>
            <div className="fire-empty-title">No Image Selected</div>
            <div className="fire-empty-subtitle">
              Upload a ground evidence photo or launch the live device camera to run AI fire detection.
            </div>

            {/* Two Required Clear Options */}
            <div className="fire-input-options-row">
              <button
                className="fire-btn-input-option select-file"
                onClick={handleSelectFileClick}
              >
                <span>📁</span>
                <div className="fire-btn-opt-content">
                  <span className="fire-btn-opt-title">Select File</span>
                  <span className="fire-btn-opt-desc">JPG, PNG, WEBP</span>
                </div>
              </button>

              <button
                className="fire-btn-input-option open-camera"
                onClick={handleOpenCameraClick}
              >
                <span>📷</span>
                <div className="fire-btn-opt-content">
                  <span className="fire-btn-opt-title">Open Camera</span>
                  <span className="fire-btn-opt-desc">Live Device Stream</span>
                </div>
              </button>
            </div>

            {/* 1-Click Quick Demo Samples for Judges */}
            <div className="fire-demo-samples-row">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Judge quick test:</span>
              <button
                type="button"
                className="fire-sample-chip fire"
                onClick={() => handleLoadSample('fire')}
              >
                🔥 Sample Fire
              </button>
              <button
                type="button"
                className="fire-sample-chip non-fire"
                onClick={() => handleLoadSample('non_fire')}
              >
                ✓ Sample Non-Fire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* Results Display Area: Highly Visible Result              */}
      {/* -------------------------------------------------------- */}
      {result && (
        <div className={`fire-result-card ${result.has_fire ? 'detected' : 'not-detected'}`}>
          <div className="fire-result-badge-row">
            {result.has_fire ? (
              <div className="fire-badge detected">
                <span className="fire-badge-icon">🔥</span>
                <span className="fire-badge-text">FIRE DETECTED</span>
              </div>
            ) : (
              <div className="fire-badge not-detected">
                <span className="fire-badge-icon">✓</span>
                <span className="fire-badge-text">NO FIRE DETECTED</span>
              </div>
            )}

            <div className="fire-confidence-badge">
              <span className="fire-conf-label">Confidence:</span>
              <span className="fire-conf-value">{result.confidence}%</span>
            </div>
          </div>

          <div className="fire-result-metrics-grid">
            <div className="fire-metric-cell">
              <span className="metric-label">Model Architecture</span>
              <span className="metric-value">{result.model || "YOLOv8-Fire"}</span>
            </div>
            <div className="fire-metric-cell">
              <span className="metric-label">Inference Latency</span>
              <span className="metric-value">{result.latency_ms} ms</span>
            </div>
            <div className="fire-metric-cell">
              <span className="metric-label">Flame Pixel Density</span>
              <span className="metric-value">
                {result.flame_pixels_pct !== undefined ? `${result.flame_pixels_pct}%` : "0.0%"}
              </span>
            </div>
            <div className="fire-metric-cell">
              <span className="metric-label">Decision Status</span>
              <span className="metric-value" style={{ color: result.has_fire ? 'var(--color-rose)' : 'var(--color-emerald)' }}>
                {result.has_fire ? "Confirmed Hazard" : "Nominal / Safe"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
