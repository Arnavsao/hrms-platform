'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { EmptyState } from './EmptyState';

interface Application {
    id: string;
    candidate_id: string;
    job_id: string;
    fit_score: number;
    // We'll need to join tables to get these names
    candidate_name?: string;
    job_title?: string;
    created_at: string;
}

interface CandidatesTabProps {
    jobId: string | null;
}

export function CandidatesTab({ jobId }: CandidatesTabProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchApplications() {
      setIsLoading(true);
      try {
        const data = await api.listApplications(jobId);
        setApplications(data);

        if (jobId) {
            const jobData = await api.getJob(jobId);
            setJobTitle(jobData.title);
        } else {
            setJobTitle(null);
        }

      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, [jobId]);

  const getScoreBadgeVariant = (score: number) => {
    if (score > 85) return "success";
    if (score > 70) return "default";
    if (score > 50) return "secondary";
    return "destructive";
  }

  if (isLoading) {
    return <div className='p-4 text-center text-muted-foreground'>Loading candidates...</div>;
  }

  return (
    <div className="space-y-4">
      {applications.length === 0 ? (
         <EmptyState 
            title={jobId ? "No Applications Yet" : "No Applications Found"}
            description={jobId ? "No candidates have applied to this job posting yet." : "There are currently no applications to display."}
            buttonText="View All Jobs"
            onButtonClick={() => router.push('/recruiter')}
        />
      ) : (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead className="text-center">Fit Score</TableHead>
                <TableHead>Applied At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {applications.map((app) => (
                <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.candidate_id}</TableCell> {/* Placeholder */}
                    <TableCell>{app.job_id}</TableCell> {/* Placeholder */}
                    <TableCell className="text-center">
                        <Badge variant={getScoreBadgeVariant(app.fit_score)}>
                            {Math.round(app.fit_score)}%
                        </Badge>
                    </TableCell>
                    <TableCell>{formatDate(app.created_at)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/recruiter/applications/${app.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </Button>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
