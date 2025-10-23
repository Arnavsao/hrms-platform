import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Linkedin, Globe } from "lucide-react";
import Link from "next/link";

// TODO: Replace 'any' with a proper DigitalFootprint model
interface DigitalFootprintCardProps {
  digital_footprint: any;
}

export function DigitalFootprintCard({ digital_footprint }: DigitalFootprintCardProps) {
    if (!digital_footprint) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Digital Footprint</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No digital footprint data available for this candidate.</p>
                </CardContent>
            </Card>
        );
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital Footprint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {digital_footprint.github_data && (
            <div className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                <Link href={digital_footprint.github_data.url} target="_blank" className="text-blue-500 hover:underline">
                    View GitHub Profile
                </Link>
                {/* TODO: Display more detailed GitHub stats */}
            </div>
        )}
        {digital_footprint.linkedin_data && (
            <div className="flex items-center gap-2">
                <Linkedin className="h-5 w-5" />
                <Link href={digital_footprint.linkedin_data.url} target="_blank" className="text-blue-500 hover:underline">
                    View LinkedIn Profile
                </Link>
            </div>
        )}
        {digital_footprint.portfolio_data && (
            <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <Link href={digital_footprint.portfolio_data.url} target="_blank" className="text-blue-500 hover:underline">
                    View Portfolio
                </Link>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
