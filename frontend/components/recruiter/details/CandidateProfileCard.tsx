import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, Mail, Phone, Link as LinkIcon, ExternalLink } from "lucide-react";

// TODO: Replace 'any' with a proper Candidate model once the API provides it
interface CandidateProfileCardProps {
  candidate: any;
}

export function CandidateProfileCard({ candidate }: CandidateProfileCardProps) {
  if (!candidate) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Candidate Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Candidate data is not available yet. The API needs to be updated to join this information.</p>
            </CardContent>
        </Card>
    );
  }

  const parsedData = candidate.parsed_data || {};
  const experience = parsedData.experience || [];
  const education = parsedData.education || [];
  const skills = parsedData.skills || [];
  const phone = parsedData.phone;
  const links = parsedData.links || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarImage src={candidate.avatar_url} alt={candidate.name} />
                <AvatarFallback>{candidate.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <CardTitle className="text-2xl">{candidate.name}</CardTitle>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {candidate.email}
                  </div>
                  {phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {phone}
                    </div>
                  )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skills */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Badge variant="outline">Skills</Badge>
          </h3>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, index: number) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills listed</p>
          )}
        </div>

        {/* Experience */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Work Experience
          </h3>
          {experience.length > 0 ? (
            <div className="space-y-4">
              {experience.map((exp: any, index: number) => (
                <div key={index} className="border-l-2 border-primary pl-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{exp.position || 'Position'}</h4>
                      <p className="text-sm text-muted-foreground">{exp.company || 'Company'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {exp.duration || 'Duration'}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-sm mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No experience listed</p>
          )}
        </div>

        {/* Education */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Education
          </h3>
          {education.length > 0 ? (
            <div className="space-y-3">
              {education.map((edu: any, index: number) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{edu.degree || 'Degree'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {edu.field || 'Field of Study'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {edu.institution || 'Institution'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {edu.year || 'Year'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No education listed</p>
          )}
        </div>

        {/* Professional Links */}
        {(links.github || links.linkedin || links.portfolio) && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Professional Links
            </h3>
            <div className="space-y-2">
              {links.github && (
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  GitHub Profile
                </a>
              )}
              {links.linkedin && (
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn Profile
                </a>
              )}
              {links.portfolio && (
                <a
                  href={links.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Portfolio Website
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
