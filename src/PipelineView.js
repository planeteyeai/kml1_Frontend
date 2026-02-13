import React, { useState, useEffect } from 'react';
import './PipelineView.css';
import API_URL from './config';

const PipelineView = ({ onClose, initialPath = '' }) => {
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(true);

  const fetchItems = (path = '') => {
    setLoading(true);
    fetch(`${API_URL}/pipeline-folders?path=${encodeURIComponent(path)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setItems(data.items);
          setCurrentPath(data.currentPath);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching pipeline items:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems(initialPath);
  }, [initialPath]);

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      fetchItems(item.path);
    } else {
      // It's a file, maybe download or view it?
      // For now, let's open it in a new tab if it's served statically
      window.open(`${API_URL}/pipeline-files/${item.path}`, '_blank');
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

  const handleDownloadClick = (e, item) => {
    e.stopPropagation(); // Prevent folder opening
    if (item.type === 'folder') {
      window.location.href = `${API_URL}/download-folder?path=${encodeURIComponent(item.path)}`;
    } else {
      window.open(`${API_URL}/pipeline-files/${item.path}`, '_blank');
    }
  };

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
            <h2>{currentPath ? currentPath.split('/').pop() : 'Project Pipeline'}</h2>
            {!currentPath && <span className="sort-hint">(Sorted by newest first)</span>}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="pipeline-content">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <p>This folder is empty.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineView;