'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { JobsTab } from '@/components/recruiter/JobsTab';
import { CandidatesTab } from '@/components/recruiter/CandidatesTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function RecruiterDashboard() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');

  // Determine the tab based on the URL param. Default to 'jobs'.
  const initialTab = jobId ? "candidates" : "jobs";
  const [activeTab, setActiveTab] = useState(initialTab);

  // This effect synchronizes the active tab with the URL search parameter.
  // If the user navigates to a URL with a `jobId`, it forces the tab to 'candidates'.
  useEffect(() => {
    if (jobId) {
      setActiveTab("candidates");
    } else {
      // If the user navigates back or removes the jobId, default to the jobs tab.
      // You can change this to 'candidates' if you prefer.
      setActiveTab("jobs");
    }
  }, [jobId]);

  return (
    <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Recruiter Dashboard</h1>
        {/* This is now a "controlled" component. Its value is controlled by our state. */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candidates">Candidates</TabsTrigger>
                <TabsTrigger value="jobs">Manage Jobs</TabsTrigger>
            </TabsList>
            <TabsContent value="candidates">
                <CandidatesTab jobId={jobId} />
            </TabsContent>
            <TabsContent value="jobs">
                <JobsTab />
            </TabsContent>
        </Tabs>
    </div>
  );
}

export default function RecruiterDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RecruiterDashboard />
        </Suspense>
    )
}

