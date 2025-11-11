'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, VoiceInterviewFinalizeResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  StopCircle,
  Volume2,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_SAMPLE_RATE = 24000;

interface TranscriptEntry {
  id: string;
  role: 'assistant' | 'candidate';
  text: string;
  timestamp: string;
}

interface ApplicationDetails {
  id: string;
  candidate_id: string;
  job_id: string;
  job?: {
    title?: string;
  };
  jobs?: {
    title?: string;
  };
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function resolveWebSocketUrl(sessionId: string) {
  const wsBase = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsBase.replace(/\/$/, '')}/api/voice-interviews/ws/${sessionId}`;
}

type CandidateInterviewPageProps = {
  params: {
    applicationId: string;
  };
};

export default function CandidateVoiceInterviewPage({ params }: CandidateInterviewPageProps) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [finalReport, setFinalReport] = useState<VoiceInterviewFinalizeResponse | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackCursorRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const isInterviewActiveRef = useRef(false);
  const finalizeTriggeredRef = useRef(false);
  const autoFinalizeRef = useRef(false);
  const lastPartialRef = useRef('');

  const isSpeechRecognitionSupported = useMemo(() => {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  useEffect(() => {
    async function fetchApplication() {
      try {
        const data = await api.getApplication(params.applicationId);
        setApplication(data);
      } catch (err: any) {
        console.error('Failed to load application', err);
        setLoadError(err?.response?.data?.detail || 'Unable to load application details.');
      } finally {
        setIsLoadingApplication(false);
      }
    }

    fetchApplication();
  }, [params.applicationId]);

  const appendTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      playbackCursorRef.current = audioContextRef.current.currentTime;
    }
    return audioContextRef.current;
  }, []);

  const playAudioChunk = useCallback((base64Data: string, sampleRate: number = DEFAULT_SAMPLE_RATE) => {
    const audioContext = ensureAudioContext();
    if (!audioContext) {
      return;
    }

    const binary = atob(base64Data);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) {
      view[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i += 1) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = audioContext.createBuffer(1, float32.length, sampleRate);
    audioBuffer.copyToChannel(float32, 0);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime, playbackCursorRef.current);
    source.start(startAt);
    playbackCursorRef.current = startAt + audioBuffer.duration;
  }, [ensureAudioContext]);

  const closeWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Failed to stop speech recognition', err);
      } finally {
        recognitionRef.current = null;
      }
    }
    lastPartialRef.current = '';
  }, []);

  const resetSessionState = useCallback(() => {
    closeWebSocket();
    stopSpeechRecognition();
    setIsInterviewActive(false);
    isInterviewActiveRef.current = false;
    setIsSessionLoading(false);
    setInterimTranscript('');
    setSessionId(null);
    finalizeTriggeredRef.current = false;
    autoFinalizeRef.current = false;
    lastPartialRef.current = '';
  }, [closeWebSocket, stopSpeechRecognition]);

  useEffect(() => {
    return () => {
      resetSessionState();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [resetSessionState]);

  useEffect(() => {
    isInterviewActiveRef.current = isInterviewActive;
  }, [isInterviewActive]);

  const sendCandidateTurn = useCallback(
    (text: string, options?: { isFinal?: boolean; source?: string }) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const socket = websocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('Voice interview websocket is not ready. Dropping candidate turn.');
        return;
      }

      socket.send(
        JSON.stringify({
          type: 'candidate_turn',
          text: trimmed,
          is_final: options?.isFinal !== false,
          source: options?.source,
        }),
      );
    },
    [],
  );

  const handleRecognitionResult = useCallback(
    (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcriptText = result[0]?.transcript?.trim();
        if (!transcriptText) {
          continue;
        }

        if (result.isFinal) {
          sendCandidateTurn(transcriptText, { isFinal: true, source: 'speech' });
          lastPartialRef.current = '';
          setInterimTranscript('');
        } else {
          if (transcriptText !== lastPartialRef.current) {
            sendCandidateTurn(transcriptText, { isFinal: false, source: 'speech' });
            lastPartialRef.current = transcriptText;
          }
          setInterimTranscript(transcriptText);
        }
      }
    },
    [sendCandidateTurn],
  );

  const startSpeechRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      setInfoMessage('Speech recognition is not supported in this browser. Use manual input below.');
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setInfoMessage('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = handleRecognitionResult;
    recognition.onerror = (event: any) => {
      setError(event?.error || 'Microphone error');
    };
    recognition.onend = () => {
      if (isInterviewActiveRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleRecognitionResult, isSpeechRecognitionSupported]);

  const handleSendManualInput = useCallback(() => {
    const trimmed = manualInput.trim();
    if (!trimmed) {
      return;
    }
    sendCandidateTurn(trimmed, { isFinal: true, source: 'manual' });
    setManualInput('');
  }, [manualInput, sendCandidateTurn]);

  const finalizeInterview = useCallback(
    async (mode: 'auto' | 'manual' = 'manual') => {
      console.log('[Voice Interview] finalizeInterview called, mode:', mode, 'sessionId:', sessionId, 'isFinalizing:', isFinalizing);
      
      if (!sessionId || isFinalizing) {
        console.log('[Voice Interview] Finalize skipped - no sessionId or already finalizing');
        return;
      }

      if (mode === 'auto' && finalizeTriggeredRef.current) {
        console.log('[Voice Interview] Auto-finalize skipped - already triggered');
        return;
      }

      console.log('[Voice Interview] Starting finalization process');
      finalizeTriggeredRef.current = true;
      autoFinalizeRef.current = mode === 'auto';

      stopSpeechRecognition();
      const socket = websocketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('[Voice Interview] Sending end_session to websocket');
        socket.send(
          JSON.stringify({
            type: 'end_session',
            reason: mode,
          }),
        );
      }

      setIsFinalizing(true);
      setInfoMessage(mode === 'auto' ? 'Wrapping up your interview...' : 'Generating interview summary...');

      try {
        console.log('[Voice Interview] Calling API finalize endpoint for session:', sessionId);
        const report = await api.finalizeVoiceInterviewSession(sessionId);
        console.log('[Voice Interview] Finalize successful:', report);
        setFinalReport(report);
        setInfoMessage('Interview complete. Review the evaluation below.');
      } catch (err: any) {
        console.error('[Voice Interview] Finalize failed:', err);
        const detail = err?.response?.data?.detail || err?.message || 'Unable to finalize interview.';
        setError(detail);
        finalizeTriggeredRef.current = false;
      } finally {
        setIsFinalizing(false);
        closeWebSocket();
        setIsInterviewActive(false);
        isInterviewActiveRef.current = false;
        autoFinalizeRef.current = false;
      }
    },
    [closeWebSocket, isFinalizing, sessionId, stopSpeechRecognition],
  );

  const handleEndInterview = useCallback(() => {
    finalizeInterview('manual');
  }, [finalizeInterview]);

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Voice Interview] WebSocket event:', data.type, data);
        switch (data.type) {
          case 'status': {
            if (data.message === 'connected') {
              setInfoMessage('Connected. Preparing the first question...');
            }
            if (data.message === 'session_started') {
              setInfoMessage('Interview session ready. Start speaking when you are ready.');
            }
            if (data.message === 'finalize_ready') {
              console.log('[Voice Interview] Finalize ready event received, triggering auto-finalize');
              setInfoMessage('Thanks! Wrapping up your interview...');
              if (!finalizeTriggeredRef.current) {
                console.log('[Voice Interview] Calling finalizeInterview(auto)');
                finalizeInterview('auto');
              } else {
                console.log('[Voice Interview] Finalize already triggered, skipping');
              }
            }
            if (data.message === 'stream_closed' || data.message === 'session_closed') {
              console.log('[Voice Interview] Session closed event, checking if finalize needed');
              setInfoMessage('Interview session closed. Preparing your summary...');
              if (!finalizeTriggeredRef.current) {
                console.log('[Voice Interview] Calling finalizeInterview(auto) after session close');
                finalizeInterview('auto');
              }
            }
            break;
          }
          case 'transcript': {
            const entry: TranscriptEntry = {
              id: `${data.role}-${Date.now()}-${Math.random()}`,
              role: data.role,
              text: data.text,
              timestamp: data.timestamp || new Date().toISOString(),
            };
            appendTranscript(entry);
            if (data.role === 'candidate') {
              setInterimTranscript('');
            }
            break;
          }
          case 'audio_chunk': {
            playAudioChunk(data.data, data.sample_rate || DEFAULT_SAMPLE_RATE);
            break;
          }
          case 'error': {
            setError(data.message || 'Voice interview stream error.');
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse websocket payload', err);
      }
    },
    [appendTranscript, finalizeInterview, playAudioChunk],
  );

  const handleStartInterview = useCallback(async () => {
    if (isSessionLoading || isInterviewActive) {
      return;
    }

    setError(null);
    setInfoMessage(null);
    setIsSessionLoading(true);
    setTranscript([]);
    setFinalReport(null);
    finalizeTriggeredRef.current = false;
    autoFinalizeRef.current = false;
    lastPartialRef.current = '';
    closeWebSocket();

    try {
      const response = await api.createVoiceInterviewSession(params.applicationId);
      setSessionId(response.session_id);

      const wsUrl = resolveWebSocketUrl(response.session_id);
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        setInfoMessage('Connected. You can start speaking once ready.');
      };
      socket.onmessage = handleWebSocketMessage;
      socket.onerror = (event) => {
        console.error('Voice interview websocket error', event);
        setError('Connection to voice interviewer dropped.');
      };
      socket.onclose = () => {
        setIsInterviewActive(false);
        isInterviewActiveRef.current = false;
        websocketRef.current = null;
      };

      websocketRef.current = socket;
      setIsInterviewActive(true);
      isInterviewActiveRef.current = true;
      setInfoMessage('Connecting to interviewer...');
      startSpeechRecognition();
    } catch (err: any) {
      console.error('Failed to start voice interview', err);
      const detail = err?.response?.data?.detail || err?.message || 'Unable to start voice interview.';
      setError(detail);
      resetSessionState();
    } finally {
      setIsSessionLoading(false);
    }
  }, [closeWebSocket, handleWebSocketMessage, params.applicationId, resetSessionState, startSpeechRecognition, isInterviewActive, isSessionLoading]);

  const jobTitle = useMemo(() => {
    if (!application) return 'Voice Interview';
    return application?.jobs?.title || application?.job?.title || 'Voice Interview';
  }, [application]);

  if (isLoadingApplication) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading interview details...
      </div>
    );
  }

  if (loadError || !application) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError || 'Interview not available.'}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/candidate')}>
          Return to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" className="w-max" onClick={() => router.push('/candidate')}>
          ← Back to dashboard
        </Button>
        <h1 className="text-3xl font-bold">Voice Interview</h1>
        <p className="text-muted-foreground">Role: {jobTitle}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {infoMessage && !error && (
        <Alert>
          <Headphones className="h-4 w-4" />
          <AlertDescription>{infoMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conversation</CardTitle>
              <p className="text-sm text-muted-foreground">Speak naturally — the interviewer replies in real-time.</p>
            </div>
            <Badge variant={isInterviewActive ? 'default' : 'outline'} className="flex items-center gap-1">
              {isInterviewActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isInterviewActive ? 'Recording' : 'Inactive'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-80 overflow-y-auto rounded-md border bg-muted/30 p-4">
              {transcript.length === 0 && !interimTranscript && (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                  <Volume2 className="mb-2 h-6 w-6" />
                  Waiting for conversation to start...
                </div>
              )}
              <div className="space-y-3">
                {transcript.map((item) => (
                  <div key={item.id} className="rounded-md bg-background p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">{item.role === 'assistant' ? 'AI Interviewer' : 'You'}</p>
                    <p className="text-sm text-foreground">{item.text}</p>
                  </div>
                ))}
                {interimTranscript && (
                  <div className="rounded-md border border-dashed border-muted-foreground/50 p-3 text-sm text-muted-foreground">
                    {interimTranscript}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Manual Response (optional)</p>
              <Textarea
                placeholder="Type your answer if you prefer not to speak"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                disabled={!isInterviewActive}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleSendManualInput} disabled={!isInterviewActive || !manualInput.trim()}>
                  Send typed response
                </Button>
                <Button variant="outline" onClick={() => setManualInput('')} disabled={!manualInput}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center gap-3">
            <Button onClick={handleStartInterview} disabled={isSessionLoading || isInterviewActive}>
              {isSessionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Start Interview
                </>
              )}
            </Button>
            <Button
              onClick={handleEndInterview}
              variant="destructive"
              disabled={!isInterviewActive || isFinalizing}
            >
              {isFinalizing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Finalizing
                </>
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" /> End Interview
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Interview Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>Application ID:</strong> {application.id}</p>
              <p><strong>Role:</strong> {jobTitle}</p>
              <p><strong>Status:</strong> {isInterviewActive ? 'In progress' : finalReport ? 'Completed' : 'Not started'}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium">Tips</p>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-4">
                <li>Use a clear voice and speak naturally.</li>
                <li>Pause between answers so the interviewer can respond.</li>
                <li>You can also type your response if your microphone has trouble.</li>
              </ul>
            </div>
            {finalReport && (
              <div className="space-y-3 rounded-md border border-green-500/60 bg-green-500/10 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" /> Interview Summary Ready
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Overall Score:</strong> {Math.round(finalReport.evaluation.overall_score)}%</p>
                  <p><strong>Communication:</strong> {Math.round(finalReport.evaluation.communication_score)}%</p>
                  <p><strong>Domain Knowledge:</strong> {Math.round(finalReport.evaluation.domain_knowledge_score)}%</p>
                  <div>
                    <p className="font-medium">Summary</p>
                    <p className="text-muted-foreground">{finalReport.evaluation.summary}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
