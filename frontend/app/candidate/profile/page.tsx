'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, ParseResumeResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  File as FileIcon,
  X,
  Plus,
  Trash2,
  Loader2,
  User,
  Mail,
  Phone,
  Award,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Save,
  FileText
} from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface Experience {
  company: string;
  position: string;
  duration: string;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

interface Links {
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
  experience: z.array(z.object({
    company: z.string().min(1, 'Company name is required'),
    position: z.string().min(1, 'Position is required'),
    duration: z.string().min(1, 'Duration is required'),
    description: z.string().optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string().min(1, 'Institution is required'),
    degree: z.string().min(1, 'Degree is required'),
    field: z.string().min(1, 'Field of study is required'),
    year: z.string().min(1, 'Year is required'),
  })).optional(),
  links: z.object({
    github: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    portfolio: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CandidateProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      skills: [],
      experience: [],
      education: [],
      links: {
        github: '',
        linkedin: '',
        portfolio: '',
      },
    },
  });

  const { watch, setValue } = form;
  const skills = watch('skills') || [];
  const experience = watch('experience') || [];
  const education = watch('education') || [];
  const links = watch('links');

  // Debug: Watch for links changes
  useEffect(() => {
    console.log('Links field changed:', links);
  }, [links]);

  // Load existing candidate profile on mount
  useEffect(() => {
    loadCandidateProfile();
  }, []);

  const loadCandidateProfile = async () => {
    try {
      // Try to get candidate by email from localStorage or session
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        const candidate = await api.getCandidateByEmail(userEmail);
        if (candidate) {
          setCandidateId(candidate.id);
          populateFormFromCandidate(candidate);
        }
      }
    } catch (err) {
      console.log('No existing profile found');
    }
  };

  const populateFormFromCandidate = (candidate: any) => {
    const parsedData = candidate.parsed_data;
    if (parsedData) {
      setValue('name', parsedData.name || '');
      setValue('email', parsedData.email || '');
      setValue('phone', parsedData.phone || '');
      setValue('skills', parsedData.skills || []);
      setValue('experience', parsedData.experience || []);
      setValue('education', parsedData.education || []);
      setValue('links', {
        github: parsedData.links?.github || '',
        linkedin: parsedData.links?.linkedin || '',
        portfolio: parsedData.links?.portfolio || '',
      });
    }
  };

  const onDrop = async (acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    setSuccessMessage(null);

    if (fileRejections.length > 0) {
      setError(fileRejections[0].errors[0].message);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      await handleResumeUpload(file);
    }
  };

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

  const handleResumeUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: ParseResumeResponse = await api.parseResume(file);
      setCandidateId(response.candidate_id);

      // Debug logging
      console.log('=== PARSE RESUME RESPONSE ===');
      console.log('Full response:', response);
      console.log('Parsed data:', response.parsed_data);
      console.log('Links from response:', response.parsed_data.links);
      console.log('==========================');

      // Auto-populate form with parsed data
      const parsedData = response.parsed_data;
      setValue('name', parsedData.name);
      setValue('email', parsedData.email);
      setValue('phone', parsedData.phone || '');
      setValue('skills', parsedData.skills || []);
      setValue('experience', parsedData.experience || []);
      setValue('education', parsedData.education || []);

      const linksToSet = {
        github: parsedData.links?.github || '',
        linkedin: parsedData.links?.linkedin || '',
        portfolio: parsedData.links?.portfolio || '',
      };
      console.log('Setting links to form:', linksToSet);
      setValue('links', linksToSet);

      setSuccessMessage('Resume parsed successfully! Review and edit your profile below.');

      // Store email for future use
      localStorage.setItem('userEmail', parsedData.email);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to parse resume');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setSuccessMessage(null);
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setValue('skills', [...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setValue('skills', skills.filter(s => s !== skillToRemove));
  };

  const addExperience = () => {
    setValue('experience', [
      ...experience,
      { company: '', position: '', duration: '', description: '' }
    ]);
  };

  const removeExperience = (index: number) => {
    setValue('experience', experience.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setValue('education', [
      ...education,
      { institution: '', degree: '', field: '', year: '' }
    ]);
  };

  const removeEducation = (index: number) => {
    setValue('education', education.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (candidateId) {
        // Update existing candidate
        await api.updateCandidate(candidateId, {
          name: data.name,
          email: data.email,
          parsed_data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            skills: data.skills,
            experience: data.experience,
            education: data.education,
            links: data.links,
          }
        });
      } else {
        // Create new candidate
        const response = await api.createCandidate({
          name: data.name,
          email: data.email,
          parsed_data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            skills: data.skills,
            experience: data.experience,
            education: data.education,
            links: data.links,
          }
        });
        setCandidateId(response.id);
      }

      setSuccessMessage('Profile saved successfully!');
      localStorage.setItem('userEmail', data.email);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Upload your resume or fill in your details manually</p>
        </div>
      </div>

      {/* Resume Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Resume
          </CardTitle>
          <CardDescription>
            Upload your resume to automatically populate your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-center text-muted-foreground">
              {isDragActive ? 'Drop the resume here...' : "Drag 'n' drop a resume here, or click to select a file"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (up to 10MB)</p>
          </div>

          {uploadedFile && (
            <div className="flex items-center justify-between p-3 border rounded-lg mt-4">
              <div className="flex items-center gap-2">
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

          {isLoading && (
            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Parsing resume...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 border border-green-500 bg-green-50 dark:bg-green-950 rounded-lg text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 border border-red-500 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="John Doe"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register('phone')}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Skills *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill (e.g., JavaScript, Python)"
              />
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {form.formState.errors.skills && (
              <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
              <Button type="button" onClick={addExperience} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {experience.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No experience added yet</p>
            ) : (
              experience.map((exp, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">Experience #{index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => removeExperience(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        {...form.register(`experience.${index}.company` as const)}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position *</Label>
                      <Input
                        {...form.register(`experience.${index}.position` as const)}
                        placeholder="Job title"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration *</Label>
                    <Input
                      {...form.register(`experience.${index}.duration` as const)}
                      placeholder="e.g., Jan 2020 - Present"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      {...form.register(`experience.${index}.description` as const)}
                      placeholder="Describe your role and achievements"
                      rows={3}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <Button type="button" onClick={addEducation} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {education.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No education added yet</p>
            ) : (
              education.map((edu, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">Education #{index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => removeEducation(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Institution *</Label>
                      <Input
                        {...form.register(`education.${index}.institution` as const)}
                        placeholder="University name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Degree *</Label>
                      <Input
                        {...form.register(`education.${index}.degree` as const)}
                        placeholder="e.g., Bachelor's"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Field of Study *</Label>
                      <Input
                        {...form.register(`education.${index}.field` as const)}
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year *</Label>
                      <Input
                        {...form.register(`education.${index}.year` as const)}
                        placeholder="e.g., 2020"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Professional Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github">GitHub Profile</Label>
              <Input
                id="github"
                type="url"
                {...form.register('links.github')}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                type="url"
                {...form.register('links.linkedin')}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio Website</Label>
              <Input
                id="portfolio"
                type="url"
                {...form.register('links.portfolio')}
                placeholder="https://yourportfolio.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
