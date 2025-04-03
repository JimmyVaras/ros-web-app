import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Welcome to My Home Page</h1>
      <p>This is the home page of my Next.js app.</p>
      <Link href="/ros/detected_objects" passHref>
        <button role="button" className="secondary">
          View Detected Objects
        </button>
      </Link>
    </main>
  );
}
