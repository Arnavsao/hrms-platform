'use client';

import { useAuth } from '@/lib/AuthContext';
import { Button } from './ui/button';

export default function Dashboard() {
  const { session, signOut } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Welcome to the HRMS Dashboard</h1>
      {session && (
        <div className="mt-4">
          <p>You are logged in as {session.user.email}</p>
          <p>Your role is: {session.user.role}</p>
          <Button onClick={signOut} className="mt-4">
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
