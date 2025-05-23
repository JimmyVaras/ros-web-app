import '@picocss/pico/css/pico.min.css';
import { useRouter } from 'next/router';
import { ReactElement, useState, useEffect } from 'react';
import Link from "next/link";

type Robot = {
  id: number;
  name: string;
  model: string;
};

export default function RobotDetail(): ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const [robot, setRobot] = useState<Robot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(Date.now());

  const handleReload = () => {
    setReloadKey(Date.now());  // Cambia la clave para forzar reload
  };

  const imageUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/ros/proxy-camera?reload=${reloadKey}`;

  useEffect(() => {
    if (!id || Array.isArray(id)) return;

    const fetchRobot = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/robots/${id}`, {
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

        setRobot({
          id: data.id,
          name: data.name,
          model: data.model
        });

      } catch (error) {
        console.error("Fetch error:", error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRobot();
  }, [id]);

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/" passHref legacyBehavior>
        <a role="button" className="secondary">Back to dashboard</a>
      </Link>
    </div>
  );
  if (!robot) return <div className="container">Robot not found (404)</div>;

  return (
    <div className="container" style={{ marginTop: "2rem", width: "80%"}}>
      <h1>{robot.name} - {robot.model}</h1>
      <div className="grid">
        <div style={{ width: "50%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button onClick={() =>
                router.push({
                  pathname: '/detections/detections',
                  query: { robot_id: robot.id.toString() }
                })
              } > Objects Stored </button>
            <Link href="/ros/detected_objects" passHref legacyBehavior>
              <a role="button" className="secondary">Live detections</a>
            </Link>
          </div>
        </div>
        <section style={{ textAlign: "center", marginTop: "2rem" }}>
          <div>
            <img
              src={imageUrl}
              alt="Live feed"
              style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #ccc" }}
            />
          </div>
          <button
            onClick={handleReload}
            role="button"
            style={{ marginTop: "1rem" }}
            className="secondary"
          >
            Restart video ⟳
          </button>
        </section>
      </div>
    </div>
  );
}