import '@picocss/pico/css/pico.min.css';
import { useRouter } from 'next/router';
import { ReactElement, useState, useEffect } from 'react';
import Link from "next/link";
import MapViewer from "@/components/MapViewer";
import TempDetectionsList from "@/components/TempDetectionsList";

export default function DetectionsIndex(): ReactElement {
  const router = useRouter();
  const { robot_id } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(Date.now());
  const [imageUrl, setImageUrl] = useState<string>("https://placehold.co/600x400?text=Loading+camera...");


  const handleReload = () => {
    setReloadKey(Date.now());  // Cambia la clave para forzar reload
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const url = `${baseUrl}/ros/proxy-detections?auth=${token}&reload=${reloadKey}`;
    setImageUrl(url);
    }, [reloadKey]);


  useEffect(() => {
    if (!robot_id || Array.isArray(robot_id)) return;

    const fetchRobot = async () => {
      try {
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/robots/${robot_id}`, {
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

      } catch (error) {
        console.error("Fetch error:", error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRobot();
  }, [robot_id]);

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/" passHref legacyBehavior>
        <a role="button" className="secondary">Back to dashboard</a>
      </Link>
    </div>
  );

  return (
    <div className="container" style={{ marginTop: "2rem", width: "80%"}}>
      <h1>Real Time Detections</h1>
      <div className="grid">
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button onClick={() =>
                router.push({
                  pathname: '/detections/database',
                  query: { robot_id: robot_id }
                })
              } > Objects Stored </button>
            <Link href="/" passHref legacyBehavior>
              <a role="button" className="secondary">Link</a>
            </Link>
            <TempDetectionsList robot_id={robot_id?.toString() || ''} />
          </div>
          <section style={{
             display: 'flex',
             justifyContent: 'center',
             gap: '2rem',
             width: '100%',
             marginLeft: '0%',
             marginTop: '1rem',
             flexWrap: 'wrap' // Allows items to wrap on smaller screens
           }}>
             <div style={{
               textAlign: 'center',
               flex: 1,
               minWidth: '300px' // Minimum width before wrapping
             }}>
               <img
                 src={imageUrl}
                 alt="Live detections feed"
                 style={{
                   maxWidth: '100%',
                   borderRadius: '8px',
                   border: '1px solid #ccc'
                 }}
               />
               <button
                 onClick={handleReload}
                 role="button"
                 style={{ marginTop: '1rem' }}
                 className="secondary"
               >
                 Restart video ⟳
               </button>
             </div>

             <div style={{
               textAlign: 'center',
               flex: 1,
               minWidth: '300px' // Minimum width before wrapping
             }}>
               <MapViewer />
             </div>
           </section>
      </div>
    </div>
  );
}