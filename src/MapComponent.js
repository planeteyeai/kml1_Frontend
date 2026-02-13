import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, FeatureGroup, useMap, LayersControl } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';
import 'leaflet-draw'; // Force load GeometryUtil
import { kml } from "@tmcw/togeojson";
import API_URL from './config';
import { useAuth } from './AuthContext';

// Global override for Leaflet distance formatting
const applyDistanceOverride = () => {
    const targetL = window.L || L;
    if (targetL && targetL.GeometryUtil) {
        targetL.GeometryUtil.readableDistance = function (distance, metric) {
            if (metric !== false) { // Default to metric
                if (distance >= 1000) {
                    return (distance / 1000).toFixed(3) + ' km';
                }
                return distance.toFixed(2) + ' m';
            }
            // Non-metric fallback
            const ft = distance * 3.2808399;
            if (ft > 5280) {
                return (ft / 5280).toFixed(3) + ' mi';
            }
            return ft.toFixed(2) + ' ft';
        };
        console.log("Distance override applied to", targetL === window.L ? "window.L" : "local L");
    }
};

// Apply immediately and also on a delay to catch late-loading Leaflet
  applyDistanceOverride();
  setTimeout(applyDistanceOverride, 1000);
  setTimeout(applyDistanceOverride, 3000);

  // Configure Leaflet.draw tooltips for precision
  if (L.drawLocal) {
    L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Click to continue drawing line. Length: ';
    L.drawLocal.draw.handlers.polyline.tooltip.end = 'Click last point to finish line. Total: ';
  }

// Fix for default marker icon not showing correctly in some builds
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const SearchControl = ({ visible }) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar',
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Enter address',
    });

    map.addControl(searchControl);

    return () => map.removeControl(searchControl);
  }, [map]);

  // Handle visibility changes without recreating control
  useEffect(() => {
    const searchBar = document.querySelector('.leaflet-control-geosearch');
    if (searchBar) {
      if (visible) {
        searchBar.classList.remove('search-hidden');
      } else {
        searchBar.classList.add('search-hidden');
      }
    }
  }, [visible]);

  return null;
};

const MapComponent = forwardRef(({ chainage, offsetType, laneCount, kmlMergeOffset, onSaveSuccess, initialGeoJson }, ref) => {
  const { token } = useAuth();
  const position = [18.5204, 73.8567]; // Pune center
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [dataKey, setDataKey] = useState(0);
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [drawnFeatures, setDrawnFeatures] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' });
  const featureGroupRef = React.useRef(null);

  // Set initial data if provided
  useEffect(() => {
    if (initialGeoJson) {
      setGeoJsonData(initialGeoJson);
      setDrawnFeatures([]); // Clear manual drawings when loading initial data
      setDataKey(prev => prev + 1);
      setIsDataVisible(true);
    } else if (initialGeoJson === null) {
      setGeoJsonData(null);
      setDrawnFeatures([]);
      setDataKey(prev => prev + 1);
      setIsDataVisible(false);
    }
  }, [initialGeoJson]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Clear existing data before uploading new KML
      // We MUST await this to prevent race conditions where the clear-all 
      // finishes after the new data is loaded.
      await handleClearAll(true);

      setIsDataVisible(true); // Hide search bar when uploading
      // 1. Upload file to server
      const formData = new FormData();
      formData.append('kmlFile', file);
      // Append current metadata to the upload
      formData.append('chainage', chainage);
      formData.append('offsetType', offsetType);
      formData.append('laneCount', laneCount);
      formData.append('kmlMergeOffset', kmlMergeOffset);

      fetch(`${API_URL}/upload-kml`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log("File uploaded successfully to:", data.path);
          if (onSaveSuccess && data.pipelinePath) {
            onSaveSuccess(data.pipelinePath);
          }
        } else {
          console.error("Upload failed:", data.message);
        }
      })
      .catch(error => console.error("Error uploading file:", error));

      // 2. Read and display on map
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const parser = new DOMParser();
          const kmlDoc = parser.parseFromString(text, "text/xml");
          const geojson = kml(kmlDoc);
          setGeoJsonData(geojson);
          setDataKey(prev => prev + 1);
          
          // Reset file input so the same file can be uploaded again
          e.target.value = '';
        } catch (error) {
          console.error("Error parsing KML file:", error);
          alert("Error parsing KML file");
          setIsDataVisible(false); // Show search bar again if failed
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    }
  };

  // Zoom to layer with improved padding and maxZoom
  const ZoomToLayer = ({ data }) => {
    const map = useMap();
    useEffect(() => {
      if (data) {
        try {
          const layer = L.geoJSON(data);
          if (layer.getLayers().length > 0) {
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, { 
                padding: [50, 50], 
                maxZoom: 18,
                animate: true 
              });
            }
          }
        } catch (e) {
          console.error("Error zooming to layer:", e);
        }
      }
    }, [data, map]);
    return null;
  };

  const handleSave = async () => {
    // 1. Get manually drawn layers
    let manuallyDrawn = [];
    if (featureGroupRef.current) {
      manuallyDrawn = featureGroupRef.current.getLayers().map(layer => layer.toGeoJSON());
    }
    
    // 2. Combine with uploaded GeoJSON features
    let allFeatures = [...manuallyDrawn];
    
    if (geoJsonData && geoJsonData.features) {
      // Avoid duplicate features if they are already in manuallyDrawn
      const drawnIds = new Set(manuallyDrawn.map(f => JSON.stringify(f.geometry)));
      geoJsonData.features.forEach(f => {
        if (!drawnIds.has(JSON.stringify(f.geometry))) {
          allFeatures.push(f);
        }
      });
    }

    if (allFeatures.length === 0) {
      alert("Please draw something or upload a KML before saving.");
      return;
    }

    setIsSaving(true);
    setSaveStatus({ show: false, message: '', type: '' });

    const payload = {
      metadata: {
        chainage,
        offsetType,
        laneCount,
        kmlMergeOffset
      },
      geometry: allFeatures
    };

    try {
      const response = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      if (result.success) {
        setSaveStatus({ show: true, message: 'Data saved successfully!', type: 'success' });
        if (onSaveSuccess && result.pipelinePath) {
          onSaveSuccess(result.pipelinePath);
        }
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);
      } else {
        setSaveStatus({ show: true, message: 'Error saving data: ' + result.message, type: 'error' });
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setSaveStatus({ show: true, message: 'Error saving data to server. Make sure the server is running.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async (skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("Are you sure you want to clear all data and layers? This will delete everything from the map and pipeline.")) {
      return;
    }

    try {
      // 1. Tell server to clear all data
      const response = await fetch(`${API_URL}/clear-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        // 2. Clear local map layers
        if (featureGroupRef.current) {
          featureGroupRef.current.clearLayers();
        }
        setGeoJsonData(null);
        setDrawnFeatures([]);
        setDataKey(prev => prev + 1);
        setIsDataVisible(false);
        
        if (onSaveSuccess) {
          onSaveSuccess(''); // Reset last saved path
        }
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      // Fail silently to avoid interrupting the user
    }
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleClearAll
  }));

  const _onCreated = async (e) => {
    console.log("Created: ", e);
    
    // If we are starting a fresh drawing and there's existing data, 
    // we clear it first to ensure a clean slate for the new entry.
    if (geoJsonData || drawnFeatures.length > 0) {
      await handleClearAll(true);
    }

    setIsDataVisible(true); 
    
    // Add to drawn features state for persistence across re-renders
    const layer = e.layer;
    setDrawnFeatures(prev => [...prev, layer.toGeoJSON()]);
  };

  const _onEdited = (e) => {
    console.log("Edited: ", e);
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      setDrawnFeatures(layers.map(l => l.toGeoJSON()));
    }
  };

  const _onDeleted = async (e) => {
    console.log("Deleted layers: ", e);
    
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      setDrawnFeatures(layers.map(l => l.toGeoJSON()));
      
      if (layers.length === 0 && !geoJsonData) {
        setIsDataVisible(false);
        await handleClearAll(true); 
      }
    }
  };

  return (
    <div className="map-wrapper" style={{ position: 'relative' }}>
      {isSaving && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Saving data...</p>
        </div>
      )}
      
      {saveStatus.show && (
        <div className={`save-status-toast ${saveStatus.type}`}>
          {saveStatus.type === 'success' ? '✓ ' : '✕ '}
          {saveStatus.message}
        </div>
      )}

      <div className="kml-upload-container">
        <label htmlFor="kml-upload" className="kml-upload-label">
          Upload KML
        </label>
        <input
          id="kml-upload"
          type="file"
          accept=".kml"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      <MapContainer 
        center={position} 
        zoom={18} 
        scrollWheelZoom={true} 
        maxZoom={24} 
        style={{ height: '100%', width: '100%' }}
        key={dataKey}
      >
        <SearchControl visible={!isDataVisible} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Satellite">
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              attribution='&copy; Google Maps'
              maxZoom={24}
              maxNativeZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Streets">
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              attribution='&copy; Google Maps'
              maxZoom={24}
              maxNativeZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position='topleft'
            onEdited={_onEdited}
            onCreated={_onCreated}
            onDeleted={_onDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: true,
              polyline: {
                metric: true,
                showLength: true,
                precision: 2
              },
              polygon: true,
            }}
          />
        </FeatureGroup>
        <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
        {geoJsonData && (
          <>
            <GeoJSON key={dataKey} data={geoJsonData} />
            <ZoomToLayer data={geoJsonData} />
          </>
        )}
      </MapContainer>
    </div>
  );
});

export default MapComponent;
