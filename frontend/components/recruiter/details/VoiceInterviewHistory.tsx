'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mic, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VoiceScreeningRecord {
  id: string;
  transcript: string;
  ai_summary: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
  };
  communication_score?: number;
  domain_knowledge_score?: number;
  overall_score?: number;
  duration_seconds?: number;
  created_at: string;
}

interface VoiceInterviewHistoryProps {
  applicationId: string;
}

export function VoiceInterviewHistory({ applicationId }: VoiceInterviewHistoryProps) {
  const [sessions, setSessions] = useState<VoiceScreeningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listScreeningsForApplication(applicationId);
      const voiceSessions = (data || [])
        .filter((item: any) => item.mode === 'voice')
        .map((item: any) => ({
          id: item.id,
          transcript: item.transcript || '',
          ai_summary: item.ai_summary || {},
          communication_score: item.communication_score ?? item.ai_summary?.communication_score,
          domain_knowledge_score: item.domain_knowledge_score ?? item.ai_summary?.domain_knowledge_score,
          overall_score: item.overall_score ?? item.ai_summary?.overall_score,
          duration_seconds: item.duration_seconds ?? item.session_metadata?.duration_seconds,
          created_at: item.created_at,
        }));
      setSessions(voiceSessions);
    } catch (err: any) {
      console.error('Failed to load voice interviews', err);
      setError(err?.response?.data?.detail || 'Unable to load voice interview transcripts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const hasSessions = useMemo(() => sessions.length > 0, [sessions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" /> Voice Interview History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading interview transcripts...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" /> Voice Interview History
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadSessions}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="h-4 w-4" /> Voice Interview History
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadSessions}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSessions && (
          <Alert>
            <AlertDescription>
              No voice interviews recorded yet for this application. Encourage the candidate to complete a session.
            </AlertDescription>
          </Alert>
        )}

        {sessions.map((session) => (
          <div key={session.id} className="rounded-md border bg-muted/40 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Interview conducted {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</p>
                <p className="text-xs text-muted-foreground">Session ID: {session.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {typeof session.duration_seconds === 'number' && (
                  <Badge variant="secondary">Duration: {Math.max(1, Math.round(session.duration_seconds))}s</Badge>
                )}
                {typeof session.overall_score === 'number' && (
                  <Badge variant="outline">Overall {Math.round(session.overall_score)}%</Badge>
                )}
                {typeof session.communication_score === 'number' && (
                  <Badge variant="outline">Communication {Math.round(session.communication_score)}%</Badge>
                )}
                {typeof session.domain_knowledge_score === 'number' && (
                  <Badge variant="outline">Domain {Math.round(session.domain_knowledge_score)}%</Badge>
                )}
              </div>
            </div>

            {session.ai_summary?.summary && (
              <div className="mt-3 text-sm">
                <p className="font-medium">AI Summary</p>
                <p className="text-muted-foreground">{session.ai_summary.summary}</p>
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium">Transcript</p>
              <div className="max-h-52 overflow-y-auto rounded-md bg-background p-3 shadow-inner">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{session.transcript}</pre>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
