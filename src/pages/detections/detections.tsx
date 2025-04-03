import {useEffect, useState} from 'react';
import '@picocss/pico/css/pico.min.css';

interface Detection {
  id: number;
  label: string;
  position: string;
}

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetections = async () => {
    try {
      const apiUrl = process.env.API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setDetections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const apiUrl = process.env.API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete detection');
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleNavigate = (id: number) => {
    // Implement navigation logic
    console.log(`Navigating to detection ${id}`);
    // Or use Next.js router:
    // router.push(`/detections/${id}`);
  };

  useEffect(() => {
    fetchDetections();
  }, []);

  if (isLoading) return (
    <div className="container">
      <article aria-busy="true" style={{textAlign: 'center', marginTop: '2rem'}}>
        Loading detections...
      </article>
    </div>
  );

  if (error) return (
    <div className="container">
      <article className="alert alert-error" style={{marginTop: '2rem'}}>
        <header>Error</header>
        {error}
      </article>
    </div>
  );

  return (
    <div className="container">
      <article style={{marginTop: '2rem'}}>
        <header style={{marginBottom: '2rem'}}>
          <h1>Object Detections</h1>
          <p>List of all detected objects in the system</p>
        </header>

        <div className="grid">
          <div className="col-12">
            <figure>
              <table role="grid" className="striped">
                <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Label</th>
                  <th scope="col">Position</th>
                  <th scope="col">Actions</th>
                </tr>
                </thead>
                <tbody>
                {detections.map((detection) => (
                  <tr key={detection.id}>
                    <td><code>{detection.id}</code></td>
                    <td><strong>{detection.label}</strong></td>
                    <td>{detection.position}</td>
                    <td>
                      <div className="grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                        <button
                          onClick={() => handleNavigate(detection.id)}
                          className="outline"
                        >
                          Navigate 🚀
                        </button>
                        <button
                          onClick={() => handleDelete(detection.id)}
                          className="secondary"
                        >
                          Remove 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </figure>
          </div>
        </div>

        {detections.length === 0 && (
          <div className="empty">
            <p>No detections found</p>
          </div>
        )}
      </article>
    </div>
  );
}