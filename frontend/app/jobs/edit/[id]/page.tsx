'use client';

import { useEffect, useState } from 'react';
import { JobForm } from "@/components/JobForm";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Job } from '@/models/job';

export default function EditJobPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [job, setJob] = useState<Job | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchJob() {
            try {
                const data = await api.getJob(params.id);
                setJob(data);
            } catch (error) {
                console.error("Failed to fetch job", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchJob();
    }, [params.id]);

    const handleUpdateJob = async (values: any) => {
        await api.updateJob(params.id, values);
        router.push('/recruiter'); // Redirect to recruiter dashboard after update
    };
    
    if (isLoading) {
        return <div>Loading job details...</div>;
    }
    
    if (!job) {
        return <div>Job not found.</div>
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
            <JobForm initialData={job} onSubmit={handleUpdateJob} />
        </div>
    );
}
