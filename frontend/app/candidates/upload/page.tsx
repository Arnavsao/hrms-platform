export default function ResumeUploadPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6">Upload Your Resume</h1>
        <div className="bg-white p-8 rounded-lg shadow">
          {/* Resume upload interface will be implemented here */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">
              Drag and drop your resume here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

