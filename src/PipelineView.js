import React, { useState, useEffect, useCallback } from 'react';
import './PipelineView.css';
import API_URL from './config';
import { apiHeaders, usernameQuery } from './apiHeaders';
import { useAuth } from './AuthContext';

const PipelineView = ({ onClose, initialPath = '' }) => {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [distressLoading, setDistressLoading] = useState(false);
  const [distressError, setDistressError] = useState("");
  const [distressResults, setDistressResults] = useState(null);

  const fetchItems = useCallback((path = '') => {
    setLoading(true);
    setFetchError("");
    const base = API_URL || "";
    const url = `${base}/pipeline-folders?path=${encodeURIComponent(path)}`;
    fetch(url, {
      headers: apiHeaders(token, user?.username),
    })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            res.ok
              ? "Invalid response from server."
              : `Server error (${res.status}). Check API URL and CORS.`
          );
        }
        if (!res.ok) {
          throw new Error(
            data.message || data.detail || `Request failed (${res.status})`
          );
        }
        return data;
      })
      .then((data) => {
        if (data.success) {
          const mergeLast = (it) => /_kml_merge$/i.test(it.name);
          const sorted = [...data.items].sort((a, b) => {
            if (mergeLast(a) !== mergeLast(b)) return mergeLast(a) ? 1 : -1;
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return new Date(b.modifiedAt) - new Date(a.modifiedAt);
          });
          setItems(sorted);
          setCurrentPath(data.currentPath);
        } else {
          setFetchError(data.message || "Could not load pipeline folder.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching pipeline items:", err);
        setFetchError(err.message || "Network error — is the backend reachable?");
        setLoading(false);
      });
  }, [token, user?.username]);

  useEffect(() => {
    fetchItems(initialPath);
  }, [fetchItems, initialPath]);

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      fetchItems(item.path);
    } else {
      // It's a file, maybe download or view it?
      // For now, let's open it in a new tab if it's served statically
      window.open(`${API_URL}/pipeline-files/${item.path}?${usernameQuery(user?.username)}`, '_blank');
    }
  };

  const handleBackClick = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    fetchItems(parentPath);
  };

  const isRecentlyModified = (dateString) => {
    const modifiedDate = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now - modifiedDate) / (1000 * 60);
    return diffInMinutes < 5; // Consider "New" if modified in the last 5 minutes
  };

  const isMergeKmlFolder = () => {
    const normalizedPath = (currentPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const folderName = normalizedPath.split('/').pop() || '';
    return /^(LHS|RHS)_kml_merge(_images)?$/i.test(folderName);
  };

  const isMergeImagesFolder = () => {
    const normalizedPath = (currentPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const folderName = normalizedPath.split('/').pop() || '';
    return /^(LHS|RHS)_kml_merge_images$/i.test(folderName);
  };

  const shouldShowDistressButton = (item) => {
    if (!item || item.type === 'folder') return false;
    const normalizedPath = (currentPath || '').replace(/\\/g, '/').toLowerCase();
    const name = (item.name || '').toLowerCase();
    if (normalizedPath.includes('kml_merge')) return true;
    return /_merged\.(png|kml)$/i.test(name);
  };

  const handleDownloadClick = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    const base = API_URL || "";
    const userQ = usernameQuery(user?.username);
    const headers = apiHeaders(token, user?.username);

    try {
      if (item.type === "folder") {
        const url = `${base}/download-folder?path=${encodeURIComponent(item.path)}&${userQ}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Folder download failed:", res.status, text);
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${(item.name || "folder").replace(/[/\\?%*:|"<>]/g, "_")}.zip`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } else {
        const encodedPath = (item.path || "")
          .split("/")
          .map((seg) => encodeURIComponent(seg))
          .join("/");
        const url = `${base}/pipeline-files/${encodedPath}?${userQ}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleDistressIdentifyClick = (e, item) => {
    if (e) e.stopPropagation();
    window.open('https://distress-prediction.onrender.com/', '_blank', 'noopener,noreferrer');
  };

  const handleRunDistressPipeline = async (e) => {
    if (e) e.stopPropagation();
    setDistressLoading(true);
    setDistressError("");
    try {
      const base = API_URL || "";
      const res = await fetch(`${base}/api/distress-imagewise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...apiHeaders(token, user?.username),
        },
        body: JSON.stringify({ path: currentPath || "" }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || payload.error || "Distress pipeline failed");
      }
      if (!payload || typeof payload.results_by_image !== "object") {
        throw new Error("Invalid distress response format");
      }
      setDistressResults(payload.results_by_image || {});
    } catch (err) {
      console.error("Distress pipeline error:", err);
      setDistressError(err.message || "Failed to run distress pipeline");
    } finally {
      setDistressLoading(false);
    }
  };

  const showBatchDistressButton = Boolean(currentPath && (isMergeKmlFolder() || isMergeImagesFolder()));

  return (
    <div className="pipeline-overlay">
      <div className="pipeline-container">
        <div className="pipeline-header">
          <div className="header-left">
             {currentPath && (
              <button className="back-button" onClick={handleBackClick}>
                ← Back
              </button>
            )}
            {currentPath && (
              <button
                className="back-button distress-header-button"
                onClick={handleDistressIdentifyClick}
                title="Open distress identify portal"
              >
                Distress Identify
              </button>
            )}
            {showBatchDistressButton && (
              <button
                className="back-button distress-run-button"
                onClick={handleRunDistressPipeline}
                title="Run distress on all generated images in this folder"
                disabled={distressLoading}
              >
                {distressLoading ? "Running..." : "Get Distress Data"}
              </button>
            )}
            <h2>{currentPath ? currentPath.split('/').pop() : 'Project Pipeline'}</h2>
            {!currentPath && <span className="sort-hint">(Sorted by newest first)</span>}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="pipeline-content">
          {!!distressError && (
            <div className="distress-result-box distress-error-box">
              {distressError}
            </div>
          )}
          {distressResults && (
            <div className="distress-result-box">
              <div className="distress-result-title">
                Image-wise distress response ({Object.keys(distressResults).length} images)
              </div>
              <pre className="distress-result-json">
                {JSON.stringify({ results_by_image: distressResults }, null, 2)}
              </pre>
            </div>
          )}
          {fetchError && (
            <div className="empty-state" style={{ color: "#f87171" }}>
              <p>{fetchError}</p>
              {process.env.NODE_ENV === "development" && (
                <p style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: "0.5rem" }}>
                  Local dev uses the CRA proxy (requests to this origin). For a local API on another port, set{" "}
                  <code>REACT_APP_API_URL</code> in <code>.env.local</code> and restart <code>npm start</code>.
                </p>
              )}
            </div>
          )}
          {!fetchError && loading ? (
            <div className="loading">Loading...</div>
          ) : !fetchError && items.length === 0 ? (
            <div className="empty-state">
              <p>This folder is empty.</p>
              <p style={{ fontSize: "0.85rem", opacity: 0.75, marginTop: "0.5rem" }}>
                Save KML data successfully first — pipeline files appear after the server processes your geometry.
              </p>
            </div>
          ) : !fetchError ? (
            <div className="folders-grid">
              {items.map((item, index) => (
                <div key={index} className="folder-card" onClick={() => handleItemClick(item)}>
                  <div className="folder-icon">
                    {item.type === 'folder' ? (
                      <svg viewBox="0 0 24 24" fill="#3498db" width="64px" height="64px">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="#2ecc71" width="64px" height="64px">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    )}
                    {isRecentlyModified(item.modifiedAt) && <span className="new-badge">NEW</span>}
                    
                    <button
                      type="button"
                      className="download-icon-btn"
                      onClick={(e) => handleDownloadClick(e, item)}
                      title={item.type === 'folder' ? "Download as ZIP" : "Download File"}
                    >
                      <svg viewBox="0 0 24 24" fill="white" width="20px" height="20px">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="folder-name">{item.name}</div>
                  <div className="folder-date">
                    {new Date(item.modifiedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PipelineView;
