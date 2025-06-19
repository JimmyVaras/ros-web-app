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
}

interface VoiceCommandsProps {
  robot_id: number;
}

export default function VoiceCommands({ robot_id }: VoiceCommandsProps) {
  const [detections, setDetections] = useState<Detection[]>([])
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
        pattern: /navega (?:a|al|a la) (.+)/,
        action: (match) => {
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
        pattern: /ve (?:a|al|a la) (.+)/,
        action: (match) => {
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
          // Aquí podrías llamar a un endpoint de "avanzar", que deberías implementar.
          console.log("Comando: avanzar");
        }
      },
      {
        pattern: /vuelta 360/,
        action: () => {
          // Igual, endpoint para giro completo.
          console.log("Comando: vuelta 360");
        }
      },
      {
        pattern: /retrocede/,
        action: () => {
          handleMoveBack();
        }
      }
    ];

  // Elimina artículos de los nombres de los objetos
  const cleanLabel = (raw: string) => {
    return raw.toLowerCase().replace(/^(a|el|la|los|las)\s+/, '').trim();
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

  useEffect(() => {
    fetchDetections();
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
    recognition.interimResults = true;
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
    </section>
  );
}