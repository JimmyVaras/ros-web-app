import {useEffect, useState} from 'react';
import '@picocss/pico/css/pico.min.css';
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
  room_id: number
}

type Room = {
  id: number
  name: string
  position_start: Position
  position_end: Position
  position_ref: Position
}

interface VoiceCommandsProps {
  robot_id: number;
}

export default function VoiceCommands({ robot_id }: VoiceCommandsProps) {
  const [detections, setDetections] = useState<Detection[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<SpeechRecognition | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [failedMatch, setFailedMatch] = useState<string>('');
  const [goalSent, setGoalSent] = useState<string>('');

  const voiceCommands: {
      pattern: RegExp,
      action: (match: RegExpMatchArray) => void
    }[] = [
      {
        pattern: /(?:ve|navega) (?:al|a la) ([^ ]+)(del| de la)? (.+)/,
        action: (match) => {
          console.log("patrón con habitación" + match[1] + "--" + match[3])
          const label = cleanLabel(match[1]);
          const roomName = cleanLabel(match[3]);
          console.log("label: ", label)
          console.log("roomname: ", roomName)


          // Buscar la habitación por nombre en la lista de rooms
          const room = rooms.find(r => r.name.toLowerCase() === roomName);
          console.log("room encontrado:", room);

          if (room) {
            const obj = detections.find(d =>
              d.label.toLowerCase() === label &&
              d.room_id === room.id
            );
            console.log("detections:", detections);
            console.log("obj:", obj);

            if (obj == undefined) {
              setGoalSent("");
              setFailedMatch(`No se encontró el objeto "${label}" en la habitación "${roomName}"`);
              return
            }

            if (obj != undefined) {
              console.log("navegando")
              handleNavigate(obj.id, `${label} en ${roomName}`);
            } else {
              setGoalSent("");
              setFailedMatch(`No se encontró el objeto "${label}" en la habitación "${roomName}"`);
            }
          } else {
            setGoalSent("");
            setFailedMatch(`No se encontró la habitación "${roomName}"`);
          }
        }
      },
      {
        pattern: /navega (?:a|al|a la) (?!.*\bde\b|\bdel\b)(.+)/,
        action: (match) => {
          console.log("patrón sin habitación")
          const label = cleanLabel(match[1]);
          const obj = detections.find(d => d.label.toLowerCase() === label);
          if (obj) handleNavigate(obj.id, match[1]);
          else {
            setGoalSent("");
            setFailedMatch(`No se encontró el objeto "${label}"`);
          }
        }
      },
      {
        pattern: /ve (?:al|a la) (?!.*\bde\b|\bdel\b)(.+)/,
        action: (match) => {
          console.log("patrón sin habitación")
          const label = cleanLabel(match[1]);
          const obj = detections.find(d => d.label.toLowerCase() === label);
          if (obj) handleNavigate(obj.id, match[1]);
          else {
            setGoalSent("");
            setFailedMatch(`No se encontró el objeto "${label}"`);
          }
        }
      },
      {
        pattern: /avanza/,
        action: () => {
          // TODO
          console.log("Comando: avanzar");
        }
      },
      {
        pattern: /vuelta 360/,
        action: () => {
          // TODO
          console.log("Comando: vuelta 360");
        }
      },
      {
        pattern: /retrocede/,
        action: () => {
          handleMoveBack();
        }
      },
      {
        pattern: /inicia patrulla/,
        action: () => {
          patrol(true);
        }
      },
      {
        pattern: /(fin|finaliza|termina) patrulla/,
        action: () => {
          patrol(false);
        }
      }
    ];

  // Elimina artículos de los nombres de los objetos
  const cleanLabel = (raw: string = '') => {
    return raw.toLowerCase().replace(/^(a|el|la|los|las|del|de la|.)\s+/, '').trim();
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

  const fetchDetections = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
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
    }
  };

  const handleNavigate = async (id: number, matchingText: string) => {
    console.log("navego porque quierooo")
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/ros/${id}/navigate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }, method: 'POST',
      });
      if (!response.ok) {
        setError('Fallo al navegar al objeto');
      } else if (response.ok) {
        setFailedMatch("")
        setGoalSent(`Navegando a ${matchingText}`)
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al navegar');
    }
  };

  const handleMoveBack = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/ros/move-back`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }, method: 'POST',
      });
      if (!response.ok) {
        setError('Fallo al retroceder');
      } else if (response.ok) {
        setFailedMatch("")
        setGoalSent("Retrocediendo")
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fallo al retroceder');
    }
  };

  const patrol = async (isStart: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/ros/patrol/${isStart ? 'start' : 'stop'}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }, method: 'POST',
      });
      if (!response.ok) {
        setError(isStart ? 'Fallo al patrullar' : 'Fallo al detener patrullaje');
      } else if (response.ok) {
        setFailedMatch("")
        setGoalSent(isStart ? "Iniciando patrullaje" : "Finalizando patrullaje")
      }
      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isStart ? 'Fallo al patrullar' : 'Fallo al detener patrullaje'));
    }
  };

  useEffect(() => {
    fetchDetections();
    fetchRooms();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as Window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFailedMatch('El reconocimiento de voz no está soportado por este navegador.');
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // TODO: para evitar comandos partidos
    recognition.lang = 'es-ES';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      setTranscript(transcript);
      console.log("Heard:", transcript);

      const matchedCommand = voiceCommands.find(cmd => transcript.match(cmd.pattern));
      if (matchedCommand) {
        const match = transcript.match(matchedCommand.pattern);
        if (match) matchedCommand.action(match);
      } else {
        setGoalSent("");
        setFailedMatch(`No se entendió el comando: "${transcript}"`);
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
      setTranscript("")
      setFailedMatch("")
      console.log("Voice recognition stopped");
    }
  }, [isListening, recognitionInstance]);


  if (error) return (
    <div className="container grid" style={{ marginTop: '10%', placeItems: 'center', flexDirection: 'column', display: 'flex' }}>
      <div>Error: {error}.</div>
      <Link href="/dashboard" passHref legacyBehavior>
        <a role="button" className="secondary">Volver al inicio</a>
      </Link>
    </div>
  );

  return (
    <>
      <section style={{marginTop: '2rem'}}>
          {isListening ? <p style={{ fontStyle: 'italic', color: 'gray' }}>
            {transcript ? `🗣️ "${transcript}"` : 'Escuchando...'}
          </p> : <></>}
          {(isListening && failedMatch) ? <p style={{ color: 'red' }}>
            {failedMatch ? `${failedMatch}` : ''}
          </p> : <></>}
          {(isListening && goalSent) ? <p style={{ color: 'green' }}>
            {goalSent ? `➡️ ${goalSent}...` : ''}
          </p> : <></>}
          <button
            onClick={() => setIsListening(!isListening)}
            className={isListening ? 'contrast' : 'outline'}
            style={{backgroundColor: isListening ? 'red' : '', color: isListening ? 'white' : ''}}>
            {isListening ? '🎙️ Parar' : '🎙️ Escuchar'}
          </button>

          {/* Add Help button next to the microphone button */}
          <button
            onClick={() => {
                const dialog = document.getElementById('helpDialog');
                if (dialog instanceof HTMLDialogElement) {
                  dialog.showModal();
                }
              }}
            className="outline"
            style={{marginLeft: '0.5rem'}}>
            ❓ Ayuda
          </button>
      </section>

      {/* Help Dialog */}
      <dialog id="helpDialog">
        <article>
          <header>
            <button
              aria-label="Close"
              rel="prev"
              onClick={() => {
                const dialog = document.getElementById('helpDialog');
                if (dialog instanceof HTMLDialogElement) {
                  dialog.close();
                }
              }}
            />
            <p>
              <strong>🎙️ Comandos de Voz Disponibles</strong>
            </p>
          </header>
          <p>Puedes usar los siguientes comandos de voz:</p>

          <h5>Navegación:</h5>
          <ul>
            <li><strong>Navega a [objeto]</strong> - Ir a un objeto específico (ej: Navega a silla)</li>
            <li><strong>Ve a [objeto]</strong> - Alternativa para navegar (ej: Ve a mesa)</li>
            <li><strong>Navega a [objeto] de [habitación]</strong> - Objetos en habitaciones específicas (ej: Navega a cuadro de sala)</li>
            <li><strong>Ve a [objeto] de [habitación]</strong> - Alternativa para concretar objetos en habitaciones</li>
          </ul>

          <h5>Movimiento:</h5>
          <ul>
            <li><strong>Avanza</strong> - Mover hacia adelante aprox. 1 metro</li>
            <li><strong>Retrocede</strong> - Mover hacia atrás aprox. 1 metro</li>
            <li><strong>Vuelta 360</strong> - Dar una vuelta completa para mirar alrededor</li>
            <li><strong>Mira a la izquierda/derecha/detrás</strong> - Gira el robot en esa dirección</li>
          </ul>

          <h5>Patrulla:</h5>
          <ul>
            <li><strong>Inicia patrulla</strong> - Comenzar modo patrulla</li>
            <li><strong>Finaliza patrulla</strong> - Terminar modo patrulla (también acepta fin patrulla o termina patrulla)</li>
          </ul>

          <h5>Otros:</h5>
          <ul>
            {/*TODO: Por implementar*/}
            <li><strong>Detener</strong> - Parar la escucha del micrófono</li>
            <li><strong>Ayuda</strong> - Mostrar esta información</li>
          </ul>
        </article>
      </dialog>
    </>
  );
}