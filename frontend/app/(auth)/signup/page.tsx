'use client';

import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <AuthForm isLogin={false} />
    </div>
  );
}
