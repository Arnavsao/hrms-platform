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

export function CandidatesTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchApplications() {
      try {
        // TODO: The API should return joined data with candidate and job names
        const data = await api.listApplications();
        setApplications(data);
      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, []);

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
        <h2 className="text-2xl font-semibold">Candidate Applications</h2>
      </div>
      
      {applications.length === 0 ? (
        <p>No candidates have applied yet.</p>
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
