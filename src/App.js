import React, { useState, useRef, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import MapComponent from './MapComponent';
import PipelineView from './PipelineView';
import API_URL from './config';

function App() {
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
    fetch(`${API_URL}/data`)
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
  }, []);

  const handleSaveSuccess = (path) => {
    setLastSavedPath(path);
    // Extract the folder path (remove filename)
    const folderPath = path.split('/').slice(0, -1).join('/');
    setPipelineInitialPath(folderPath);
    
    // Auto-clear removed as per user request
    // We keep the notification visible so the user knows it's saved
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
                marginTop: '10px', 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#e74c3c', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Clear All Data
            </button>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <a href="#" className="one-link" onClick={(e) => { e.preventDefault(); setShowPipeline(true); }}>go to the kml_pipeline </a>
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

export default App;
