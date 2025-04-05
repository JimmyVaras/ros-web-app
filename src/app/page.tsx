import Link from "next/link";
import '@picocss/pico/css/pico.min.css';


export default function HomePage() {
  return (
    <main>
      <h1>Welcome to My Home Page</h1>
      <p>This is the home page of my Next.js app.</p>
      <Link href="/ros/detected_objects" passHref>
        <button role="button" className="secondary">
          View Detected Objects at /detected_objects_markers
        </button>
      </Link>
      <Link href="/detections/detections/" passHref>
        <button role="button" className="secondary">
          View Stored Objects in the database
        </button>
      </Link>
    </main>
  );
}
