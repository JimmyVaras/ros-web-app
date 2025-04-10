/// <reference lib="dom" />

interface Window {
  SpeechRecognition: typeof SpeechRecognition | undefined;
  webkitSpeechRecognition: typeof SpeechRecognition | undefined;
}

declare class SpeechRecognition {
  constructor();
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void; // Update this line
}

declare class SpeechRecognitionEvent extends Event {
  constructor(type: string, eventInitDict?: SpeechRecognitionEventInit);
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEventInit extends EventInit {
  results?: SpeechRecognitionResultList;
}
