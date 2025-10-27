export default function JobApplicationPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Apply for Position</h1>
            <p className="text-gray-600 text-lg">Submit your application for this job opportunity</p>
          </div>

          {/* Application Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Job Title</h2>
              <p className="text-gray-600">Job ID: {params.id}</p>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Application form - To be implemented</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

