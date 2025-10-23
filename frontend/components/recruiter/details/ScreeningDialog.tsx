'use client';

import { useState } from 'react';
import { api, ScreeningResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '../ui/badge';
import { ThumbsUp, ThumbsDown, BrainCircuit } from 'lucide-react';

interface ScreeningDialogProps {
  applicationId: string;
}

export function ScreeningDialog({ applicationId }: ScreeningDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreeningResponse | null>(null);

  const handleStartScreening = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.startScreening({ application_id: applicationId, mode: 'text' });
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to start screening.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const { evaluation, transcript } = result;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-lg mb-2">Screening Evaluation</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Communication</p>
                        <p className="font-bold text-2xl">{Math.round(evaluation.communication_score)}%</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Domain Knowledge</p>
                        <p className="font-bold text-2xl">{Math.round(evaluation.domain_knowledge_score)}%</p>
                    </div>
                    <div className="p-4 bg-primary text-primary-foreground rounded-lg">
                        <p className="text-sm">Overall Score</p>
                        <p className="font-bold text-2xl">{Math.round(evaluation.overall_score)}%</p>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-semibold">AI Summary</h4>
                <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
            </div>

            <div className='flex gap-4'>
                <div>
                    <h4 className="font-semibold flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-500" /> Strengths</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {evaluation.strengths.map((s, i) => <Badge key={i} variant="success">{s}</Badge>)}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" /> Weaknesses</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {evaluation.weaknesses.map((w, i) => <Badge key={i} variant="destructive">{w}</Badge>)}
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-semibold">Transcript</h4>
                <div className="mt-2 p-4 bg-secondary rounded-lg text-sm max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{transcript}</pre>
                </div>
            </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
            <BrainCircuit className="mr-2 h-4 w-4" /> Start AI Screening
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Conversational AI Screening</DialogTitle>
          <DialogDescription>
            The AI will ask the candidate 3 adaptive questions and generate an evaluation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
            {!result && !isLoading && (
                 <div className="text-center">
                    <p>Ready to start the simulated screening?</p>
                 </div>
            )}
            {isLoading && <div className="text-center">Screening in progress...</div>}
            {error && <div className="text-center text-red-500">{error}</div>}
            {result && renderResult()}
        </div>

        <DialogFooter>
          {!result && (
            <Button onClick={handleStartScreening} disabled={isLoading}>
              {isLoading ? 'Running...' : 'Begin Simulation'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
