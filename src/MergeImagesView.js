import React, { useState, useEffect, useCallback } from "react";
import "./PipelineView.css";
import "./MergeImagesView.css";
import API_URL from "./config";
import { apiHeaders } from "./apiHeaders";
import { useAuth } from "./AuthContext";

function mergeImageSrc(img) {
  if (!img) return "";
  if (img.publicUrl && String(img.publicUrl).trim()) return String(img.publicUrl).trim();
  const rel = (img.url && String(img.url).trim()) || "";
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = (API_URL || "").replace(/\/+$/, "");
  return base + (rel.startsWith("/") ? rel : `/${rel}`);
}

/**
 * Lists merge-KML strip images from GET /api/merge-images/:username?only=merge_kml
 * using JWT (Authorization: Bearer). Image URLs include ?token= for <img src>.
 */
const MergeImagesView = ({ onClose }) => {
  const { token, user } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const load = useCallback(() => {
    if (!token || !user?.username) {
      setFetchError("Not signed in.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError("");
    const base = API_URL || "";
    const u = encodeURIComponent(user.username);
    const url = `${base}/api/merge-images/${u}?only=merge_kml`;
    fetch(url, { headers: apiHeaders(token, user.username) })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            res.ok ? "Invalid response from server." : `Server error (${res.status}).`
          );
        }
        if (!res.ok) {
          throw new Error(data.message || `Request failed (${res.status})`);
        }
        return data;
      })
      .then((data) => {
        if (data.success && Array.isArray(data.images)) {
          setImages(data.images);
        } else {
          setImages([]);
          setFetchError(data.message || "Could not load merge images.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Merge images fetch:", err);
        setFetchError(err.message || "Network error.");
        setImages([]);
        setLoading(false);
      });
  }, [token, user?.username]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="pipeline-overlay">
      <div className="pipeline-container merge-images-container">
        <div className="pipeline-header">
          <div className="header-left">
            <h2>Merge KML images</h2>
            {!loading && !fetchError && (
              <span className="sort-hint">({images.length} file{images.length !== 1 ? "s" : ""})</span>
            )}
          </div>
          <div className="merge-images-header-actions">
            <button type="button" className="back-button" onClick={load} disabled={loading}>
              Refresh
            </button>
            <button type="button" className="close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="pipeline-content merge-images-content">
          {fetchError && (
            <div className="empty-state" style={{ color: "#f87171" }}>
              <p>{fetchError}</p>
            </div>
          )}
          {!fetchError && loading ? (
            <div className="loading">Loading...</div>
          ) : !fetchError && images.length === 0 ? (
            <div className="empty-state">
              <p>No merge KML strip images yet.</p>
              <p style={{ fontSize: "0.85rem", opacity: 0.75, marginTop: "0.5rem" }}>
                They appear in <code>LHS_kml_merge_images</code> / <code>RHS_kml_merge_images</code> after
                pipeline output is generated.
              </p>
            </div>
          ) : !fetchError ? (
            <div className="merge-images-grid">
              {images.map((img, index) => (
                <figure key={`${img.side}-${img.fileName}-${index}`} className="merge-image-card">
                  <div className="merge-image-thumb-wrap">
                    <img
                      src={mergeImageSrc(img)}
                      alt={img.fileName || "merge"}
                      loading="lazy"
                      className="merge-image-thumb"
                    />
                  </div>
                  <figcaption className="merge-image-meta">
                    <span className="merge-image-side">{String(img.side || "").toUpperCase()}</span>
                    <span className="merge-image-name" title={img.fileName}>
                      {img.fileName}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MergeImagesView;
