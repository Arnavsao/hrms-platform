import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin, Globe, ExternalLink, Calendar, Code, Star, GitBranch } from "lucide-react";
import Link from "next/link";

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
                    <p className="text-gray-500">No digital footprint data available for this candidate.</p>
                </CardContent>
            </Card>
        );
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" />
          Digital Footprint
        </CardTitle>
        <p className="text-sm text-gray-600">Online presence and activity</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GitHub */}
        {digital_footprint.github_data && digital_footprint.github_data.scraped && (
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Github className="h-5 w-5 text-gray-700" />
                        <span className="font-semibold text-gray-900">GitHub</span>
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                    </div>
                    {digital_footprint.github_data.url && (
                        <Link 
                            href={digital_footprint.github_data.url} 
                            target="_blank"
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Open
                        </Link>
                    )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-4">
                    {digital_footprint.github_data.contributions !== undefined && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Calendar className="h-4 w-4 text-green-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {digital_footprint.github_data.contributions}
                            </p>
                            <p className="text-xs text-gray-500">Contributions</p>
                        </div>
                    )}
                    {digital_footprint.github_data.repositories && digital_footprint.github_data.repositories.length > 0 && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Code className="h-4 w-4 text-blue-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {digital_footprint.github_data.repositories.length}
                            </p>
                            <p className="text-xs text-gray-500">Repositories</p>
                        </div>
                    )}
                    {digital_footprint.github_data.followers !== undefined && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {digital_footprint.github_data.followers}
                            </p>
                            <p className="text-xs text-gray-500">Followers</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* LinkedIn */}
        {digital_footprint.linkedin_data && digital_footprint.linkedin_data.url && (
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">LinkedIn</span>
                        {!digital_footprint.linkedin_data.scraped && (
                            <Badge variant="outline" className="text-xs">Limited Data</Badge>
                        )}
                    </div>
                    <Link 
                        href={digital_footprint.linkedin_data.url} 
                        target="_blank"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Open
                    </Link>
                </div>
                {digital_footprint.linkedin_data.scraped ? (
                    <p className="text-sm text-gray-600">
                        Profile data available and analyzed
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 italic">
                        LinkedIn data requires manual verification
                    </p>
                )}
            </div>
        )}

        {/* Portfolio */}
        {digital_footprint.portfolio_data && digital_footprint.portfolio_data.url && (
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-purple-500" />
                        <span className="font-semibold text-gray-900">Portfolio</span>
                        {digital_footprint.portfolio_data.scraped && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                    </div>
                    <Link 
                        href={digital_footprint.portfolio_data.url} 
                        target="_blank"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Open
                    </Link>
                </div>
                {digital_footprint.portfolio_data.title && (
                    <p className="text-sm font-medium text-gray-900 mb-1">
                        {digital_footprint.portfolio_data.title}
                    </p>
                )}
                {digital_footprint.portfolio_data.description && (
                    <p className="text-sm text-gray-600">
                        {digital_footprint.portfolio_data.description}
                    </p>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
