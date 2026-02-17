import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import MapComponent from "./MapComponent";
import PipelineView from "./PipelineView";
import Login from "./Login";
import Register from "./Register";
import { useAuth } from "./AuthContext";
import API_URL from "./config";
import DistressReport from "./DistressReport";
import DistressPredicted from "./DistressPredicted";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

function MainKmlApp() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [chainage, setChainage] = useState('');
  const [offsetType, setOffsetType] = useState('');
  const [laneCount, setLaneCount] = useState('2');
  const [kmlMergeOffset, setKmlMergeOffset] = useState('');
  const [showPipeline, setShowPipeline] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState('');
  const [pipelineInitialPath, setPipelineInitialPath] = useState('');
  const [initialGeoJson, setInitialGeoJson] = useState(null);
  const mapRef = useRef();

  // Load last saved data on mount
  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/data`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
          }
          if (lastEntry.geometry) {
            setInitialGeoJson({
              type: 'FeatureCollection',
              features: lastEntry.geometry
            });
          }
        }
      })
      .catch(err => console.error("Error loading initial data:", err));
  }, [token]);

  if (authLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return isRegistering ? (
      <Register onSwitchToLogin={() => setIsRegistering(false)} />
    ) : (
      <Login onSwitchToRegister={() => setIsRegistering(true)} />
    );
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
    setInitialGeoJson(null);
    setLastSavedPath('');
    if (mapRef.current) {
      await mapRef.current.handleClearAll(true);
    }
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
            onSaveSuccess={handleSaveSuccess}
            initialGeoJson={initialGeoJson}
          />
        </div>
        <div className="cards-section">
          {lastSavedPath && (
            <div className="card saved-notification">
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
          <div className="card">
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
          </div>
          <div className="card">
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
          <div className="card">
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
          </div>
          <div className="card">
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
          <div className="card">
            <button 
              className="save-button"
              onClick={handleTriggerSave}
            >
              Save Data
            </button>
            <button 
              className="clear-button"
              onClick={handleReset}
              style={{ 
                marginTop: '8px', 
                width: '100%', 
                padding: '9px 12px', 
                backgroundColor: '#e74c3c', 
                color: 'white', 
                border: 'none', 
                borderRadius: '999px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              Clear All Data
            </button>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
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
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/distress-report" element={<DistressReport />} />
        <Route path="/distress-predicted" element={<DistressPredicted />} />
        <Route path="/*" element={<MainKmlApp />} />
      </Routes>
    </Router>
  );
}

export default App;
