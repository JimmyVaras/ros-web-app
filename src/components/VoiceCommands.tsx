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
          ? "You don't have access to this robot"
          : "Failed to fetch robot")
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
        setError('Failed to navigate to detection');
      } else if (response.ok) {
        setFailedMatch("")
        setGoalSent(matchingText)
      }

      await fetchDetections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to navigate');
    }
  };


  useEffect(() => {
    fetchDetections();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as Window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFailedMatch('Speech recognition not supported in this browser.');
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

      const navigateMatch = transcript.match(/navega a (.+)/);
      if (navigateMatch) {
        const label = navigateMatch[1].toLowerCase();
        const match = detections.find(d => d.label.toLowerCase() === label);
        if (match) {
          handleNavigate(match.id, navigateMatch[1]);
        } else {
          setGoalSent("")
          setFailedMatch(`No se encontró el objeto "${label}"`)
          console.warn(`No se encontró el objeto "${label}"`);
        }
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
        <a role="button" className="secondary">Back to dashboard</a>
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
          {goalSent ? `➡️ Navengado a ${goalSent}...` : ''}
        </p> : <></>}
        <button
          onClick={() => setIsListening(!isListening)}
          className={isListening ? 'contrast' : 'outline'}
          style={{backgroundColor: isListening ? 'red' : '', color: isListening ? 'white' : ''}}>
          {isListening ? '🎙️ Parar' : '🎙️ Iniciar'}
        </button>
    </section>
  );
}