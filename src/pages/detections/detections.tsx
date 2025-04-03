import { useEffect, useState } from 'react';
import { getDetections, createDetection } from '../services/api';
import type { Detection } from '../services/api';

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
          </tr>
        </thead>
        <tbody>
          {detections.map((detection) => (
            <tr key={detection.id}>
              <td>{detection.id}</td>
              <td>{detection.label}</td>
              <td>{detection.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}