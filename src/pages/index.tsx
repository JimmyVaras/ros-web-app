// --------------------
// Página mostrada en la URL base de la app web
// Autor: Jaime Varas Cáceres
// --------------------

import '@picocss/pico/css/pico.min.css';
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If user is logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, []);


  const login = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // prevent page reload
    setLoading(true);
    setError("")

    const form = new URLSearchParams({ username, password });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/login`, {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      setLoading(true)
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        router.push("/dashboard");
      } else {
        setError("Credenciales inválidos");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section style={{ maxWidth: "400px", margin: "0 auto", textAlign: "center", marginTop: "5rem" }}>
        <h1>Bienvenid@ al panel de control</h1>
        <p>Por favor, introduzca sus datos para acceder.</p>

        <form onSubmit={login}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Identificador de cliente"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
          />
          <button type="submit" disabled={loading} aria-busy={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>

        {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
      </section>
    </main>
  );
}
