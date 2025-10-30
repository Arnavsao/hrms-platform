"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        const data = await api.getJob(params.id);
        setJob(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Job not found");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12">
        <p className="text-gray-500">Loading job...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-6 py-12">
        <Card>
          <CardContent className="p-8">
            <p className="text-red-600">{error || "Job not found"}</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/jobs")}>Back to jobs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <Button onClick={() => router.push(`/jobs/${params.id}/apply`)}>Apply</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-800">{job.description || "No description provided."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(job.requirements) ? (
                <ul className="list-disc list-inside text-gray-800 space-y-1">
                  {job.requirements.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-800">{job.requirements || "Not specified."}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/jobs")}>Back</Button>
            <Button onClick={() => router.push(`/jobs/${params.id}/apply`)}>Apply Now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}


