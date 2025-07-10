// --------------------
// Página mostrada en /detections/database
// Autor: Jaime Varas Cáceres
// --------------------

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
  position_obj: Position
  position_nav: Position
  room_id: number
}

type Room = {
  id: number
  name: string
  position_start: Position
  position_end: Position
  position_ref: Position
}

export default function DetectionsPage() {
  const router = useRouter();
  const { robot_id } = router.query;
  const [detections, setDetections] = useState<Detection[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          ? "No tienes permiso para acceder a este robot"
          : "Fallo al cargar robot")
      }

      const data = await response.json();
      setDetections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/detections/rooms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError(response.status === 401
          ? "No tienes permiso para acceder a esta información"
          : "Fallo al cargar habitaciones")
      }

      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    fetchRooms();
  }, []);


  if (isLoading) return (
    <div className="container">
      <article aria-busy="true" style={{textAlign: 'center', marginTop: '2rem'}}>
        Cargando detecciones...
        <p style={{textAlign: 'center', marginTop: '1rem', fontStyle: 'italic'}}>
          Puede tomar hasta 30 segundos si el servidor está en reposo
        </p>
      </article>
    </div>
  );

  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/dashboard" passHref legacyBehavior>
        <a role="button" className="secondary">Volver al inicio</a>
      </Link>
    </div>
  );

  return (
    <div className="container">
      <article style={{marginTop: '2rem'}}>
        <header style={{marginBottom: '2rem'}}>
          <h1>Detección de objetos</h1>
          <p>Lista de todos los objetos detectados</p>
        </header>

        <div className="grid">
          <div className="col-12">
            <figure>
              <table role="grid" className="striped">
                <thead>
                <tr>
                  <th scope="col">Id</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Posición</th>
                  <th scope="col">Habitación</th>
                  <th scope="col">Acciones</th>
                </tr>
                </thead>
                <tbody>
                {detections.map((detection) => (
                  <tr key={detection.id}>
                    <td><code>{detection.id}</code></td>
                    <td><strong>{detection.label}</strong></td>
                    <td>
                      x: {Number(detection.position_obj["x"]).toFixed(2)}, y: {Number(detection.position_obj["y"]).toFixed(2)}
                    </td>
                    <td>
                      <strong>
                        {
                          rooms.find(room => room.id === detection.room_id)?.name || `Sala ${detection.room_id}`
                        }
                      </strong>
                    </td>
                    <td>
                      <div className="grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                        <button
                          onClick={() => handleNavigate(detection.id)}
                          className="outline"
                        >
                          Navegar 🚀
                        </button>
                        <button
                          onClick={() => handleDelete(detection.id)}
                          className="secondary"
                        >
                          Borrar 🗑️
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
            <p>No se encontraron detecciones.</p>
          </div>
        )}
      </article>
    </div>
  );
}