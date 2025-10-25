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
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Job</h1>
                    <p className="text-gray-600">Update the job details below</p>
                </div>
                <JobForm initialData={job} onSubmit={handleUpdateJob} />
            </div>
        </div>
    );
}
