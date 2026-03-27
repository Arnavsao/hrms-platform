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

// Gemini Live sends 24kHz PCM; we capture mic at 16kHz (what Gemini Live expects for input)
const PLAYBACK_SAMPLE_RATE = 24000;
const CAPTURE_SAMPLE_RATE = 16000;
const CAPTURE_BUFFER_SIZE = 2048; // 2048 @ 48kHz = ~43ms latency (was 4096 = 85ms)

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
  interview_allowed: boolean;
  job?: { title?: string };
  jobs?: { title?: string };
}

function resolveWebSocketUrl(sessionId: string) {
  const wsBase = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsBase.replace(/\/$/, '')}/api/voice-interviews/ws/${sessionId}`;
}

/** Convert Float32 samples → Int16 PCM bytes */
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

/** Downsample a Float32Array from sourceSR to targetSR */
function downsample(buffer: Float32Array, sourceSR: number, targetSR: number): Float32Array {
  if (sourceSR === targetSR) return buffer;
  const ratio = sourceSR / targetSR;
  const outLength = Math.round(buffer.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    out[i] = buffer[Math.round(i * ratio)];
  }
  return out;
}

/** Encode Int16Array to base64 */
function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

type CandidateInterviewPageProps = { params: { applicationId: string } };

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
  const [isMicActive, setIsMicActive] = useState(false);

  // Per-question answer timer (3 minutes = 180 seconds)
  const ANSWER_TIMER_SECONDS = 180;
  const [answerTimerSecs, setAnswerTimerSecs] = useState<number | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    setAnswerTimerSecs(null);
  }, []);

  const startAnswerTimer = useCallback((onExpire: () => void) => {
    clearAnswerTimer();
    setAnswerTimerSecs(ANSWER_TIMER_SECONDS);
    let remaining = ANSWER_TIMER_SECONDS;
    answerTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAnswerTimerSecs(remaining);
      if (remaining <= 0) {
        clearInterval(answerTimerRef.current!);
        answerTimerRef.current = null;
        setAnswerTimerSecs(null);
        onExpire();
      }
    }, 1000);
  }, [clearAnswerTimer]);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [finalReport, setFinalReport] = useState<VoiceInterviewFinalizeResponse | null>(null);

  // Refs — stable across renders
  const websocketRef = useRef<WebSocket | null>(null);
  const isInterviewActiveRef = useRef(false);
  const finalizeTriggeredRef = useRef(false);

  // Audio playback
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackCursorRef = useRef(0);

  // Audio capture
  const captureCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Transcript scroll
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    api.getApplication(params.applicationId)
      .then(setApplication)
      .catch((err: any) => setLoadError(err?.response?.data?.detail || 'Unable to load application details.'))
      .finally(() => setIsLoadingApplication(false));
  }, [params.applicationId]);

  // ─── Playback ───────────────────────────────────────────────────────────────

  const ensurePlaybackContext = useCallback(() => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      playbackCursorRef.current = playbackCtxRef.current.currentTime;
    }
    // Resume if suspended (browser autoplay policy)
    if (playbackCtxRef.current.state === 'suspended') {
      playbackCtxRef.current.resume();
    }
    return playbackCtxRef.current;
  }, []);

  const playAudioChunk = useCallback((base64Data: string, sampleRate: number = PLAYBACK_SAMPLE_RATE) => {
    try {
      const ctx = ensurePlaybackContext();
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const buf = ctx.createBuffer(1, float32.length, sampleRate);
      buf.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime, playbackCursorRef.current);
      src.start(startAt);
      playbackCursorRef.current = startAt + buf.duration;
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }, [ensurePlaybackContext]);

  // ─── Capture ────────────────────────────────────────────────────────────────

  const stopMicCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close();
      captureCtxRef.current = null;
    }
    setIsMicActive(false);
  }, []);

  const startMicCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const ctx = new AudioContext();
      captureCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor captures raw float32 samples
      const processor = ctx.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const ws = websocketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        // Downsample from browser's native sample rate to 16kHz for Gemini
        const downsampled = downsample(float32, ctx.sampleRate, CAPTURE_SAMPLE_RATE);
        const int16 = float32ToInt16(downsampled);
        const b64 = int16ToBase64(int16);

        ws.send(JSON.stringify({ type: 'audio_chunk', data: b64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // must connect to destination to fire onaudioprocess
      setIsMicActive(true);
      console.log('[Audio] Mic capture started, native SR:', ctx.sampleRate);
    } catch (err: any) {
      console.error('[Audio] Failed to start mic capture:', err);
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone access and try again.'
        : `Microphone error: ${err?.message || err}`;
      setError(msg);
    }
  }, []);

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  const appendTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const sendManualTurn = useCallback((text: string) => {
    const ws = websocketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return;
    ws.send(JSON.stringify({ type: 'candidate_turn', text: text.trim(), is_final: true, source: 'manual' }));
  }, []);

  const closeWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  const resetSessionState = useCallback(() => {
    stopMicCapture();
    closeWebSocket();
    clearAnswerTimer();
    setIsInterviewActive(false);
    isInterviewActiveRef.current = false;
    setIsSessionLoading(false);
    setSessionId(null);
    finalizeTriggeredRef.current = false;
  }, [closeWebSocket, stopMicCapture, clearAnswerTimer]);

  useEffect(() => {
    return () => {
      resetSessionState();
      playbackCtxRef.current?.close();
    };
  }, [resetSessionState]);

  useEffect(() => { isInterviewActiveRef.current = isInterviewActive; }, [isInterviewActive]);

  const finalizeInterview = useCallback(async (mode: 'auto' | 'manual' = 'manual') => {
    if (!sessionId || isFinalizing) return;
    if (mode === 'auto' && finalizeTriggeredRef.current) return;

    finalizeTriggeredRef.current = true;
    stopMicCapture();

    const ws = websocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'end_session', reason: mode }));
    }

    setIsFinalizing(true);
    setInfoMessage(mode === 'auto' ? 'Wrapping up your interview...' : 'Generating interview summary...');

    try {
      const report = await api.finalizeVoiceInterviewSession(sessionId);
      setFinalReport(report);
      setInfoMessage('Interview complete. Review the evaluation below.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unable to finalize interview.';
      setError(detail);
      finalizeTriggeredRef.current = false;
    } finally {
      setIsFinalizing(false);
      closeWebSocket();
      setIsInterviewActive(false);
      isInterviewActiveRef.current = false;
    }
  }, [closeWebSocket, isFinalizing, sessionId, stopMicCapture]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'status': {
          if (data.message === 'connected') setInfoMessage('Connected. Preparing the first question...');
          if (data.message === 'session_started') setInfoMessage('Interview started — speak clearly when ready.');
          if (data.message === 'finalize_ready') {
            setInfoMessage('All questions complete. Wrapping up...');
            if (!finalizeTriggeredRef.current) finalizeInterview('auto');
          }
          if (data.message === 'stream_closed' || data.message === 'session_closed') {
            if (!finalizeTriggeredRef.current) finalizeInterview('auto');
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
          // When AI finishes speaking a question, start the candidate answer timer
          if (data.role === 'assistant') {
            startAnswerTimer(() => {
              // Timer expired → auto-advance to next question via candidate_done
              const ws = websocketRef.current;
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'candidate_done' }));
              }
            });
          } else {
            // Candidate answered — stop timer
            clearAnswerTimer();
          }
          break;
        }
        case 'audio_chunk': {
          playAudioChunk(data.data, data.sample_rate || PLAYBACK_SAMPLE_RATE);
          break;
        }
        case 'error': {
          setError(data.message || 'Voice interview stream error.');
          break;
        }
        default: break;
      }
    } catch (err) {
      console.error('Failed to parse websocket payload', err);
    }
  }, [appendTranscript, finalizeInterview, playAudioChunk]);

  const handleStartInterview = useCallback(async () => {
    if (isSessionLoading || isInterviewActive) return;

    setError(null);
    setInfoMessage(null);
    setIsSessionLoading(true);
    setTranscript([]);
    setFinalReport(null);
    finalizeTriggeredRef.current = false;
    closeWebSocket();

    try {
      const response = await api.createVoiceInterviewSession(params.applicationId);
      setSessionId(response.session_id);

      const wsUrl = resolveWebSocketUrl(response.session_id);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => setInfoMessage('Connected — starting microphone...');
      socket.onmessage = handleWebSocketMessage;
      socket.onerror = () => setError('Connection to voice interviewer dropped.');
      socket.onclose = () => {
        setIsInterviewActive(false);
        isInterviewActiveRef.current = false;
        websocketRef.current = null;
      };
      websocketRef.current = socket;

      setIsInterviewActive(true);
      isInterviewActiveRef.current = true;

      // Start mic AFTER WebSocket is assigned so onaudioprocess can find it
      await startMicCapture();
      setInfoMessage('Microphone active. The interviewer will begin shortly.');
    } catch (err: any) {
      console.error('Failed to start voice interview', err);
      setError(err?.response?.data?.detail || err?.message || 'Unable to start voice interview.');
      resetSessionState();
    } finally {
      setIsSessionLoading(false);
    }
  }, [closeWebSocket, handleWebSocketMessage, isInterviewActive, isSessionLoading, params.applicationId, resetSessionState, startMicCapture]);

  const handleSendManualInput = useCallback(() => {
    if (!manualInput.trim()) return;
    sendManualTurn(manualInput);
    appendTranscript({ id: `candidate-${Date.now()}`, role: 'candidate', text: manualInput.trim(), timestamp: new Date().toISOString() });
    setManualInput('');
  }, [appendTranscript, manualInput, sendManualTurn]);

  const handleEndAnswerEarly = useCallback(() => {
    clearAnswerTimer();
    const ws = websocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'candidate_done' }));
    }
  }, [clearAnswerTimer]);

  const jobTitle = useMemo(() => {
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
        <Button variant="outline" onClick={() => router.push('/candidate')}>Return to dashboard</Button>
      </div>
    );
  }

  // Locked state: recruiter has explicitly revoked interview access
  if (application.interview_allowed === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <MicOff className="h-12 w-12 text-gray-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Interview Not Available Yet</h2>
          <p className="mt-2 text-gray-500 max-w-md">
            Your recruiter hasn&apos;t enabled the voice interview for this application. Please check back later or contact your recruiter.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/candidate')}>Return to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" className="w-max" onClick={() => router.push('/candidate')}>← Back to dashboard</Button>
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
              <p className="text-sm text-muted-foreground">Speak naturally — the AI interviewer replies in real-time.</p>
            </div>
            <div className="flex items-center gap-2">
              {isMicActive && (
                <Badge variant="default" className="flex items-center gap-1 bg-red-500 text-white animate-pulse">
                  <Mic className="h-3 w-3" /> Live
                </Badge>
              )}
              <Badge variant={isInterviewActive ? 'default' : 'outline'} className="flex items-center gap-1">
                {isInterviewActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isInterviewActive ? 'In Progress' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-80 overflow-y-auto rounded-md border bg-muted/30 p-4">
              {transcript.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                  <Volume2 className="mb-2 h-6 w-6" />
                  Waiting for conversation to start...
                </div>
              )}
              <div className="space-y-3">
                {transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md p-3 shadow-sm ${item.role === 'assistant' ? 'bg-background' : 'bg-primary/10 ml-8'}`}
                  >
                    <p className="text-xs uppercase text-muted-foreground mb-1">
                      {item.role === 'assistant' ? 'AI Interviewer' : 'You'}
                    </p>
                    <p className="text-sm text-foreground">{item.text}</p>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            {/* Manual fallback input */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Manual Response <span className="text-xs">(use if microphone is unavailable)</span>
              </p>
              <Textarea
                placeholder="Type your answer here..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={!isInterviewActive}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSendManualInput(); }}
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleSendManualInput} disabled={!isInterviewActive || !manualInput.trim()}>
                  Send response
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
              ) : (
                <><Mic className="mr-2 h-4 w-4" /> Start Interview</>
              )}
            </Button>
            {/* End Answer Early — signals candidate is done speaking, advance to next Q */}
            {isInterviewActive && answerTimerSecs !== null && (
              <Button variant="secondary" onClick={handleEndAnswerEarly}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> End Answer Early
              </Button>
            )}
            <Button onClick={() => finalizeInterview('manual')} variant="destructive" disabled={!isInterviewActive || isFinalizing}>
              {isFinalizing ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Finalizing</>
              ) : (
                <><StopCircle className="mr-2 h-4 w-4" /> End Interview</>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader><CardTitle>Interview Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>Role:</strong> {jobTitle}</p>
              <p><strong>Status:</strong> {isInterviewActive ? 'In progress' : finalReport ? 'Completed' : 'Not started'}</p>
              {isMicActive && (
                <p className="flex items-center gap-1 text-green-600">
                  <Mic className="h-3 w-3" /> Microphone active
                </p>
              )}
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Tips</p>
              <ul className="list-outside list-disc space-y-1 pl-4">
                <li>Allow microphone access when prompted.</li>
                <li>Speak clearly and wait for the AI to finish before responding.</li>
                <li>Click &quot;End Answer Early&quot; when done — or wait for the timer.</li>
                <li>Use Manual Response below if your mic isn&apos;t working.</li>
              </ul>
            </div>

            {/* Countdown Timer */}
            {answerTimerSecs !== null && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Answer Timer</p>
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <svg className="absolute inset-0" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="36" stroke="#fde68a" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="36"
                      stroke={answerTimerSecs <= 30 ? '#ef4444' : '#f59e0b'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - answerTimerSecs / ANSWER_TIMER_SECONDS)}`}
                      transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <span className={`text-lg font-bold tabular-nums ${answerTimerSecs <= 30 ? 'text-red-600' : 'text-amber-800'}`}>
                    {String(Math.floor(answerTimerSecs / 60)).padStart(2, '0')}:{String(answerTimerSecs % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-amber-600">Time remaining to answer</p>
              </div>
            )}

            {finalReport && (
              <div className="space-y-3 rounded-md border border-green-500/60 bg-green-500/10 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" /> Interview Summary Ready
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Overall Score:</strong> {Math.round(finalReport.evaluation.overall_score)}%</p>
                  <p><strong>Communication:</strong> {Math.round(finalReport.evaluation.communication_score)}%</p>
                  <p><strong>Domain Knowledge:</strong> {Math.round(finalReport.evaluation.domain_knowledge_score)}%</p>
                  <div className="pt-1">
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
