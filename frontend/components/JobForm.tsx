'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';
import { useState } from 'react';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }),
  requirements: z.string().min(20, { message: 'Requirements must be at least 20 characters.' }),
});

type JobFormProps = {
  initialData?: z.infer<typeof formSchema>;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
};

export function JobForm({ initialData, onSubmit }: JobFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      requirements: '',
    },
  });

  async function handleFormSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Failed to submit job form", error)
      // NOTE: Consider adding toast notifications for user feedback
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl">{initialData ? 'Edit Job' : 'Create a New Job'}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the role, responsibilities, and company culture." {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List the required skills, experience, and qualifications." {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Job'}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
