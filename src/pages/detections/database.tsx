import {useEffect, useState} from 'react';
import '@picocss/pico/css/pico.min.css';
import {useRouter} from "next/router";
import Link from "next/link";


type Position = {
  x: number
  y: number
  z: number
}

type Detection = {
  id: number
  label: string
  position: Position
}

export default function DetectionsPage() {
  const router = useRouter();
  const { robot_id } = router.query;
  const [detections, setDetections] = useState<Detection[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<SpeechRecognition | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';


  const fetchDetections = async () => {
    try {
      const response = await fetch(`${apiUrl}/detections?robot_id=${robot_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError(response.status === 401
          ? "You don't have access to this robot"
          : "Failed to fetch robot")
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
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        method: 'DELETE',
      });
      if (!response.ok) {
        setError('Failed to delete detection');
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleNavigate = async (id: number) => {
    try {
      const response = await fetch(`${apiUrl}/ros/${id}/navigate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }, method: 'POST',
      });
      if (!response.ok) {
        setError('Failed to navigate to detection');
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to navigate');
    }
  };


  useEffect(() => {
    fetchDetections();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as Window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log("Heard:", transcript);

      const navigateMatch = transcript.match(/navigate to (.+)/);
      if (navigateMatch) {
        const label = navigateMatch[1].toLowerCase();
        const match = detections.find(d => d.label.toLowerCase() === label);
        if (match) {
          handleNavigate(match.id);
        } else {
          console.warn(`No detection found with label "${label}"`);
        }
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', e);
    };

    setRecognitionInstance(recognition);

    return () => recognition.stop();
  }, [detections]);

  useEffect(() => {
    if (!recognitionInstance) return;

    if (isListening) {
      recognitionInstance.start();
      console.log("Voice recognition started");
    } else {
      recognitionInstance.stop();
      console.log("Voice recognition stopped");
    }
  }, [isListening, recognitionInstance]);


  if (isLoading) return (
    <div className="container">
      <article aria-busy="true" style={{textAlign: 'center', marginTop: '2rem'}}>
        Loading detections...
        <p style={{textAlign: 'center', marginTop: '1rem', fontStyle: 'italic'}}>
          It can take up to 30 seconds if the backend server is sleeping
        </p>
      </article>
    </div>
  );

  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/dashboard" passHref legacyBehavior>
        <a role="button" className="secondary">Back to dashboard</a>
      </Link>
    </div>
  );

  return (
    <div className="container">
      <article style={{marginTop: '2rem'}}>
        <header style={{marginBottom: '2rem'}}>
          <h1>Object Detections</h1>
          <p>List of all detected objects in the database</p>
          <button
            onClick={() => setIsListening(!isListening)}
            className={isListening ? 'contrast' : 'outline'}
            style={{backgroundColor: isListening ? 'red' : '', color: isListening ? 'white' : ''}}
          >
            {isListening ? '🎙️ Stop Listening' : '🎙️ Start Listening'}
          </button>
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
                    <td>x: {detection.position["x"]}, y: {detection.position["y"]}</td>
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