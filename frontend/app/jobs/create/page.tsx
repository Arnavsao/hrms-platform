'use client';

import { JobForm } from "@/components/JobForm";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CreateJobPage() {
    const router = useRouter();

    const handleCreateJob = async (values: any) => {
        await api.createJob(values);
        router.push('/recruiter'); // Redirect to recruiter dashboard after creation
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
            <JobForm onSubmit={handleCreateJob} />
        </div>
    );
}
