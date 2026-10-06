'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, ParseResumeResponse } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  FileText,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Github,
  Linkedin,
  Globe,
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';

const FORM_ID = 'candidate-profile-form';
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

/* ── Presentational helpers ──────────────────────────────────────────────── */

/** Read-only inputs should look intentionally locked, not broken. */
const fieldClass = 'disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-600 disabled:opacity-100';

/** Section shell: icon tile + title (+ optional description and header action). */
function Section({
  icon: Icon,
  title,
  description,
  required,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  required?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-6 tracking-tight text-gray-900">
              {title}
              {required && <span className="ml-0.5 text-destructive">*</span>}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
      </div>
      <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">{children}</CardContent>
    </Card>
  );
}

/** Label + input wrapper with a consistent optional leading icon and error slot. */
function Field({
  label,
  htmlFor,
  required,
  error,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Consistent empty state for the repeatable sections. */
function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Card for one repeated entry (experience / education). */
function EntryCard({
  index,
  label,
  onRemove,
  disabled,
  children,
}: {
  index: number;
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:border-gray-300 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-700">
            {index + 1}
          </span>
          {label}
        </h3>
        <Button
          type="button"
          onClick={onRemove}
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
          className="h-8 w-8 text-gray-400 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function CandidateProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const { session } = useAuth();

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

  const populateFormFromCandidate = useCallback((candidate: any) => {
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
  }, [setValue]);

  const sessionEmail = session?.user?.email;

  const loadCandidateProfile = useCallback(async () => {
    try {
      // Try to get candidate by email from session, fallback to localStorage
      const userEmail = sessionEmail || localStorage.getItem('userEmail');
      if (userEmail) {
        const candidate = await api.getCandidateByEmail(userEmail);
        if (candidate) {
          setCandidateId(candidate.id);
          populateFormFromCandidate(candidate);
          setIsEditing(false);
        }
      }
    } catch (err) {
      setIsEditing(true);
    }
  }, [sessionEmail, populateFormFromCandidate]);

  // Load existing candidate profile on mount
  useEffect(() => {
    loadCandidateProfile();
  }, [loadCandidateProfile]);

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
    disabled: !isEditing,
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

      // Auto-populate form with parsed data
      const parsedData = response.parsed_data;
      setValue('name', parsedData.name);
      setValue('email', parsedData.email);
      setValue('phone', parsedData.phone || '');
      setValue('skills', parsedData.skills || []);
      setValue('experience', parsedData.experience || []);
      setValue('education', parsedData.education || []);
      setValue('links', {
        github: parsedData.links?.github || '',
        linkedin: parsedData.links?.linkedin || '',
        portfolio: parsedData.links?.portfolio || '',
      });

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
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <div className="mx-auto w-full max-w-4xl pb-12 sm:pb-16">
      {/* Page header — sticks to the top of the scroll area so Save stays reachable */}
      <header className="sticky top-0 z-20 bg-gray-50/95 pb-4 pt-6 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 sm:pt-8">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your resume or edit your details
            </p>
          </div>

          {/* Actions: full-width and thumb-reachable on mobile, inline on desktop */}
          <div className="flex shrink-0 items-center gap-2">
            {!isEditing ? (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => { loadCandidateProfile(); setIsEditing(false); }}
                >
                  Cancel
                </Button>
                {/* `form` attribute submits the form below, which this button sits outside of */}
                <Button
                  type="submit"
                  form={FORM_ID}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-5 pt-5 sm:space-y-6 sm:pt-6">
        {/* Status messages */}
        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="min-w-0 flex-1">{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              aria-label="Dismiss message"
              className="-m-1 rounded p-1 text-green-600/70 transition-colors hover:bg-green-100 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="-m-1 rounded p-1 text-red-600/70 transition-colors hover:bg-red-100 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Resume upload */}
        <Section
          icon={FileText}
          title="Upload Resume"
          description="Upload your resume to automatically populate your profile"
        >
          <div
            {...getRootProps()}
            className={cn(
              'group flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12',
              isEditing
                ? 'cursor-pointer border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                : 'cursor-not-allowed border-gray-200 bg-gray-50/60',
              isDragActive && 'border-primary bg-primary/5'
            )}
          >
            <input {...getInputProps()} />
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors',
                isEditing && 'group-hover:bg-gray-200 group-hover:text-gray-600',
                isDragActive && 'bg-primary/10 text-primary'
              )}
            >
              <UploadCloud className="h-6 w-6" />
            </span>
            <p className="mt-4 max-w-sm text-sm font-medium text-gray-900">
              {isEditing
                ? isDragActive
                  ? 'Drop the resume here…'
                  : "Drag 'n' drop a resume here, or click to select a file"
                : 'Click Edit Profile to upload a new resume'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX (up to 10MB)</p>
          </div>

          {uploadedFile && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <FileIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={!isEditing}
                aria-label="Remove file"
                className="h-8 w-8 shrink-0 text-gray-400 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Parsing resume…</span>
            </div>
          )}
        </Section>

        {/* Profile form */}
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 sm:space-y-6"
        >
          {/* Basic information */}
          <Section icon={User} title="Basic Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <Field label="Full Name" htmlFor="name" required error={errors.name?.message} icon={User}>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="John Doe"
                  disabled={!isEditing}
                  autoComplete="name"
                  className={cn('pl-9', fieldClass)}
                />
              </Field>

              <Field label="Email" htmlFor="email" required error={errors.email?.message} icon={Mail}>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john@example.com"
                  disabled={!isEditing}
                  autoComplete="email"
                  className={cn('pl-9', fieldClass)}
                />
              </Field>

              <Field label="Phone Number" htmlFor="phone" icon={Phone}>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register('phone')}
                  placeholder="+1 (555) 123-4567"
                  disabled={!isEditing}
                  autoComplete="tel"
                  className={cn('pl-9', fieldClass)}
                />
              </Field>
            </div>
          </Section>

          {/* Skills */}
          <Section
            icon={Award}
            title="Skills"
            required
            description="Add the technologies and tools you work with"
          >
            {isEditing && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add a skill (e.g., JavaScript, Python)"
                  aria-label="Add a skill"
                  className={cn('sm:flex-1', fieldClass)}
                />
                <Button
                  type="button"
                  onClick={addSkill}
                  variant="outline"
                  disabled={!newSkill.trim()}
                  className="shrink-0 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add skill
                </Button>
              </div>
            )}

            {skills.length > 0 ? (
              <div className={cn('flex flex-wrap gap-2', isEditing && 'mt-4')}>
                {skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1.5 text-sm font-medium text-gray-800"
                  >
                    <span className="truncate">{skill}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div className={cn(isEditing && 'mt-4')}>
                <EmptyState
                  icon={Award}
                  title="No skills added yet"
                  hint={
                    isEditing
                      ? 'Add skills one at a time, or upload a resume to fill them in automatically.'
                      : 'Click Edit Profile to add your skills.'
                  }
                />
              </div>
            )}

            {errors.skills && (
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.skills.message}
              </p>
            )}
          </Section>

          {/* Work experience */}
          <Section
            icon={Briefcase}
            title="Work Experience"
            action={
              <Button
                type="button"
                onClick={addExperience}
                variant="outline"
                size="sm"
                disabled={!isEditing}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Experience
              </Button>
            }
          >
            {experience.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No experience added yet"
                hint="Add your roles so recruiters can see your background."
                action={
                  isEditing ? (
                    <Button type="button" onClick={addExperience} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                      Add Experience
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {experience.map((exp, index) => (
                  <EntryCard
                    key={index}
                    index={index}
                    label="Experience"
                    onRemove={() => removeExperience(index)}
                    disabled={!isEditing}
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                      <Field label="Company" required>
                        <Input
                          {...form.register(`experience.${index}.company` as const)}
                          placeholder="Company name"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                      <Field label="Position" required>
                        <Input
                          {...form.register(`experience.${index}.position` as const)}
                          placeholder="Job title"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                    </div>

                    <Field label="Duration" required>
                      <Input
                        {...form.register(`experience.${index}.duration` as const)}
                        placeholder="e.g., Jan 2020 - Present"
                        disabled={!isEditing}
                        className={cn('bg-white', fieldClass)}
                      />
                    </Field>

                    <Field label="Description">
                      <Textarea
                        {...form.register(`experience.${index}.description` as const)}
                        placeholder="Describe your role and achievements"
                        rows={3}
                        disabled={!isEditing}
                        className={cn('resize-y bg-white', fieldClass)}
                      />
                    </Field>
                  </EntryCard>
                ))}
              </div>
            )}
          </Section>

          {/* Education */}
          <Section
            icon={GraduationCap}
            title="Education"
            action={
              <Button
                type="button"
                onClick={addEducation}
                variant="outline"
                size="sm"
                disabled={!isEditing}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Education
              </Button>
            }
          >
            {education.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No education added yet"
                hint="Add your degrees and certifications."
                action={
                  isEditing ? (
                    <Button type="button" onClick={addEducation} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                      Add Education
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {education.map((edu, index) => (
                  <EntryCard
                    key={index}
                    index={index}
                    label="Education"
                    onRemove={() => removeEducation(index)}
                    disabled={!isEditing}
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                      <Field label="Institution" required>
                        <Input
                          {...form.register(`education.${index}.institution` as const)}
                          placeholder="University name"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                      <Field label="Degree" required>
                        <Input
                          {...form.register(`education.${index}.degree` as const)}
                          placeholder="e.g., Bachelor's"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                      <Field label="Field of Study" required>
                        <Input
                          {...form.register(`education.${index}.field` as const)}
                          placeholder="e.g., Computer Science"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                      <Field label="Year" required>
                        <Input
                          {...form.register(`education.${index}.year` as const)}
                          placeholder="e.g., 2020"
                          disabled={!isEditing}
                          className={cn('bg-white', fieldClass)}
                        />
                      </Field>
                    </div>
                  </EntryCard>
                ))}
              </div>
            )}
          </Section>

          {/* Professional links */}
          <Section
            icon={LinkIcon}
            title="Professional Links"
            description="Optional, but they strengthen your profile"
          >
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              <Field label="GitHub Profile" htmlFor="github" icon={Github}>
                <Input
                  id="github"
                  type="url"
                  inputMode="url"
                  {...form.register('links.github')}
                  placeholder="https://github.com/username"
                  disabled={!isEditing}
                  className={cn('pl-9', fieldClass)}
                />
              </Field>

              <Field label="LinkedIn Profile" htmlFor="linkedin" icon={Linkedin}>
                <Input
                  id="linkedin"
                  type="url"
                  inputMode="url"
                  {...form.register('links.linkedin')}
                  placeholder="https://linkedin.com/in/username"
                  disabled={!isEditing}
                  className={cn('pl-9', fieldClass)}
                />
              </Field>

              <Field label="Portfolio Website" htmlFor="portfolio" icon={Globe}>
                <Input
                  id="portfolio"
                  type="url"
                  inputMode="url"
                  {...form.register('links.portfolio')}
                  placeholder="https://yourportfolio.com"
                  disabled={!isEditing}
                  className={cn('pl-9', fieldClass)}
                />
              </Field>
            </div>
          </Section>

          {/* Footer actions */}
          {isEditing && (
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => { loadCandidateProfile(); setIsEditing(false); }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} size="lg" className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
