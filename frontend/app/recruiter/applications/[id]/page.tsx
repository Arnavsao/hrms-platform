'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { AiAnalysisCard } from '@/components/recruiter/details/AiAnalysisCard';
import { CandidateProfileCard } from '@/components/recruiter/details/CandidateProfileCard';
import { DigitalFootprintCard } from '@/components/recruiter/details/DigitalFootprintCard';
import { ScreeningDialog } from '@/components/recruiter/details/ScreeningDialog';
import { VoiceInterviewHistory } from '@/components/recruiter/details/VoiceInterviewHistory';

// Temporary interfaces - will be replaced with models
interface ApplicationDetails {
    id: string;
    candidate_id: string;
    job_id: string;
    fit_score: number;
    highlights: any;
    candidate: any; // Joined data
    job: any; // Joined data
    digital_footprint?: any; // Joined data
}


export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
    const [application, setApplication] = useState<ApplicationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchApplicationDetails() {
            try {
                // TODO: The API needs to be updated to return joined data 
                // for candidate and job details along with the application.
                const data = await api.getApplication(params.id);
                setApplication(data);
            } catch (error) {
                console.error("Failed to fetch application details", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchApplicationDetails();
    }, [params.id]);

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
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-3">Candidate Application</h1>
                                <p className="text-gray-600 text-lg">Review the candidate&apos;s profile and AI analysis.</p>
                            </div>
                            <ScreeningDialog applicationId={application.id} />
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
