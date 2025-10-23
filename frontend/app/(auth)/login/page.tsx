export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to HRMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Recruitment Intelligence
          </p>
        </div>
        {/* Auth form will be implemented here */}
        <div className="mt-8 space-y-6">
          <p className="text-center text-sm text-gray-500">
            Authentication interface - To be implemented
          </p>
        </div>
      </div>
    </div>
  );
}

