import '@picocss/pico/css/pico.min.css';
import { useRouter } from 'next/router';
import { ReactElement, useState, useEffect } from 'react';
import Link from "next/link";

type Robot = {
  id: number;
  name: string;
  model: string;
  imageUrl1: string;
  imageUrl2: string;
};

export default function RobotDetail(): ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const [robot, setRobot] = useState<Robot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || Array.isArray(id)) return;

    // Mock API call - TODO replace with actual fetch

    const fetchRobot = async () => {
      try {
        const mockRobot: Robot = {
          id: Number(id),
          name: `Robot ${id}`,
          model: `Model-X${id}`,
          imageUrl1: `https://robohash.org/${id}-primary`,
          imageUrl2: `https://robohash.org/${id}-secondary`
        };
        setRobot(mockRobot);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRobot();
  }, [id]);

  if (isLoading) return <div className="container">Loading...</div>;
  if (!robot) return <div className="container">Robot not found (404)</div>;

  return (
    <div className="container"  style={{ marginTop: "2rem", width: "80%"}}>
      <h1>{robot.name}</h1>
      <div className="grid">
        <div style={{ width: "5z0%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
            <Link href="/ros/detected_objects" passHref legacyBehavior>
              <a role="button" className="secondary">View Detected Objects</a>
            </Link>

            <Link href="/detections/detections" passHref legacyBehavior>
              <a role="button" className="secondary">View Stored Objects</a>
            </Link>
          </div>
        </div>
        <div>
          <img src="http://localhost:8001/camera/stream" alt="Live feed" />
        </div>
      </div>
    </div>
  );
}