import { useState, useEffect } from 'react';
import Image from "next/image";

function MapViewer() {
  const [reload, setReload] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Auto-refresh effect
    useEffect(() => {
      let interval: string | number | NodeJS.Timeout | undefined;
      if (autoRefresh) {
        interval = setInterval(() => {
          setReload(prev => prev + 1);
        }, 1000); // Update every second
      }
      return () => clearInterval(interval);
    }, [autoRefresh]);

    const imageUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/ros/proxy-map?reload=${reload}`;

    return (
      <section style={{ textAlign: 'center' }}>
        <Image
          src={imageUrl}
          alt="Map with robot"
          width={600}
          height={400}
          unoptimized
          style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #ccc" }}
        />
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
      </section>
    );
  }

  export default MapViewer;