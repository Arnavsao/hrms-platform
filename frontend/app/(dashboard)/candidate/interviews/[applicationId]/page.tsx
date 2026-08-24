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
  ArrowRight,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PLAYBACK_SAMPLE_RATE = 24000;
const CAPTURE_SAMPLE_RATE = 16000;
const CAPTURE_BUFFER_SIZE = 2048;
const ANSWER_TIMER_SECONDS = 180; // 3 minutes
const TOTAL_QUESTIONS = 3;

interface TranscriptEntry {
  id: string;
  role: 'assistant' | 'candidate';
  text: string;
  timestamp: string;
  isPartial?: boolean; // live partial speech-to-text
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

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

function downsample(buffer: Float32Array, sourceSR: number, targetSR: number): Float32Array {
  if (sourceSR === targetSR) return buffer;
  const ratio = sourceSR / targetSR;
  const outLength = Math.round(buffer.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) out[i] = buffer[Math.round(i * ratio)];
  return out;
}

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

  // Question progress
  const [currentQuestion, setCurrentQuestion] = useState(0); // 1-indexed when active
  const [isAnswering, setIsAnswering] = useState(false); // true = AI finished speaking, candidate should answer

  // Answer timer
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
    if (playbackCtxRef.current.state === 'suspended') playbackCtxRef.current.resume();
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
    processorRef.current?.disconnect();
    if (processorRef.current) { processorRef.current.onaudioprocess = null; processorRef.current = null; }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    captureCtxRef.current?.close();
    captureCtxRef.current = null;
    setIsMicActive(false);
  }, []);

  const startMicCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      captureCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const ws = websocketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(float32, ctx.sampleRate, CAPTURE_SAMPLE_RATE);
        const int16 = float32ToInt16(downsampled);
        ws.send(JSON.stringify({ type: 'audio_chunk', data: int16ToBase64(int16) }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      setIsMicActive(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone access and try again.'
        : `Microphone error: ${err?.message || err}`;
      setError(msg);
    }
  }, []);

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  const closeWebSocket = useCallback(() => {
    if (websocketRef.current) { websocketRef.current.close(); websocketRef.current = null; }
  }, []);

  const resetSessionState = useCallback(() => {
    stopMicCapture();
    closeWebSocket();
    clearAnswerTimer();
    setIsInterviewActive(false);
    isInterviewActiveRef.current = false;
    setIsSessionLoading(false);
    setSessionId(null);
    setCurrentQuestion(0);
    setIsAnswering(false);
    finalizeTriggeredRef.current = false;
  }, [closeWebSocket, stopMicCapture, clearAnswerTimer]);

  useEffect(() => { return () => { resetSessionState(); playbackCtxRef.current?.close(); }; }, [resetSessionState]);
  useEffect(() => { isInterviewActiveRef.current = isInterviewActive; }, [isInterviewActive]);

  const finalizeInterview = useCallback(async (mode: 'auto' | 'manual' = 'manual') => {
    if (!sessionId || isFinalizing) return;
    if (mode === 'auto' && finalizeTriggeredRef.current) return;
    finalizeTriggeredRef.current = true;
    clearAnswerTimer();
    stopMicCapture();
    const ws = websocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'end_session', reason: mode }));
    setIsFinalizing(true);
    setIsAnswering(false);
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
  }, [closeWebSocket, clearAnswerTimer, isFinalizing, sessionId, stopMicCapture]);

  // Advance to next question (save current answer)
  const handleSaveAndNext = useCallback(() => {
    clearAnswerTimer();
    setIsAnswering(false);
    const ws = websocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'candidate_done' }));
    }
  }, [clearAnswerTimer]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'status': {
          if (data.message === 'connected') setInfoMessage('Connected. Preparing your interview questions...');
          if (data.message === 'session_started') {
            setInfoMessage('Interview started — listen for the first question.');
            setCurrentQuestion(1);
          }
          if (data.message === 'question_complete') {
            // AI finished speaking the question → start the answer timer
            setIsAnswering(true);
            startAnswerTimer(() => {
              // Timer expired — auto-save and advance
              handleSaveAndNext();
            });
          }
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
          // Final committed transcript entry
          // Remove any existing partial entry for this role, then add the committed one
          setTranscript(prev => {
            const withoutPartial = prev.filter(e => !(e.isPartial && e.role === data.role));
            return [...withoutPartial, {
              id: `${data.role}-${Date.now()}-${Math.random()}`,
              role: data.role,
              text: data.text,
              timestamp: data.timestamp || new Date().toISOString(),
            }];
          });
          // When candidate transcript is committed, stop timer and clear answering state
          // (but don't advance — that's only on candidate_done)
          if (data.role === 'candidate') {
            // Keep timer running — candidate may still be speaking
          }
          // When next question (assistant) arrives, update question counter
          if (data.role === 'assistant') {
            setIsAnswering(false);
            clearAnswerTimer();
            setCurrentQuestion(q => Math.min(q + (q > 0 ? 0 : 1), TOTAL_QUESTIONS));
          }
          break;
        }
        case 'transcript_partial': {
          // Real-time partial speech-to-text — update or add a partial candidate entry
          setTranscript(prev => {
            const withoutPartial = prev.filter(e => !(e.isPartial && e.role === 'candidate'));
            if (!data.text?.trim()) return withoutPartial;
            return [...withoutPartial, {
              id: 'partial-candidate',
              role: 'candidate',
              text: data.text,
              timestamp: new Date().toISOString(),
              isPartial: true,
            }];
          });
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
  }, [clearAnswerTimer, finalizeInterview, handleSaveAndNext, playAudioChunk, startAnswerTimer]);

  const handleStartInterview = useCallback(async () => {
    if (isSessionLoading || isInterviewActive) return;
    setError(null);
    setInfoMessage(null);
    setIsSessionLoading(true);
    setTranscript([]);
    setFinalReport(null);
    setCurrentQuestion(0);
    setIsAnswering(false);
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
      await startMicCapture();
      setInfoMessage('Microphone active. The interviewer will begin shortly.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to start voice interview.');
      resetSessionState();
    } finally {
      setIsSessionLoading(false);
    }
  }, [closeWebSocket, handleWebSocketMessage, isInterviewActive, isSessionLoading, params.applicationId, resetSessionState, startMicCapture]);

  const handleSendManualInput = useCallback(() => {
    if (!manualInput.trim()) return;
    const ws = websocketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'candidate_turn', text: manualInput.trim(), is_final: true, source: 'manual' }));
    setTranscript(prev => [...prev, { id: `candidate-${Date.now()}`, role: 'candidate', text: manualInput.trim(), timestamp: new Date().toISOString() }]);
    setManualInput('');
  }, [manualInput]);

  const jobTitle = useMemo(() => application?.jobs?.title || application?.job?.title || 'Voice Interview', [application]);

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

      {/* Question progress bar */}
      {isInterviewActive && currentQuestion > 0 && (
        <div className="flex items-center gap-3">
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`h-2 flex-1 rounded-full transition-all ${
                i + 1 < currentQuestion ? 'bg-green-500' :
                i + 1 === currentQuestion ? 'bg-blue-500' :
                'bg-gray-200'
              }`} />
              <span className={`text-xs font-medium ${i + 1 === currentQuestion ? 'text-blue-600' : 'text-gray-400'}`}>
                Q{i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Transcript panel */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conversation</CardTitle>
              <p className="text-sm text-muted-foreground">Speak naturally — your speech appears in real-time below.</p>
            </div>
            <div className="flex items-center gap-2">
              {isMicActive && (
                <Badge variant="default" className="flex items-center gap-1 bg-red-500 text-white animate-pulse">
                  <Mic className="h-3 w-3" /> Live
                </Badge>
              )}
              {isAnswering && (
                <Badge variant="default" className="flex items-center gap-1 bg-amber-500 text-white">
                  Your turn
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
                    className={`rounded-md p-3 shadow-sm transition-all ${
                      item.role === 'assistant'
                        ? 'bg-background border border-border'
                        : item.isPartial
                          ? 'bg-blue-50 ml-8 border border-blue-200 opacity-80'
                          : 'bg-primary/10 ml-8'
                    }`}
                  >
                    <p className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      {item.role === 'assistant' ? 'AI Interviewer' : 'You'}
                      {item.isPartial && (
                        <span className="inline-flex gap-0.5">
                          <span className="animate-bounce h-1 w-1 rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
                          <span className="animate-bounce h-1 w-1 rounded-full bg-blue-400" style={{ animationDelay: '150ms' }} />
                          <span className="animate-bounce h-1 w-1 rounded-full bg-blue-400" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
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
                Type your answer <span className="text-xs">(if microphone is unavailable)</span>
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

            {/* Save & move to next question — only shown when in answering window */}
            {isInterviewActive && isAnswering && (
              <Button variant="secondary" onClick={handleSaveAndNext} className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300">
                <ArrowRight className="mr-2 h-4 w-4" />
                Save &amp; Next Question
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

        {/* Status sidebar */}
        <Card className="lg:col-span-4">
          <CardHeader><CardTitle>Interview Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>Role:</strong> {jobTitle}</p>
              <p><strong>Status:</strong> {isInterviewActive ? 'In progress' : finalReport ? 'Completed' : 'Not started'}</p>
              {currentQuestion > 0 && (
                <p><strong>Question:</strong> {currentQuestion} of {TOTAL_QUESTIONS}</p>
              )}
              {isMicActive && (
                <p className="flex items-center gap-1 text-green-600">
                  <Mic className="h-3 w-3" /> Microphone active
                </p>
              )}
              {isAnswering && (
                <p className="flex items-center gap-1 text-amber-600 font-medium">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Listening for your answer...
                </p>
              )}
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">How it works</p>
              <ul className="list-outside list-disc space-y-1 pl-4">
                <li>Allow microphone access when prompted.</li>
                <li>Wait for the AI to finish the question — the timer starts automatically.</li>
                <li>You have <strong>3 minutes</strong> per answer.</li>
                <li>Click <strong>Save &amp; Next Question</strong> anytime to move on early.</li>
                <li>Your speech appears in real-time as you speak.</li>
              </ul>
            </div>

            {/* Answer countdown timer */}
            {answerTimerSecs !== null && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Answer Timer</p>
                <div className="relative flex h-24 w-24 items-center justify-center">
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
                  <span className={`text-xl font-bold tabular-nums ${answerTimerSecs <= 30 ? 'text-red-600' : 'text-amber-800'}`}>
                    {String(Math.floor(answerTimerSecs / 60)).padStart(2, '0')}:{String(answerTimerSecs % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-amber-600 text-center">
                  {answerTimerSecs <= 30 ? '⚠️ Wrapping up soon...' : 'Time remaining to answer'}
                </p>
                <Button size="sm" variant="outline" onClick={handleSaveAndNext} className="w-full text-green-700 border-green-400 hover:bg-green-50">
                  <ArrowRight className="mr-1 h-3 w-3" /> Save &amp; Next Question
                </Button>
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
