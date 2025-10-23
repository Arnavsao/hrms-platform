'use client';

import { JobsTab } from '@/components/recruiter/JobsTab';
import { CandidatesTab } from '@/components/recruiter/CandidatesTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RecruiterDashboardPage() {
  
  return (
    <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Recruiter Dashboard</h1>
        <Tabs defaultValue="candidates">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candidates">Candidates</TabsTrigger>
                <TabsTrigger value="jobs">Manage Jobs</TabsTrigger>
            </TabsList>
            <TabsContent value="candidates">
                <CandidatesTab />
            </TabsContent>
            <TabsContent value="jobs">
                <JobsTab />
            </TabsContent>
        </Tabs>
    </div>
  );
}

