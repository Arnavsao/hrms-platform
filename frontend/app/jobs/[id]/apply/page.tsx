"use client";

import { useEffect, useState } from 'react';
import { api, MatchCandidateResponse } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function JobApplicationPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { session } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [email, setEmail] = useState<string>(session?.user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MatchCandidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");

  useEffect(() => {
    async function loadJob() {
      try {
        const j = await api.getJob(params.id);
        setJob(j);
      } catch (e) {
        // Non-fatal for form
        console.error('Failed to fetch job', e);
      }
    }
    loadJob();
  }, [params.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      // Try to resolve candidate by email for better UX
      let candidateId: string | undefined = undefined;
      if (email) {
        try {
          const candidate = await api.getCandidateByEmail(email);
          candidateId = candidate?.id;
        } catch (_) {
          // Will fallback to email-based matching
        }
      }

      // If no candidate found, attempt to create via resume parse
      if (!candidateId) {
        if (!resume) {
          setError('Candidate profile not found. Please upload your resume to create your profile.');
          setSubmitting(false);
          return;
        }
        try {
          const parsed = await api.parseResume(resume);
          candidateId = parsed.candidate_id;
          // If the user typed a different email, keep it; otherwise, adopt parsed email
          if (!email && parsed?.parsed_data?.email) {
            setEmail(parsed.parsed_data.email);
          }
        } catch (parseErr: any) {
          setError(parseErr?.response?.data?.detail || 'Failed to parse resume');
          setSubmitting(false);
          return;
        }
      }

      const match = await api.matchCandidate({
        job_id: params.id,
        candidate_id: candidateId,
        candidate_email: candidateId ? undefined : email || undefined,
        cover_letter: coverLetter || undefined,
      });
      setResult(match);
    } catch (err: any) {
      console.error('Apply error', err);
      setError(err?.response?.data?.detail || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for {job?.title || 'Position'}</h1>
            <p className="text-gray-600">Submit your application to this job.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">We use your email to find your candidate profile.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume (PDF/DOC/DOCX)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setResume(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">If we can’t find your profile, we’ll use this to create one.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover letter (optional)</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={6}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly explain your interest and fit for the role"
                  />
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit application'}
                </Button>
              </form>

              {error && (
                <div className="mt-4 text-sm text-red-600">{error}</div>
              )}

              {result && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">AI Match Result</h3>
                  <div className="rounded-md border p-4 bg-gray-50">
                    <p className="mb-2"><span className="font-medium">Fit score:</span> {Math.round(result.fit_score)}%</p>
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">Strengths</p>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.highlights.strengths?.map((s, i) => (<li key={i}>{s}</li>))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Recommendations</p>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {result.highlights.recommendations?.map((s, i) => (<li key={i}>{s}</li>))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

