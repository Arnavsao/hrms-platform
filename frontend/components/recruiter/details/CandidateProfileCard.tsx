import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarImage src={candidate.avatar_url} alt={candidate.name} />
                <AvatarFallback>{candidate.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-2xl">{candidate.name}</CardTitle>
                <p className="text-muted-foreground">{candidate.email}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <h3 className="font-semibold">Skills</h3>
            <p className="text-muted-foreground">{candidate.parsed_data?.skills?.join(', ') || 'Not available'}</p>
        </div>
        <div>
            <h3 className="font-semibold">Experience</h3>
            {/* TODO: Format and display experience entries */}
            <p className="text-muted-foreground">Experience details will be shown here.</p>
        </div>
        <div>
            <h3 className="font-semibold">Education</h3>
            {/* TODO: Format and display education entries */}
            <p className="text-muted-foreground">Education details will be shown here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
