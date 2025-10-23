export default function AdminDashboard() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* System statistics will be implemented here */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Candidates</h3>
            <p className="text-3xl font-bold text-primary">--</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Average Fit Score</h3>
            <p className="text-3xl font-bold text-primary">--</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Active Jobs</h3>
            <p className="text-3xl font-bold text-primary">--</p>
          </div>
        </div>
      </div>
    </div>
  );
}

