'use client';

import { useState, useEffect, useRef } from 'react';
import {toast, ToastContainer} from 'react-toastify';

interface MapViewerProps {
  highlightedPoints: Position[];
}

function MapViewer({ highlightedPoints }: MapViewerProps) {
  const [reload, setReload] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [mapUrl, setMapUrl] = useState<string>("https://placehold.co/600x400?text=Loading+map...");
  const imgRef = useRef<HTMLImageElement>(null);

  // CONFIG — ajustar al mapa
  const mapWidth = 600;
  const mapHeight = 400;
  const mapResolution = 0.05; // metros/pixel
  const originX = -13.0;
  const originY = -7.5;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const mapUrl = `${baseUrl}/ros/proxy-map?auth=${localStorage.getItem('token')}&reload=${reload}`;
    setMapUrl(mapUrl);
    }, [reload]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        setReload(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x_px = e.clientX - rect.left;
    const y_px = e.clientY - rect.top;

    const x = originX + x_px * mapResolution;
    const y = originY + (mapHeight - y_px) * mapResolution;

    console.log("Sending goal to:", x, y);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/ros/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ x, y })
    });

    if (!res.ok) {
      toast('Failed to send goal!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
    } else {
      toast('Goal sent!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
    }
  };

  return (
    <section style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={mapUrl}
          alt="Map"
          width={mapWidth}
          height={mapHeight}
          style={{ border: '1px solid #ccc', borderRadius: '8px' }}
          onClick={handleClick}
        />
    {highlightedPoints?.map((point, idx) => {
    const x = (point.x - originX) / mapResolution;
    const y = mapHeight - (point.y - originY) / mapResolution;

    return (
      <div
        key={idx}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '10px',
          height: '10px',
          backgroundColor: 'red',
          borderRadius: '50%',
          transform: 'translate(-1400%, -750%)',
          pointerEvents: 'none',
        }}
      />
    );
  })}
</div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
          Auto-update:
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={() => setAutoRefresh(!autoRefresh)}
          />
        </label>
      </div>
      <ToastContainer />
    </section>
  );
}

export default MapViewer;
