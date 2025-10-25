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
        <div className="h-full bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
                <div className="space-y-6 h-full overflow-y-auto">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Job</h1>
                                <p className="text-gray-600 text-lg">Fill out the form below to post a new job opening</p>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Draft mode</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Job Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <JobForm onSubmit={handleCreateJob} />
                    </div>
                </div>
            </div>
        </div>
    );
}
