'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { AiAnalysisCard } from '@/components/recruiter/details/AiAnalysisCard';
import { CandidateProfileCard } from '@/components/recruiter/details/CandidateProfileCard';
import { DigitalFootprintCard } from '@/components/recruiter/details/DigitalFootprintCard';
import { ScreeningDialog } from '@/components/recruiter/details/ScreeningDialog';
import { VoiceInterviewHistory } from '@/components/recruiter/details/VoiceInterviewHistory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface ApplicationDetails {
  id: string;
  candidate_id: string;
  job_id: string;
  fit_score: number;
  highlights: any;
  interview_allowed: boolean;
  candidate: any;
  job: any;
  digital_footprint?: any;
}

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);

  useEffect(() => {
    async function fetchApplicationDetails() {
      try {
        const data = await api.getApplication(params.id);
        setApplication(data);
      } catch (error) {
        console.error('Failed to fetch application details', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplicationDetails();
  }, [params.id]);

  const handleToggleInterviewPermission = async () => {
    if (!application) return;
    setPermissionLoading(true);
    try {
      const newAllowed = !application.interview_allowed;
      await api.setInterviewPermission(application.id, newAllowed);
      setApplication({ ...application, interview_allowed: newAllowed });
    } catch (error) {
      console.error('Failed to update interview permission', error);
      alert('Failed to update interview permission. Please try again.');
    } finally {
      setPermissionLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading application details...</div>;
  }

  if (!application) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Candidate Application</h1>
                <p className="text-gray-600 text-lg">Review the candidate&apos;s profile and AI analysis.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Interview Permission Toggle */}
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    {application.interview_allowed ? (
                      <Mic className="h-4 w-4 text-green-600" />
                    ) : (
                      <MicOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700">Voice Interview</span>
                    <Badge variant={application.interview_allowed ? 'default' : 'secondary'}>
                      {application.interview_allowed ? 'Allowed' : 'Locked'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={application.interview_allowed ? 'destructive' : 'default'}
                    onClick={handleToggleInterviewPermission}
                    disabled={permissionLoading}
                    className="ml-2"
                  >
                    {permissionLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : application.interview_allowed ? (
                      'Revoke'
                    ) : (
                      'Allow'
                    )}
                  </Button>
                </div>
                <ScreeningDialog applicationId={application.id} />
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <CandidateProfileCard candidate={application.candidate} />
              <DigitalFootprintCard digital_footprint={application.digital_footprint} />
            </div>
            <div className="space-y-8">
              <AiAnalysisCard
                fit_score={application.fit_score}
                highlights={application.highlights}
              />
              <VoiceInterviewHistory applicationId={application.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
