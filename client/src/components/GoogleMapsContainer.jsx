import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

const center = {
  lat: 28.5682,
  lng: 77.2410
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// ----------------- LEAFLET MAP IMPLEMENTATION -----------------
function LeafletMap({
  issues = [],
  onLocationSelect = null,
  selectedLocation = null,
  onMarkerClick = null,
  zoom = 14,
  interactive = true
}) {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Load Leaflet CSS CDN if not present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initLeafletMap = () => {
      if (!mapRef.current || leafletMapInstance.current) return;
      const L = window.L;
      if (!L) return;

      const mapCenter = selectedLocation || center;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([mapCenter.lat, mapCenter.lng], zoom);

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      leafletMapInstance.current = map;

      // Handle map clicks
      if (interactive && onLocationSelect) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          onLocationSelect({ lat, lng });
        });
      }
    };

    // Load Leaflet JS CDN
    if (window.L) {
      initLeafletMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initLeafletMap;
      document.head.appendChild(script);
    }

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!leafletMapInstance.current || !window.L) return;
    const L = window.L;
    const map = leafletMapInstance.current;

    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Render issues
    issues.forEach(issue => {
      if (!issue || issue.lat === undefined || issue.lng === undefined || issue.lat === null || issue.lng === null || isNaN(Number(issue.lat)) || isNaN(Number(issue.lng))) {
        console.warn('Skipping issue with invalid coordinates:', issue);
        return;
      }
      const colors = {
        'Pothole': '#C0603C',
        'Streetlight': '#A9801C',
        'Water': '#357FD6',
        'Waste': '#1E8A4F',
        'Tree / Park': '#5E8A2E',
        'Other': '#7A6BC0'
      };
      const color = colors[issue.cat] || '#7A6BC0';

      const marker = L.circleMarker([Number(issue.lat), Number(issue.lng)], {
        radius: 8,
        fillColor: color,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px;">
          <b style="font-size: 13.5px; color: #1E241F; display: block; margin-bottom: 3px;">${issue.title}</b>
          <span style="font-size: 11px; color: #5B655B; display: block; margin-bottom: 2px;">Category: ${issue.cat}</span>
          <span style="font-size: 11px; color: #5B655B; display: block; margin-bottom: 6px;">Status: ${issue.status}</span>
          <a href="#" onclick="event.preventDefault(); if(window.openIssueDetail) window.openIssueDetail('${issue.customId}');" style="color: #1E8A4F; font-weight: 700; font-size: 12.5px; text-decoration: underline; display: inline-block;">View Details</a>
        </div>
      `);
      markersRef.current.push(marker);
    });

    // Render temp placement pin
    if (selectedLocation && selectedLocation.lat !== undefined && selectedLocation.lng !== undefined && selectedLocation.lat !== null && selectedLocation.lng !== null && !isNaN(Number(selectedLocation.lat)) && !isNaN(Number(selectedLocation.lng))) {
      const activePin = L.circleMarker([Number(selectedLocation.lat), Number(selectedLocation.lng)], {
        radius: 10,
        fillColor: '#1E8A4F',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map);

      markersRef.current.push(activePin);
      map.panTo([Number(selectedLocation.lat), Number(selectedLocation.lng)]);
    }
  }, [issues, selectedLocation]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '9px',
        fontWeight: 700,
        color: '#5B655B',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        Leaflet Map Active
      </div>
    </div>
  );
}

// ----------------- GOOGLE MAP IMPLEMENTATION -----------------
function GoogleMapImpl({
  apiKey,
  issues = [],
  onLocationSelect = null,
  selectedLocation = null,
  onMarkerClick = null,
  zoom = 14,
  interactive = true,
  fallback
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [googleMap, setGoogleMap] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

  const onLoad = useCallback(function callback(mapInstance) {
    setGoogleMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance) {
    setGoogleMap(null);
  }, []);

  useEffect(() => {
    if (loadError) {
      fallback();
    }
  }, [loadError, fallback]);

  const handleMapClick = (e) => {
    if (interactive && onLocationSelect) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onLocationSelect({ lat, lng });
    }
  };

  const handleMarkerClick = (markerId) => {
    setActiveMarker(markerId);
  };

  if (loadError) {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#E7EDE1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#C0603C', fontWeight: 'bold' }}>Error loading Google Maps.</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#E7EDE1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '13px', color: '#7C8479', animation: 'cpBlink 1.4s infinite' }}>Loading Google Map...</div>
      </div>
    );
  }

  const getMarkerIcon = (cat) => {
    const colors = {
      'Pothole': '#C0603C',
      'Streetlight': '#A9801C',
      'Water': '#357FD6',
      'Waste': '#1E8A4F',
      'Tree / Park': '#5E8A2E',
      'Other': '#7A6BC0'
    };
    const color = colors[cat] || '#7A6BC0';

    return {
      path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 7
    };
  };

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={selectedLocation || center}
      zoom={zoom}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
    >
      {issues.filter(issue => issue && issue.lat !== undefined && issue.lng !== undefined && issue.lat !== null && issue.lng !== null && !isNaN(Number(issue.lat)) && !isNaN(Number(issue.lng))).map((issue) => (
        <MarkerF
          key={issue.customId}
          position={{ lat: Number(issue.lat), lng: Number(issue.lng) }}
          icon={getMarkerIcon(issue.cat)}
          onClick={() => handleMarkerClick(issue.customId)}
        />
      ))}

      {selectedLocation && onLocationSelect && (
        <MarkerF
          position={selectedLocation}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#1E8A4F',
            fillOpacity: 0.9,
            strokeWeight: 3,
            strokeColor: '#FFFFFF',
            scale: 9
          }}
        />
      )}

      {activeMarker && (
        (() => {
          const matchedIssue = issues.find(i => i.customId === activeMarker);
          if (!matchedIssue) return null;
          return (
            <InfoWindowF
              position={{ lat: matchedIssue.lat, lng: matchedIssue.lng }}
              onCloseClick={() => setActiveMarker(null)}
            >
              <div style={{ padding: '4px', maxWidth: '200px' }}>
                <h4 style={{ fontWeight: 800, fontSize: '13.5px', marginBottom: '2px', color: '#1E241F' }}>
                  {matchedIssue.title}
                </h4>
                <p style={{ fontSize: '11px', color: '#5B655B', margin: '0 0 6px 0' }}>
                  Category: <b>{matchedIssue.cat}</b> <br />
                  Status: <b>{matchedIssue.status}</b>
                </p>
                <span
                  onClick={() => {
                    if (onMarkerClick) onMarkerClick(matchedIssue.customId);
                  }}
                  style={{ color: '#1E8A4F', fontWeight: 'bold', cursor: 'pointer', fontSize: '12.5px', textDecoration: 'underline' }}
                >
                  View Details
                </span>
              </div>
            </InfoWindowF>
          );
        })()
      )}
    </GoogleMap>
  );
}

// ----------------- MAIN EXPORTED WRAPPER -----------------
export default function GoogleMapsContainer(props) {
  // Check if API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isKeyPlaceholder = !apiKey || apiKey === 'your_google_maps_api_key_here';

  const [useLeaflet, setUseLeaflet] = useState(isKeyPlaceholder);

  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps authentication failed. Falling back to OpenStreetMap.');
      setUseLeaflet(true);
    };

    return () => {
      window.gm_authFailure = null;
    };
  }, []);

  if (useLeaflet) {
    return <LeafletMap {...props} />;
  }

  return (
    <GoogleMapImpl
      apiKey={apiKey}
      {...props}
      fallback={() => setUseLeaflet(true)}
    />
  );
}
