import { supabase } from './supabaseClient';

// User roles for role-based access control
export enum UserRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  EMPLOYEE = 'employee',
  CANDIDATE = 'candidate',
  EMPLOYEE = 'employee',
}

// Type for user session with role information
export interface UserSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  access_token: string;
}

// Auth helper functions
export const auth = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, role: UserRole = UserRole.CANDIDATE) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // Store role in user metadata
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getSession: async (): Promise<UserSession | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    if (!session) return null;

    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: (session.user.user_metadata?.role as UserRole) || UserRole.CANDIDATE,
      },
      access_token: session.access_token,
    };
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    return user;
  },

  // Check if user has specific role
  hasRole: async (requiredRole: UserRole): Promise<boolean> => {
    const session = await auth.getSession();
    if (!session) return false;
    
    // Admin has access to everything
    if (session.user.role === UserRole.ADMIN) return true;
    
    return session.user.role === requiredRole;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (session: UserSession | null) => void) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        callback(null);
        return;
      }

      callback({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || UserRole.CANDIDATE,
        },
        access_token: session.access_token,
      });
    });
  },
};

// Hook for protecting routes (to be used in middleware or components)
export const requireAuth = async (requiredRole?: UserRole) => {
  const session = await auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  if (requiredRole && !await auth.hasRole(requiredRole)) {
    throw new Error('Insufficient permissions');
  }

  return session;
};

