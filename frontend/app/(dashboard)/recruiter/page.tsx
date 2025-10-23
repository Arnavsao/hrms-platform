'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { JobsTab } from '@/components/recruiter/JobsTab';
import { CandidatesTab } from '@/components/recruiter/CandidatesTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Users } from 'lucide-react';


function RecruiterDashboard() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');

  const initialTab = jobId ? "candidates" : "jobs";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (jobId) {
      setActiveTab("candidates");
    }
  }, [jobId]);

  return (
    <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Recruiter Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage your job postings and review candidates.</p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-lg">
                <TabsTrigger value="candidates">
                    <Users className="mr-2 h-4 w-4" />
                    Candidates
                </TabsTrigger>
                <TabsTrigger value="jobs">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Manage Jobs
                </TabsTrigger>
            </TabsList>
            <TabsContent value="candidates">
                <Card>
                    <CardHeader>
                        <CardTitle>Candidate Applications</CardTitle>
                        <CardDescription>Review and manage applications for your job postings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CandidatesTab jobId={jobId} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="jobs">
                <Card>
                    <CardHeader>
                        <CardTitle>Job Postings</CardTitle>
                        <CardDescription>Create, edit, and manage your company's job openings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <JobsTab />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

export default function RecruiterDashboardPage() {
    return (
        <Suspense fallback={<div className='p-8'>Loading...</div>}>
            <RecruiterDashboard />
        </Suspense>
    )
}

