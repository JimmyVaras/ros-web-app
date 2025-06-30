// --------------------
// Componente del listado de detecciones temporales.
// Autor: Jaime Varas Cáceres
// --------------------

import {useEffect, useState} from 'react';
import '@picocss/pico/css/pico.min.css';
import Link from "next/link";
import {toast, ToastContainer} from 'react-toastify';


type Position = {
  x: number
  y: number
  z: number
}

type TempDetection = {
    id: number
    label: string
    confidence: number
    position_obj: Position
    position_nav: Position
  }

interface TempDetectionsListProps {
  robot_id: string;
}


export default function TempDetectionsList({ robot_id }: TempDetectionsListProps) {
  const [tempDetections, setTempDetections] = useState<TempDetection[]>([])
  const [error, setError] = useState<string | null>(null);

  const fetchTempDetections = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/temp?robot_id=${robot_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError(response.status === 401
          ? "No tienes permiso para acceder a este robot"
          : "Fallo al cargar robot")
      }

      const data = await response.json();
      setTempDetections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSave = async (id: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/save/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        method: 'POST',
      });

      if (response.status === 409) {
        // Conflict due to duplicate → remove from list
        setTempDetections(prev => prev.filter(det => det.id !== id));
        toast('Fallo al guardar! Se encontró un duplicado', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
      } else if (!response.ok) {
        toast('Fallo al guardar!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
      } else {
        // On success, also remove the saved detection
        setTempDetections(prev => prev.filter(det => det.id !== id));
        toast('Detección guardada!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallo al guardar la detección temporal');
    }
  };


  const handleDelete = async (id: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/temp/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        method: 'DELETE',
      });
      if (!response.ok) {
        toast('Fallo al borrar!', {
          closeButton: false,
          theme: 'colored',
          pauseOnFocusLoss: false,
        });
      } else {
        setTempDetections(prev => prev.filter(det => det.id !== id));
        toast('Borrada!', {
          closeButton: false,
          theme: 'colored',
          pauseOnFocusLoss: false,
        });

        // Wait 3 seconds, then re-fetch detections to refresh UI
        setTimeout(() => {
          fetchTempDetections();
        }, 2300);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallo al borrar temporary detection');
    }
  };

  const handleClear = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/temp/remove/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        method: 'DELETE',
      });

      if (!response.ok) {
        toast('Fallor al borrar!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
      } else {
        // On success, also clear the list
        setTempDetections([]);
        toast('Detecciones temporales borradas!', {closeButton: false, theme: 'colored', pauseOnFocusLoss: false});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallo al borrar las detecciones temporales');
    }
  };

  useEffect(() => {
    fetchTempDetections();
  }, []);


  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/dashboard" passHref legacyBehavior>
        <a role="button" className="secondary">Vuelta al inicio</a>
      </Link>
    </div>
  );

  return (
    <section style={{ marginTop: '1rem' }} className="container">
      {tempDetections.length === 0 ? (
        <p>No temporary detections found.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '0rem' }}>
          <button
            style={{ marginRight: '0.5rem' }}
            onClick={() => handleClear()}
          >
            Borrar todas 🗑️
          </button>
          {tempDetections.map((detection) => (
            <article key={detection.id} style={{ padding: '1rem' }}>
              <header>
                <strong>{detection.label}</strong> ({detection.confidence}%)
              </header>
              <p>
                Posición: x={detection.position_obj.x.toFixed(2)}, y={detection.position_obj.y.toFixed(2)}
              </p>
              <footer>
                <button
                  style={{ marginRight: '0.5rem' }}
                  onClick={() => handleSave(detection.id)}
                >
                  Guardar 💾
                </button>
                <button
                  aria-atomic={"true"}
                  onClick={() => handleDelete(detection.id)}
                  className="secondary"
                >
                  Borrar 🗑️
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      <ToastContainer autoClose={2000} />
    </section>
  );
}