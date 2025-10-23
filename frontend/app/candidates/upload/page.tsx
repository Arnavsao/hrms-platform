'use client';

import { ResumeUploadForm } from "@/components/ResumeUploadForm";

export default function ResumeUploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Upload Your Resume</h1>
        <ResumeUploadForm />
      </div>
    </div>
  );
}

