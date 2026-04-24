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
import * as XLSX from "xlsx";

const getLocalDraftKey = (username) => `kml_local_draft_${username || "anonymous"}`;
const DISTRESS_TEMPLATE_HEADERS = [
  "Latitude",
  "Longitude",
  "Chainage Start",
  "Chainage End",
  "Project Name",
  "Distress Type",
  "Direction",
  "Lane",
  "Total Distress",
  "Pothole",
  "Edge Break",
  "Patchwork",
  "Bleeding",
  "Hotspots",
  "Simple crack/Alligator crack",
  "Rough Spot",
  "Repair",
  "Block crack/Oblique crack",
  "Rutting",
  "Longitudinal crack/Transverse crack",
  "Raveling",
  "Date",
  "Length",
  "Area",
  "Carriage Type ",
  "Single discrete crack",
  "Multiple cracks",
  "Joint crack",
  "Joint seal defects",
  "Punchout",
  "Slippage",
  "Heaves",
  "Alligator crack",
  "Oblique crack",
  "Transverse crack",
  "Width",
  "Depth",
  "Hairline crack",
  "Hungry Surface",
  "Settlement",
  "Shoving",
  "Stripping",
];
const PREDICTED_TEMPLATE_HEADERS = [
  "Latitude",
  "Longitude",
  "Project Name",
  "Chainage Start",
  "Chainage End",
  "Total Distress",
  "Distress Type",
  "Pothole",
  "Alligator crack",
  "Block crack/Oblique crack",
  "Edge Break",
  "Patchwork",
  "Bleeding",
  "Hotspots",
  "Rutting",
  "Raveling",
  "Transverse crack",
  "Rough Spot",
  "Direction",
  "Lane",
  "Date",
  "Carriage Type",
  "Hairline crack",
  "Longitudinal crack",
];

function MainKmlApp() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
  const [chainage, setChainage] = useState('');
  const [offsetType, setOffsetType] = useState('');
  const [laneCount, setLaneCount] = useState('2');
  const [kmlMergeOffset, setKmlMergeOffset] = useState('');
  const [projectName, setProjectName] = useState('');
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
            setProjectName(lastEntry.metadata.projectName || "");
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
              setProjectName(draft.metadata.projectName || "");
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
            setProjectName(draft.metadata.projectName || "");
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
    setProjectName('');
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

  const inferDistressType = (defect = {}) => {
    const raw = String(defect?.type || "").trim().toLowerCase();
    if (raw.includes("pothole")) return "Pothole";
    if (raw.includes("rut")) return "Rutting";
    if (raw.includes("block")) return "Block crack";
    if (raw.includes("alligator")) return "Alligator crack";
    if (raw.includes("transverse")) return "Transverse crack";
    if (raw.includes("longitudinal")) return "Longitudinal crack";
    if (raw.includes("oblique")) return "Oblique crack";
    if (raw.includes("ravel")) return "Raveling";
    return defect?.type ? String(defect.type) : "Unknown";
  };

  const normalizeDefectType = (value) => String(value || "").trim().toLowerCase();
  const isReportedType = (value) => {
    const t = normalizeDefectType(value);
    // Strictly reported and never predicted.
    return t.startsWith("reported_") && !t.includes("predicted");
  };
  const isPredictedType = (value) => {
    const t = normalizeDefectType(value);
    // Strictly predicted and never reported.
    return t.startsWith("predicted_") && !t.includes("reported");
  };

  const parseChainageFromImageName = (name = "") => {
    const match = String(name || "").match(
      /Chainage_(\d+(?:\.\d+)?)_to_(\d+(?:\.\d+)?)_([A-Za-z]+)_merged\.(?:png|kml)$/i
    );
    if (!match) return null;
    return {
      start: Number(match[1]),
      end: Number(match[2]),
      side: String(match[3]).toUpperCase(),
    };
  };

  const toFileProjectName = (name = "") =>
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "project";

  const toThree = (n) => {
    const val = Number(n);
    return Number.isFinite(val) ? val.toFixed(3) : "0.000";
  };
  const isSameChainage = (start, end) => {
    const s = Number(start);
    const e = Number(end);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
    return Math.abs(s - e) < 1e-9;
  };

  const inferDirectionFromSide = (sideValue) => {
    const side = String(sideValue || "").trim().toUpperCase();
    if (side === "LHS") return "Increasing";
    if (side === "RHS") return "Decreasing";
    return "";
  };

  const getExportBaseName = (resultsByImage) => {
    const entries = Object.keys(resultsByImage || {})
      .map(parseChainageFromImageName)
      .filter(Boolean);
    const project = toFileProjectName(projectName);
    if (!entries.length) {
      return `${project}_Chainage_0.000_to_0.000`;
    }
    const minStart = Math.min(...entries.map((x) => x.start));
    const maxEnd = Math.max(...entries.map((x) => x.end));
    return `${project}_Chainage_${toThree(minStart)}_to_${toThree(maxEnd)}`;
  };

  const getIndicatorValues = (distressType) => {
    const defaults = {
      pothole: 0,
      edgeBreak: 0,
      patchwork: 0,
      bleeding: 0,
      hotspots: 0,
      simpleAlligator: 0,
      roughSpot: 0,
      repair: 0,
      blockOblique: 0,
      rutting: 0,
      longTransverse: 0,
      longitudinal: 0,
      raveling: 0,
      alligator: 0,
      oblique: 0,
      transverse: 0,
      hairline: 0,
      hungrySurface: 0,
      settlement: 0,
      shoving: 0,
      stripping: 0,
    };
    const key = String(distressType || "").toLowerCase();
    if (key.includes("pothole")) defaults.pothole = 1;
    if (key.includes("edge")) defaults.edgeBreak = 1;
    if (key.includes("patch")) defaults.patchwork = 1;
    if (key.includes("bleed")) defaults.bleeding = 1;
    if (key.includes("hotspot")) defaults.hotspots = 1;
    if (key.includes("simple")) defaults.simpleAlligator = 1;
    if (key.includes("rough")) defaults.roughSpot = 1;
    if (key.includes("repair")) defaults.repair = 1;
    if (key.includes("block") || key.includes("oblique")) defaults.blockOblique = 1;
    if (key.includes("rut")) defaults.rutting = 1;
    if (key.includes("longitudinal") || key.includes("transverse")) defaults.longTransverse = 1;
    if (key.includes("longitudinal")) defaults.longitudinal = 1;
    if (key.includes("ravel")) defaults.raveling = 1;
    if (key.includes("alligator")) defaults.alligator = 1;
    if (key.includes("oblique")) defaults.oblique = 1;
    if (key.includes("transverse")) defaults.transverse = 1;
    if (key.includes("hairline")) defaults.hairline = 1;
    if (key.includes("hungry")) defaults.hungrySurface = 1;
    if (key.includes("settlement")) defaults.settlement = 1;
    if (key.includes("shoving")) defaults.shoving = 1;
    if (key.includes("stripping")) defaults.stripping = 1;
    return defaults;
  };

  const buildDistressTemplateRows = (resultsByImage) => {
    const rows = [];
    const today = new Date().toISOString().slice(0, 10).split("-").reverse().join("-");
    const carriageType = "Flexible";
    Object.entries(resultsByImage || {}).forEach(([imageName, imageData]) => {
      const parsed = parseChainageFromImageName(imageName);
      const defects = Array.isArray(imageData?.defects) ? imageData.defects : [];
      defects.forEach((defect) => {
        if (!isReportedType(defect?.type)) return;
        const distressType = normalizeDefectType(defect?.type);
        const indicators = getIndicatorValues(distressType);
        const start = Number.isFinite(Number(defect?.start))
          ? Number(defect.start)
          : parsed?.start ?? "";
        const end = Number.isFinite(Number(defect?.end))
          ? Number(defect.end)
          : parsed?.end ?? "";
        if (isSameChainage(start, end)) return;
        const length = Number.isFinite(Number(defect?.length)) ? Number(defect.length) : 0;
        const width = Number.isFinite(Number(defect?.width)) ? Number(defect.width) : 0;
        const depth = Number.isFinite(Number(defect?.max_depth))
          ? Number(defect.max_depth)
          : Number.isFinite(Number(defect?.reported_depth))
            ? Number(defect.reported_depth)
            : 0;
        const area = Number.isFinite(Number(defect?.pothole_area))
          ? Number(defect.pothole_area)
          : Number((length || 0) * (width || 0)).toFixed(3);
        const sideValue = defect?.side || parsed?.side || "";
        const direction = inferDirectionFromSide(sideValue);
        const row = {
          Latitude: defect?.latitude ?? "",
          Longitude: defect?.longitude ?? "",
          "Chainage Start": start,
          "Chainage End": end,
          "Project Name": projectName || "",
          "Distress Type": distressType,
          Direction: direction,
          Lane: sideValue,
          "Total Distress": 1,
          Pothole: indicators.pothole,
          "Edge Break": indicators.edgeBreak,
          Patchwork: indicators.patchwork,
          Bleeding: indicators.bleeding,
          Hotspots: indicators.hotspots,
          "Simple crack/Alligator crack": indicators.simpleAlligator,
          "Rough Spot": indicators.roughSpot,
          Repair: indicators.repair,
          "Block crack/Oblique crack": indicators.blockOblique,
          Rutting: indicators.rutting,
          "Longitudinal crack/Transverse crack": indicators.longTransverse,
          Raveling: indicators.raveling,
          Date: today,
          Length: length,
          Area: area,
          "Carriage Type ": carriageType,
          "Single discrete crack": 0,
          "Multiple cracks": 0,
          "Joint crack": 0,
          "Joint seal defects": 0,
          Punchout: 0,
          Slippage: 0,
          Heaves: 0,
          "Alligator crack": indicators.alligator,
          "Oblique crack": indicators.oblique,
          "Transverse crack": indicators.transverse,
          Width: width,
          Depth: depth,
          "Hairline crack": indicators.hairline,
          "Hungry Surface": indicators.hungrySurface,
          Settlement: indicators.settlement,
          Shoving: indicators.shoving,
          Stripping: indicators.stripping,
        };
        rows.push(row);
      });
    });
    return rows;
  };

  const buildPredictedTemplateRows = (resultsByImage) => {
    const rows = [];
    const today = new Date().toISOString().slice(0, 10).split("-").reverse().join("-");
    const carriageType = "Flexible";
    Object.entries(resultsByImage || {}).forEach(([imageName, imageData]) => {
      const parsed = parseChainageFromImageName(imageName);
      const defects = Array.isArray(imageData?.defects) ? imageData.defects : [];
      defects.forEach((defect) => {
        if (!isPredictedType(defect?.type)) return;
        const distressType = normalizeDefectType(defect?.type);
        const indicators = getIndicatorValues(distressType);
        const start = Number.isFinite(Number(defect?.start))
          ? Number(defect.start)
          : parsed?.start ?? "";
        const end = Number.isFinite(Number(defect?.end))
          ? Number(defect.end)
          : parsed?.end ?? "";
        if (isSameChainage(start, end)) return;
        const sideValue = defect?.side || parsed?.side || "";
        const direction = inferDirectionFromSide(sideValue);
        rows.push({
          Latitude: defect?.latitude ?? "",
          Longitude: defect?.longitude ?? "",
          "Project Name": projectName || "",
          "Chainage Start": start,
          "Chainage End": end,
          "Total Distress": 1,
          "Distress Type": distressType,
          Pothole: indicators.pothole,
          "Alligator crack": indicators.alligator,
          "Block crack/Oblique crack": indicators.blockOblique,
          "Edge Break": indicators.edgeBreak,
          Patchwork: indicators.patchwork,
          Bleeding: indicators.bleeding,
          Hotspots: indicators.hotspots,
          Rutting: indicators.rutting,
          Raveling: indicators.raveling,
          "Transverse crack": indicators.transverse,
          "Rough Spot": indicators.roughSpot,
          Direction: direction,
          Lane: sideValue,
          Date: today,
          "Carriage Type": carriageType,
          "Hairline crack": indicators.hairline,
          "Longitudinal crack": indicators.longitudinal,
        });
      });
    });
    return rows;
  };

  const downloadWorkbook = (rows, headers, fileName) => {
    const orderedRows = rows.map((row) => {
      const out = {};
      headers.forEach((header) => {
        out[header] = row[header] ?? "";
      });
      return out;
    });
    const worksheet = XLSX.utils.json_to_sheet(orderedRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDistressExcel = () => {
    if (!distressResults) return;
    const reportedRows = buildDistressTemplateRows(distressResults);
    const predictedRows = buildPredictedTemplateRows(distressResults);
    if (!reportedRows.length && !predictedRows.length) {
      alert("No defects available to export.");
      return;
    }
    const baseName = getExportBaseName(distressResults);
    if (reportedRows.length) {
      downloadWorkbook(
        reportedRows,
        DISTRESS_TEMPLATE_HEADERS,
        `${baseName}_reported.xlsx`
      );
    }
    // Trigger second file a moment later to avoid some browsers dropping one download.
    if (predictedRows.length) {
      setTimeout(() => {
        downloadWorkbook(
          predictedRows,
          PREDICTED_TEMPLATE_HEADERS,
          `${baseName}_predicted.xlsx`
        );
      }, 250);
    }
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
            projectName={projectName}
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
              <label htmlFor="project-name-input">Project Name</label>
              <input
                id="project-name-input"
                type="text"
                placeholder="Enter project name"
                className="sidebar-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
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
