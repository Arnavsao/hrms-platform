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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThumbsUp, ThumbsDown, BrainCircuit, Loader2, AlertCircle } from 'lucide-react';

interface ScreeningDialogProps {
  applicationId: string;
}

export function ScreeningDialog({ applicationId }: ScreeningDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreeningResponse | null>(null);

  const handleStartScreening = async () => {
    if (!applicationId) {
      setError('Invalid application ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Starting screening for application:', applicationId);
      const response = await api.startScreening({
        application_id: applicationId,
        mode: 'text'
      });
      console.log('Screening response:', response);
      setResult(response);
    } catch (err: any) {
      console.error('Screening error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start screening. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state when closing
    setTimeout(() => {
      setResult(null);
      setError(null);
      setIsLoading(false);
    }, 300);
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <BrainCircuit className="mr-2 h-4 w-4" /> Start AI Screening
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conversational AI Screening</DialogTitle>
          <DialogDescription>
            The AI will conduct a simulated screening interview and generate an evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!result && !isLoading && !error && (
            <div className="text-center py-6">
              <BrainCircuit className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Ready to start the simulated screening interview?
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will generate AI-based questions and simulate candidate responses.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Conducting AI screening...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a few moments
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && renderResult()}
        </div>

        <DialogFooter className="flex gap-2">
          {!result && !isLoading && (
            <Button onClick={handleStartScreening} disabled={isLoading}>
              <BrainCircuit className="mr-2 h-4 w-4" />
              Begin Screening
            </Button>
          )}
          {error && (
            <Button onClick={handleStartScreening} disabled={isLoading} variant="outline">
              <BrainCircuit className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
