import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description: string;
    buttonText: string;
    onButtonClick: () => void;
}

export function EmptyState({ title, description, buttonText, onButtonClick }: EmptyStateProps) {
    return (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="text-muted-foreground mt-2 mb-4">{description}</p>
            <Button onClick={onButtonClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {buttonText}
            </Button>
        </div>
    )
}
