'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Calendar,
} from 'lucide-react';
import { CandidateProfileCard } from '@/components/recruiter/details/CandidateProfileCard';
import { DigitalFootprintCard } from '@/components/recruiter/details/DigitalFootprintCard';

interface CandidateDetailPageProps {
  params: {
    id: string;
  };
}

export default function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidateDetails();
  }, [params.id]);

  const fetchCandidateDetails = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCandidate(params.id);
      setCandidate(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load candidate details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error || 'Candidate not found'}</p>
            <Button onClick={fetchCandidateDetails} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidates
        </Button>
        {candidate.resume_url && (
          <Button
            variant="outline"
            onClick={() => window.open(candidate.resume_url, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Resume
          </Button>
        )}
      </div>

      {/* Candidate Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`}
                />
                <AvatarFallback>
                  {candidate.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl">{candidate.name}</CardTitle>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {candidate.email}
                  </div>
                  {candidate.parsed_data?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {candidate.parsed_data.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary">
                <Calendar className="h-3 w-3 mr-1" />
                Joined {new Date(candidate.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.parsed_data?.skills && candidate.parsed_data.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.parsed_data.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills listed</p>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.parsed_data?.experience && candidate.parsed_data.experience.length > 0 ? (
                <div className="space-y-6">
                  {candidate.parsed_data.experience.map((exp: any, index: number) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{exp.position || 'Position'}</h4>
                          <p className="text-muted-foreground">{exp.company || 'Company'}</p>
                        </div>
                        <Badge variant="outline">
                          {exp.duration || 'Duration'}
                        </Badge>
                      </div>
                      {exp.description && (
                        <p className="text-sm mt-2 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No experience listed</p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.parsed_data?.education && candidate.parsed_data.education.length > 0 ? (
                <div className="space-y-4">
                  {candidate.parsed_data.education.map((edu: any, index: number) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">{edu.degree || 'Degree'}</h4>
                          <p className="text-muted-foreground">{edu.field || 'Field of Study'}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {edu.institution || 'Institution'}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {edu.year || 'Year'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No education listed</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Professional Links */}
          {candidate.parsed_data?.links && (
            Object.keys(candidate.parsed_data.links).some(
              (key) => candidate.parsed_data.links[key]
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Professional Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidate.parsed_data.links.github && (
                    <a
                      href={candidate.parsed_data.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      GitHub Profile
                    </a>
                  )}
                  {candidate.parsed_data.links.linkedin && (
                    <a
                      href={candidate.parsed_data.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      LinkedIn Profile
                    </a>
                  )}
                  {candidate.parsed_data.links.portfolio && (
                    <a
                      href={candidate.parsed_data.links.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Portfolio Website
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {/* Digital Footprint */}
          {candidate.digital_footprints && candidate.digital_footprints.length > 0 && (
            <DigitalFootprintCard
              digitalFootprint={candidate.digital_footprints[0]}
            />
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skills</span>
                <span className="font-semibold">
                  {candidate.parsed_data?.skills?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Experience</span>
                <span className="font-semibold">
                  {candidate.parsed_data?.experience?.length || 0} roles
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Education</span>
                <span className="font-semibold">
                  {candidate.parsed_data?.education?.length || 0} degrees
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Updated</span>
                <span className="font-semibold text-sm">
                  {new Date(candidate.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
