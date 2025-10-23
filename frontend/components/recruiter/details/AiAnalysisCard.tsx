import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AiAnalysisCardProps {
  fit_score: number;
  highlights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export function AiAnalysisCard({ fit_score, highlights }: AiAnalysisCardProps) {
  
  const getScoreColor = (score: number) => {
    if (score > 85) return "bg-green-500";
    if (score > 70) return "bg-blue-500";
    if (score > 50) return "bg-yellow-500";
    return "bg-red-500";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Overall Fit Score</h3>
            <span className="font-bold text-2xl">{Math.round(fit_score)}%</span>
          </div>
          <Progress value={fit_score} className="w-full" indicatorClassName={getScoreColor(fit_score)} />
        </div>

        <div>
          <h3 className="font-semibold mb-3">Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {highlights.strengths.map((strength, index) => (
              <Badge key={index} variant="success">{strength}</Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Weaknesses</h3>
          <div className="flex flex-wrap gap-2">
            {highlights.weaknesses.map((weakness, index) => (
              <Badge key={index} variant="destructive">{weakness}</Badge>
            ))}
          </div>
        </div>
        
        <div>
            <h3 className="font-semibold mb-3">AI Recommendations</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {highlights.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                ))}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}
