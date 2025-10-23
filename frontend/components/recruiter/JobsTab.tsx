'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Job } from '@/models/job';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PlusCircle, FileText, Trash2, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { EmptyState } from './EmptyState';

export function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await api.listJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchJobs();
  }, []);
  
  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
        try {
            await api.deleteJob(jobId);
            setJobs(jobs.filter(job => job.id !== jobId));
        } catch (error) {
            console.error("Failed to delete job", error);
        }
    }
  }

  if (isLoading) {
    return <div className='p-4 text-center text-muted-foreground'>Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => router.push('/jobs/create')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Job
            </Button>
        </div>
      
      {jobs.length === 0 ? (
        <EmptyState 
            title="No Jobs Posted Yet"
            description="Get started by creating your first job posting."
            buttonText="Create Job"
            onButtonClick={() => router.push('/jobs/create')}
        />
      ) : (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {jobs.map((job) => (
                <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.status || 'Active'}</TableCell>
                    <TableCell>{formatDate(job.created_at)}</TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/jobs/edit/${job.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/recruiter?jobId=${job.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>View Applications</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteJob(job.id)} className="text-red-500 focus:text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
