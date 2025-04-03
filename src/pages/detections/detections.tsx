import { useEffect, useState } from 'react';
import { getDetections } from './api';
import type { Detection } from './api';
import '@picocss/pico/css/pico.min.css';


export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const data = await getDetections();
        setDetections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetections();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container">
      <h1>Object Detections</h1>
      <table role="grid">
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th>Position</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((detection) => (
            <tr key={detection.id}>
              <td>{detection.id}</td>
              <td>{detection.label}</td>
              <td>{detection.position}</td>
              <td>
                <div role="group">
                  <button type="submit">Navigate🚀</button>
                  <button class="secondary">Remove🗑️</button>
                </div>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}