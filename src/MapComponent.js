import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, FeatureGroup, useMap, LayersControl } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';
import 'leaflet-draw'; // Force load GeometryUtil
import { kml } from "@tmcw/togeojson";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import API_URL from './config';
import { apiHeaders } from './apiHeaders';
import { useAuth } from './AuthContext';
import {
  cacheMergeImagesFromServer,
  clearPipelineImageCache,
} from './pipelineImageCache';

async function refreshPipelineImageCache(mergeImages, token, username) {
  try {
    let imgs = mergeImages;
    if (!imgs || imgs.length === 0) {
      const base = (API_URL || '').replace(/\/+$/, '');
      const path = `/api/merge-images/${encodeURIComponent((username || 'local-user').trim())}`;
      const url = base ? `${base}${path}` : `${window.location.origin}${path}`;
      const mr = await fetch(url, { headers: apiHeaders(token, username) });
      const md = await mr.json();
      if (md.success && md.images) imgs = md.images;
    }
    const r = await cacheMergeImagesFromServer(imgs, username, token);
    console.log(`[pipelineImageCache] stored ${r.count} image(s) for offline/compute`);
  } catch (e) {
    console.warn('[pipelineImageCache]', e);
  }
}

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

const DrawToolbar = ({ featureGroupRef, onCreated, onEdited, onDeleted }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !featureGroupRef.current) return undefined;

    const drawnLayerGroup = featureGroupRef.current;
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawnLayerGroup,
        edit: true,
        remove: true,
      },
      draw: {
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: true,
        polyline: {
          metric: true,
          showLength: true,
          precision: 2,
        },
        polygon: true,
      },
    });

    const handleCreated = (event) => {
      drawnLayerGroup.addLayer(event.layer);
      onCreated(event);
    };
    const handleEdited = (event) => onEdited(event);
    const handleDeleted = (event) => onDeleted(event);

    map.addControl(drawControl);
    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
    };
  }, [map, featureGroupRef, onCreated, onEdited, onDeleted]);

  return null;
};

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const coordinatesToKml = (coordinates = []) =>
  coordinates.map((pair) => `${pair[0]},${pair[1]},0`).join(' ');

const geometryToPlacemark = (feature, index) => {
  const geometry = feature?.geometry;
  if (!geometry) return '';

  const name = escapeXml(feature?.properties?.name || `Feature ${index + 1}`);
  const type = geometry.type;

  if (type === 'LineString') {
    return `<Placemark><name>${name}</name><LineString><tessellate>1</tessellate><coordinates>${coordinatesToKml(geometry.coordinates)}</coordinates></LineString></Placemark>`;
  }
  if (type === 'MultiLineString') {
    return geometry.coordinates
      .map(
        (line, lineIndex) =>
          `<Placemark><name>${name} ${lineIndex + 1}</name><LineString><tessellate>1</tessellate><coordinates>${coordinatesToKml(line)}</coordinates></LineString></Placemark>`
      )
      .join('');
  }
  if (type === 'Polygon') {
    const outer = geometry.coordinates?.[0] || [];
    return `<Placemark><name>${name}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinatesToKml(outer)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
  }
  if (type === 'Point') {
    return `<Placemark><name>${name}</name><Point><coordinates>${coordinatesToKml([geometry.coordinates])}</coordinates></Point></Placemark>`;
  }

  return '';
};

const featureCollectionToKml = (features = [], docName = 'Drawn KML') => {
  const placemarks = features.map((feature, index) => geometryToPlacemark(feature, index)).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docName)}</name>
    ${placemarks}
  </Document>
</kml>`;
};

const MapComponent = forwardRef(({ chainage, offsetType, laneCount, kmlMergeOffset, startDate, endDate, imageDirection, onSaveSuccess, initialGeoJson }, ref) => {
  const { token, user } = useAuth();
  const position = [18.5204, 73.8567]; // Pune center
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [dataKey, setDataKey] = useState(0);
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [drawnFeatures, setDrawnFeatures] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' });
  const featureGroupRef = React.useRef(null);
  const localDraftKey = `kml_local_draft_${user?.username || 'anonymous'}`;

  const saveDraftLocally = (payload) => {
    try {
      localStorage.setItem(localDraftKey, JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      console.error("Error writing local draft:", e);
      return false;
    }
  };

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
      setIsDataVisible(true); // Hide search bar when uploading
      // 1. Upload file to server
      const formData = new FormData();
      formData.append('kmlFile', file);
      // Append current metadata to the upload
      formData.append('chainage', chainage);
      formData.append('offsetType', offsetType);
      formData.append('laneCount', laneCount);
      formData.append('kmlMergeOffset', kmlMergeOffset);
      formData.append('startDate', startDate || '');
      formData.append('endDate', endDate || '');
      formData.append('imageDirection', imageDirection || 'down_to_up');

      fetch(`${API_URL}/upload-kml`, {
        method: 'POST',
        headers: apiHeaders(token, user?.username),
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log("File uploaded successfully to:", data.pipelinePath);
          if (onSaveSuccess && data.pipelinePath) {
            onSaveSuccess(data.pipelinePath);
          }
          void refreshPipelineImageCache(data.mergeImages, token, user?.username);
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
        kmlMergeOffset,
        startDate,
        endDate,
        imageDirection
      },
      geometry: allFeatures
    };

    try {
      const response = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiHeaders(token, user?.username),
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      if (result.success) {
        saveDraftLocally(payload);
        setSaveStatus({ show: true, message: 'Data saved successfully!', type: 'success' });
        if (onSaveSuccess && result.pipelinePath) {
          onSaveSuccess(result.pipelinePath);
        }
        void refreshPipelineImageCache(result.mergeImages, token, user?.username);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);
      } else {
        const savedLocally = saveDraftLocally(payload);
        const detail = result.details ? ` ${String(result.details)}` : '';
        setSaveStatus({
          show: true,
          message: savedLocally
            ? `Server save failed (${result.message || 'unknown error'}).${detail} Draft saved locally on this device.`
            : 'Error saving data: ' + (result.message || 'Unknown error') + detail,
          type: savedLocally ? 'success' : 'error'
        });
      }
    } catch (error) {
      console.error("Error saving data:", error);
      const savedLocally = saveDraftLocally(payload);
      setSaveStatus({
        show: true,
        message: savedLocally
          ? 'Server unavailable. Draft saved locally on this device.'
          : 'Error saving data to server. Make sure the server is running.',
        type: savedLocally ? 'success' : 'error'
      });
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
        headers: apiHeaders(token, user?.username),
      });
      
      const result = await response.json();
      if (result.success) {
        void clearPipelineImageCache(user?.username);
        // 2. Clear local map layers
        if (featureGroupRef.current) {
          featureGroupRef.current.clearLayers();
        }
        setGeoJsonData(null);
        setDrawnFeatures([]);
        setDataKey(prev => prev + 1);
        setIsDataVisible(false);
        localStorage.removeItem(localDraftKey);
        
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
      }
    }
  };

  const getCurrentDrawnFeatures = () => {
    if (!featureGroupRef.current) return [];
    return featureGroupRef.current.getLayers().map((layer) => layer.toGeoJSON());
  };

  const getAllKnownFeatures = () => {
    const current = getCurrentDrawnFeatures();
    if (current.length > 0) return current;
    return Array.isArray(drawnFeatures) ? drawnFeatures : [];
  };

  const hasDrawnGeometry = getAllKnownFeatures().some((feature) =>
    !!feature?.geometry?.type
  );

  const triggerDrawPolyline = () => {
    const drawLineButton = document.querySelector('.leaflet-draw-draw-polyline');
    if (drawLineButton && typeof drawLineButton.click === 'function') {
      drawLineButton.click();
    } else {
      alert('Use the draw tool on the left to draw a KML line.');
    }
  };

  const downloadDrawnKml = () => {
    const allDrawn = getAllKnownFeatures().filter((feature) => !!feature?.geometry?.type);
    if (!allDrawn.length) {
      alert('No drawn geometry found. Please draw and finish a line first.');
      return;
    }

    const kmlText = featureCollectionToKml(allDrawn, `${user?.username || 'user'}-drawn-kml`);
    if (!kmlText.includes('<Placemark>')) {
      alert('No exportable geometry found for KML download.');
      return;
    }

    const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user?.username || 'drawn'}-kml.kml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadKmlButton = () => {
    if (!hasDrawnGeometry) {
      const shouldDraw = window.confirm('No drawn line found. Press OK to start drawing KML.');
      if (shouldDraw) triggerDrawPolyline();
      return;
    }
    downloadDrawnKml();
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
      <div className="kml-download-container">
        <button type="button" className="kml-download-button" onClick={handleDownloadKmlButton}>
          Download KML
        </button>
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
          <DrawToolbar
            featureGroupRef={featureGroupRef}
            onCreated={_onCreated}
            onEdited={_onEdited}
            onDeleted={_onDeleted}
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
