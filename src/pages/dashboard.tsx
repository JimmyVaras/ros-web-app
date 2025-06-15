import '@picocss/pico/css/pico.min.css';
import {useEffect, useState} from "react";
import { useRouter } from "next/router";

type Robot = {
  id: number
  name: string
  model: string
}

export default function Dashboard() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/robots`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          console.log("401 encontrado")
          localStorage.removeItem("token");
          router.push("/");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch robots");
        }

        const data = await res.json();
        setRobots(data || []);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <main className="container">
      <section style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", marginTop: "5rem" }}>
        <h1>Inicio</h1>

        {error ? (
          <div className="alert alert-error">{error}</div>
        ) : (
          <>
            {robots.length === 0 ? (
              <p>No se encontraron robots.</p>
            ) : (
              <ul style={{ padding: 0 }}>
                {robots.map((robot) => (
                  <li
                    key={robot.id}
                    style={{
                      background: "#000000",
                      padding: "1rem",
                      borderRadius: "6px",
                      marginBottom: "0.5rem",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{robot.name}</strong> ({robot.model})
                    </div>
                    <button
                      onClick={() =>
                        router.push({
                          pathname: '/robot',
                          query: { id: robot.id.toString() }
                        })
                      } >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <hr style={{ margin: "2rem 0" }} />
        <button className="contrast"
          style={{ backgroundColor: "#960012", color: "#fff" }}
          onClick={logout}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}