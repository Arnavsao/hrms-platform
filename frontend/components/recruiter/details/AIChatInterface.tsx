'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Mic, 
  MicOff, 
  Volume2,
  CheckCircle2 
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  applicationId: string;
  onComplete?: (transcript: string, evaluation: any) => void;
}

export function AIChatInterface({ applicationId, onComplete }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        console.error('Speech recognition error');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isCompleted) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In production, this would make an actual API call
      // For now, simulate AI response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check if we should show completion
      if (messages.length >= 5) {
        handleComplete();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleted(true);
    setIsLoading(true);

    try {
      // Call the screening API to generate evaluation
      // const response = await api.startScreening({
      //   application_id: applicationId,
      //   mode: mode
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const transcript = messages
        .map((msg) => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
        .join('\n');

      const evaluation = {
        communication_score: 85,
        domain_knowledge_score: 90,
        overall_score: 87,
        summary: 'Excellent candidate with strong communication and technical skills.',
      };

      if (onComplete) {
        onComplete(transcript, evaluation);
      }
    } catch (error) {
      console.error('Error completing screening:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const getAIResponse = (userInput: string): string => {
    const responses = [
      "That's a great answer. Can you tell me more about your experience with scalable systems?",
      "Interesting perspective. How do you handle tight deadlines and pressure?",
      "Thank you for sharing. Can you describe a time when you had to learn a new technology quickly?",
      "That demonstrates strong problem-solving skills. What's your approach to code reviews?",
      "Excellent. How do you stay updated with industry trends?",
    ];
    return responses[messages.length % responses.length];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Screening Interview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={isListening ? 'destructive' : 'outline'}
              size="sm"
              onClick={toggleVoice}
              disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Badge variant={mode === 'text' ? 'default' : 'secondary'}>
              {mode === 'text' ? 'Text' : 'Voice'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="h-96 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">Start your AI screening interview</p>
              <p className="text-sm">The AI will ask you questions about your experience and skills</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-12'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Screening Complete</p>
                <p className="text-sm text-green-700">
                  Your interview responses are being evaluated by AI. Please wait...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!isCompleted && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer..."
              disabled={isLoading || isCompleted}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isCompleted}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

