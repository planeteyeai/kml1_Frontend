import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import MapComponent from "./MapComponent";
import PipelineView from "./PipelineView";
import Login from "./Login";
import { useAuth } from "./AuthContext";
import API_URL from "./config";
import { apiHeaders } from "./apiHeaders";
import DistressReport from "./DistressReport";
import DistressPredicted from "./DistressPredicted";
import InventoryCard from "./InventoryCard";
import KMLSelection from "./KMLSelection";
import KML1Form from "./KML1Form";
import KML2Form from "./KML2Form";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

const getLocalDraftKey = (username) => `kml_local_draft_${username || "anonymous"}`;

function MainKmlApp() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
  const [chainage, setChainage] = useState('');
  const [offsetType, setOffsetType] = useState('');
  const [laneCount, setLaneCount] = useState('2');
  const [kmlMergeOffset, setKmlMergeOffset] = useState('');
  const [startDate, setStartDate] = useState('2026-02-10');
  const [endDate, setEndDate] = useState('2026-02-20');
  const [imageDirection, setImageDirection] = useState('down_to_up');
  const [showPipeline, setShowPipeline] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState('');
  const [pipelineInitialPath, setPipelineInitialPath] = useState('');
  const [initialGeoJson, setInitialGeoJson] = useState(null);
  const [distressLoading, setDistressLoading] = useState(false);
  const [distressError, setDistressError] = useState('');
  const [distressResults, setDistressResults] = useState(null);
  const mapRef = useRef();
  const DISTRESS_PREDICTION_URL = 'https://distress-prediction.onrender.com/';

  // Load last saved data on mount; fallback to local draft when server is unavailable.
  useEffect(() => {
    if (!user?.username) return;

    fetch(`${API_URL}/data`, {
      headers: apiHeaders(token, user.username),
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lastEntry = data[0];
          if (lastEntry.metadata) {
            setChainage(lastEntry.metadata.chainage || '');
            setOffsetType(lastEntry.metadata.offsetType || '');
            setLaneCount(lastEntry.metadata.laneCount || '2');
            setKmlMergeOffset(lastEntry.metadata.kmlMergeOffset || '');
            setStartDate(lastEntry.metadata.startDate || '2026-02-10');
            setEndDate(lastEntry.metadata.endDate || '2026-02-20');
            setImageDirection(lastEntry.metadata.imageDirection || 'down_to_up');
          }
          if (lastEntry.geometry) {
            setInitialGeoJson({
              type: 'FeatureCollection',
              features: lastEntry.geometry
            });
          }
        } else {
          try {
            const cached = localStorage.getItem(getLocalDraftKey(user.username));
            if (!cached) return;
            const draft = JSON.parse(cached);
            if (draft.metadata) {
              setChainage(draft.metadata.chainage || '');
              setOffsetType(draft.metadata.offsetType || '');
              setLaneCount(draft.metadata.laneCount || '2');
              setKmlMergeOffset(draft.metadata.kmlMergeOffset || '');
              setStartDate(draft.metadata.startDate || '2026-02-10');
              setEndDate(draft.metadata.endDate || '2026-02-20');
              setImageDirection(draft.metadata.imageDirection || 'down_to_up');
            }
            if (Array.isArray(draft.geometry) && draft.geometry.length > 0) {
              setInitialGeoJson({
                type: 'FeatureCollection',
                features: draft.geometry
              });
            }
          } catch (e) {
            console.error("Error loading local draft:", e);
          }
        }
      })
      .catch(err => {
        console.error("Error loading server data, trying local draft:", err);
        try {
          const cached = localStorage.getItem(getLocalDraftKey(user.username));
          if (!cached) return;
          const draft = JSON.parse(cached);
          if (draft.metadata) {
            setChainage(draft.metadata.chainage || '');
            setOffsetType(draft.metadata.offsetType || '');
            setLaneCount(draft.metadata.laneCount || '2');
            setKmlMergeOffset(draft.metadata.kmlMergeOffset || '');
            setStartDate(draft.metadata.startDate || '2026-02-10');
            setEndDate(draft.metadata.endDate || '2026-02-20');
            setImageDirection(draft.metadata.imageDirection || 'down_to_up');
          }
          if (Array.isArray(draft.geometry) && draft.geometry.length > 0) {
            setInitialGeoJson({
              type: 'FeatureCollection',
              features: draft.geometry
            });
          }
        } catch (e) {
          console.error("Error loading local draft:", e);
        }
      });
  }, [token, user?.username]);

  if (authLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (showLanding) {
    return (
      <div className="App landing-screen-root">
        <div className="landing-topbar">
          <div className="landing-brand">
            <div className="landing-logo-dot" />
            <span className="landing-brand-text">KML Tools</span>
          </div>
          <div className="landing-top-actions">
            <div className="landing-user-info">
              <span className="landing-user-name">
                Welcome, <strong>{user.username}</strong>
              </span>
              <button
                type="button"
                className="landing-logout-button"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="landing-background">
          <div className="landing-content">
            <h1 className="landing-title">Welcome to KML Tools</h1>
            <p className="landing-subtitle">
              Choose how you want to manage road and distress data
            </p>
            <div className="landing-card-grid">
              <button
                className="landing-card landing-card-primary"
                onClick={() => setShowLanding(false)}
              >
                <div className="landing-card-logo landing-card-logo-kml">
                  <img
                    src="/KML_Creation.png"
                    alt="KML Creation"
                    className="landing-card-logo-image"
                  />
                </div>
                <div className="landing-card-label">KML Creation</div>
                <div className="landing-card-description">
                  Draw alignments, generate precise KML files and pipeline outputs.
                </div>
                <div className="landing-card-footer">
                  <span className="landing-card-cta primary">Get Started</span>
                </div>
              </button>
              <button
                className="landing-card landing-card-secondary"
                type="button"
                onClick={() => navigate("/distress-report")}
              >
                <div className="landing-card-logo landing-card-logo-distress">
                  <img
                    src="/Distress_report.png"
                    alt="Distress Report"
                    className="landing-card-logo-image"
                  />
                </div>
                <div className="landing-card-label">Distress Report</div>
                <div className="landing-card-description">
                  Prepare and manage distress reporting for your projects.
                </div>
                <div className="landing-card-footer">
                  <span className="landing-card-cta secondary">Get Started</span>
                </div>
              </button>
              <button
                className="landing-card landing-card-secondary"
                type="button"
                onClick={() => navigate("/distress-predicted")}
              >
                <div className="landing-card-logo landing-card-logo-Predicted">
                  <img
                    src="/Destress_Predicted.png"
                    alt="Distress Predicted"
                    className="landing-card-logo-image"
                  />
                </div>
                <div className="landing-card-label">Distress Predicted</div>
                <div className="landing-card-description">
                  Advanced distress detection and analytics.
                </div>
                <div className="landing-card-footer">
                  <span className="landing-card-cta secondary">Get Started</span>
                </div>
              </button>
              <InventoryCard onGetStarted={() => navigate("/inventory/kml-1")} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSuccess = (path) => {
    setLastSavedPath(path);
    const folderPath = path.split('/').slice(0, -1).join('/');
    setPipelineInitialPath(folderPath);
  };

  const handleTriggerSave = () => {
    if (mapRef.current) {
      mapRef.current.handleSave();
    }
  };

  const handleReset = async () => {
    setChainage('');
    setOffsetType('');
    setLaneCount('2');
    setKmlMergeOffset('');
    setStartDate('2026-02-10');
    setEndDate('2026-02-20');
    setImageDirection('down_to_up');
    setInitialGeoJson(null);
    setLastSavedPath('');
    if (mapRef.current) {
      await mapRef.current.handleClearAll(true);
    }
  };

  const handleGetDistressData = async () => {
    setDistressLoading(true);
    setDistressError('');
    try {
      const response = await fetch(`${API_URL}/api/distress-imagewise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiHeaders(token, user?.username),
        },
        body: JSON.stringify({}),
      });
      const raw = await response.text();
      let payload = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = { raw };
      }
      if (!response.ok) {
        const detailError = Array.isArray(payload?.detail)
          ? payload.detail.map((d) => d?.msg || JSON.stringify(d)).join(', ')
          : payload?.detail?.error || payload?.detail?.message || payload?.detail;
        throw new Error(
          payload?.message ||
            payload?.error ||
            detailError ||
            `Failed to get distress data (${response.status})`
        );
      }
      if (!payload || typeof payload.results_by_image !== 'object') {
        throw new Error('Invalid distress response format');
      }
      setDistressResults(payload.results_by_image);
    } catch (error) {
      console.error('Error fetching distress data:', error);
      setDistressError(error.message || 'Failed to fetch distress data');
      setDistressResults(null);
    } finally {
      setDistressLoading(false);
    }
  };

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const buildDistressCsv = (resultsByImage) => {
    const headers = [
      'image_name',
      'run_id',
      'components',
      'edges',
      'reported_crack',
      'predicted_crack',
      'reported_pothole',
      'predicted_pothole',
      'reported_alligator_crack',
      'predicted_alligator_crack',
      'defect_id',
      'defect_type',
      'severity',
      'start',
      'end',
      'length',
      'max_depth',
      'width',
      'sensors',
      'confidence',
      'reported_depth',
      'reported_width',
      'total_width',
      'pothole_area',
      'side',
      'latitude',
      'longitude',
      'matched_chainage_start_km',
    ];

    const lines = [headers.join(',')];
    const entries = Object.entries(resultsByImage || {});

    entries.forEach(([imageName, imageData]) => {
      const counts = imageData?.counts || {};
      const meta = imageData?.meta || {};
      const defects = Array.isArray(imageData?.defects) ? imageData.defects : [];

      if (defects.length === 0) {
        const row = [
          imageName,
          imageData?.run_id || '',
          meta.components ?? '',
          meta.edges ?? '',
          counts.reported_crack ?? 0,
          counts.predicted_crack ?? 0,
          counts.reported_pothole ?? 0,
          counts.predicted_pothole ?? 0,
          counts.reported_alligator_crack ?? 0,
          counts.predicted_alligator_crack ?? 0,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ];
        lines.push(row.map(escapeCsv).join(','));
        return;
      }

      defects.forEach((defect) => {
        const row = [
          imageName,
          imageData?.run_id || '',
          meta.components ?? '',
          meta.edges ?? '',
          counts.reported_crack ?? 0,
          counts.predicted_crack ?? 0,
          counts.reported_pothole ?? 0,
          counts.predicted_pothole ?? 0,
          counts.reported_alligator_crack ?? 0,
          counts.predicted_alligator_crack ?? 0,
          defect?.id ?? '',
          defect?.type ?? '',
          defect?.severity ?? '',
          defect?.start ?? '',
          defect?.end ?? '',
          defect?.length ?? '',
          defect?.max_depth ?? '',
          defect?.width ?? '',
          defect?.sensors ?? '',
          defect?.confidence ?? '',
          defect?.reported_depth ?? '',
          defect?.reported_width ?? '',
          defect?.total_width ?? '',
          defect?.pothole_area ?? '',
          defect?.side ?? '',
          defect?.latitude ?? '',
          defect?.longitude ?? '',
          defect?.matched_chainage_start_km ?? '',
        ];
        lines.push(row.map(escapeCsv).join(','));
      });
    });

    return lines.join('\n');
  };

  const handleDownloadDistressExcel = () => {
    if (!distressResults) return;
    const csv = buildDistressCsv(distressResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distress_results_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpenDistressPrediction = () => {
    const params = new URLSearchParams();
    if (user?.username) params.set('username', user.username);
    if (token) params.set('token', token);
    params.set('source', 'kml-tools');
    const targetUrl = `${DISTRESS_PREDICTION_URL}?${params.toString()}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-back-button"
            onClick={() => setShowLanding(true)}
          >
            ← Back
          </button>
          <span className="app-header-title">KML Creation</span>
        </div>
        <div className="user-info">
          <span>
            Welcome, <strong>{user.username}</strong>
          </span>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="map-section">
          <MapComponent 
            ref={mapRef}
            chainage={chainage}
            offsetType={offsetType}
            laneCount={laneCount}
            kmlMergeOffset={kmlMergeOffset}
            startDate={startDate}
            endDate={endDate}
            imageDirection={imageDirection}
            onSaveSuccess={handleSaveSuccess}
            initialGeoJson={initialGeoJson}
          />
        </div>
        <div className="cards-section cards-section--kml">
          {lastSavedPath && (
            <div className="card card--compact saved-notification">
              <div className="notification-content">
                <span className="success-icon">✓</span>
                <div className="notification-text">
                  <strong>Last Saved:</strong>
                  <span>{lastSavedPath.split('/').pop()}</span>
                </div>
              </div>
              <button 
                className="view-pipeline-btn"
                onClick={() => setShowPipeline(true)}
              >
                View in Pipeline
              </button>
            </div>
          )}
          <div className="card card--compact">
            <div className="kml-form-grid">
              <div className="input-group">
                <label htmlFor="chainage-input">Chainage(km)</label>
                <input 
                  id="chainage-input" 
                  type="text" 
                  placeholder="Enter Chainage" 
                  className="sidebar-input"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="offset-input">Offset Type(m)</label>
                <input 
                  id="offset-input" 
                  type="text" 
                  placeholder="Enter Offset Type" 
                  className="sidebar-input"
                  value={offsetType}
                  onChange={(e) => setOffsetType(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="card card--compact">
            <div className="kml-form-grid">
              <div className="input-group">
                <label htmlFor="lane-count-select">Lane</label>
                <select 
                  id="lane-count-select" 
                  className="sidebar-input"
                  value={laneCount}
                  onChange={(e) => setLaneCount(e.target.value)}
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="6">6</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="kml-merge-offset">KML(km)</label>
                <input 
                  id="kml-merge-offset" 
                  type="text" 
                  placeholder="Enter KML Merge Offset" 
                  className="sidebar-input"
                  value={kmlMergeOffset}
                  onChange={(e) => setKmlMergeOffset(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="card card--compact">
            <div className="kml-form-grid">
              <div className="input-group">
                <label htmlFor="start-date-input">Start Date</label>
                <input
                  id="start-date-input"
                  type="date"
                  className="sidebar-input distress-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="end-date-input">End Date</label>
                <input
                  id="end-date-input"
                  type="date"
                  className="sidebar-input distress-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="card card--compact">
            <div className="input-group input-group--full">
              <label htmlFor="image-direction-select">Direction</label>
              <select
                id="image-direction-select"
                className="sidebar-input"
                value={imageDirection}
                onChange={(e) => setImageDirection(e.target.value)}
              >
                <option value="down_to_up">South To North</option>
                <option value="up_to_down">North To South</option>
              </select>
            </div>
          </div>
          <div className="card card--compact card--actions">
            <button 
              className="save-button"
              onClick={handleTriggerSave}
            >
              Save Data
            </button>
            <button 
              type="button"
              className="clear-button"
              onClick={handleReset}
            >
              Clear All Data
            </button>
            <button
              type="button"
              className="distress-action-button"
              onClick={handleGetDistressData}
              disabled={distressLoading}
            >
              {distressLoading ? 'Getting...' : 'Get Distress Data'}
            </button>
            <button
              type="button"
              className="distress-action-button"
              onClick={handleOpenDistressPrediction}
            >
              Distress Prediction
            </button>
            <div className="kml-pipeline-link-wrap">
              <button
                type="button"
                className="one-link"
                onClick={() => setShowPipeline(true)}
              >
                go to the kml_pipeline
              </button>
            </div>
          </div>
        </div>
      </div>
      {showPipeline && (
        <PipelineView 
          initialPath={pipelineInitialPath} 
          onClose={() => {
            setShowPipeline(false);
            setPipelineInitialPath(''); // Reset after closing
          }} 
        />
      )}
      {(distressResults || distressError) && (
        <div className="pipeline-overlay">
          <div className="pipeline-container distress-response-modal">
            <div className="pipeline-header">
              <div className="header-left">
                <h2>Image-wise Distress Data</h2>
              </div>
              {distressResults && (
                <button
                  className="distress-download-button"
                  onClick={handleDownloadDistressExcel}
                >
                  Download Excel
                </button>
              )}
              <button
                className="close-button"
                onClick={() => {
                  setDistressResults(null);
                  setDistressError('');
                }}
              >
                ×
              </button>
            </div>
            <div className="pipeline-content">
              {distressError ? (
                <div className="distress-inline-error">{distressError}</div>
              ) : (
                <pre className="distress-response-json">
                  {JSON.stringify({ results_by_image: distressResults || {} }, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/distress-report" element={<DistressReport />} />
        <Route path="/distress-predicted" element={<DistressPredicted />} />
        <Route path="/inventory" element={<KMLSelection />} />
        <Route path="/inventory/kml-1" element={<KML1Form />} />
        <Route path="/inventory/kml-2" element={<KML2Form />} />
        <Route path="/*" element={<MainKmlApp />} />
      </Routes>
    </Router>
  );
}

export default App;
