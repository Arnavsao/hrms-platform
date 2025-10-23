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
import { MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Badge } from '../ui/badge';

// This is a temporary interface. We'll replace it with a proper model.
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
        // Fetch applications, optionally filtered by jobId
        const data = await api.listApplications(jobId);
        setApplications(data);

        // If filtering by a job, fetch its details to display the title
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
    return <div className='p-4'>Loading candidates...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">
            {jobTitle ? `Applications for ${jobTitle}` : 'All Candidate Applications'}
        </h2>
      </div>
      
      {applications.length === 0 ? (
        <p>{jobId ? 'No one has applied to this job yet.' : 'No candidates have applied yet.'}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Fit Score</TableHead>
              <TableHead>Applied At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.candidate_id}</TableCell> {/* Placeholder */}
                <TableCell>{app.job_id}</TableCell> {/* Placeholder */}
                <TableCell>
                    <Badge variant={getScoreBadgeVariant(app.fit_score)}>
                        {Math.round(app.fit_score)}%
                    </Badge>
                </TableCell>
                <TableCell>{formatDate(app.created_at)}</TableCell>
                <TableCell>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/recruiter/applications/${app.id}`)}>
                        View Details
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
