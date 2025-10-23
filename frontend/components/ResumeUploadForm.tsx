'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ParseResumeResponse } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const formSchema = z.object({
  resume: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}.`)
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), 'Only .pdf, .doc, and .docx formats are supported.'),
});

export function ResumeUploadForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResumeResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      if (fileRejections.length > 0) {
        setError(fileRejections[0].errors[0].message);
        setUploadedFile(null);
        form.reset();
        return;
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setUploadedFile(file);
        form.setValue('resume', file);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.parseResume(values.resume);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setResult(null);
    form.reset();
  };
  
  if (result) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Parsing Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Candidate Info</h3>
              <p>Name: {result.parsed_data.name}</p>
              <p>Email: {result.parsed_data.email}</p>
            </div>
            <div>
              <h3 className="font-semibold">Skills</h3>
              <p className="text-muted-foreground">{result.parsed_data.skills.join(', ')}</p>
            </div>
            <Button onClick={() => { setResult(null); handleRemoveFile(); }}>Parse Another Resume</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <p className="mt-4 text-center text-muted-foreground">
                {isDragActive ? 'Drop the resume here...' : "Drag 'n' drop a resume here, or click to select a file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (up to 10MB)</p>
            </div>
            
            {uploadedFile && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className='flex items-center gap-2'>
                  <FileIcon className="w-6 h-6" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {form.formState.errors.resume && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.resume.message as string}</p>
            )}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <Button type="submit" className="w-full" disabled={isLoading || !uploadedFile}>
              {isLoading ? 'Parsing...' : 'Parse Resume'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
