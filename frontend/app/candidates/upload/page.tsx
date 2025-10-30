'use client';

import { ResumeUploadForm } from "@/components/ResumeUploadForm";

export default function ResumeUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Upload Your Resume</h1>
            <p className="text-gray-600 text-lg">Upload your resume to get started with job applications</p>
          </div>

          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <ResumeUploadForm />
          </div>
        </div>
      </div>
    </div>
  );
}

