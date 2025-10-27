'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  X,
  Home,
  Users,
  Briefcase,
  FileText,
  Settings,
  LogOut,
  User,
  BarChart3,
  Upload,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { session, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = session?.user?.role;

  const navigationItems = [
    {
      name: 'Dashboard',
      href: userRole === 'admin' ? '/admin' : userRole === 'recruiter' ? '/recruiter' : '/candidate',
      icon: Home,
      current: pathname === '/admin' || pathname === '/recruiter' || pathname === '/candidate',
    },
    ...(userRole === 'recruiter' || userRole === 'admin' ? [
      {
        name: 'Jobs',
        href: '/jobs',
        icon: Briefcase,
        current: pathname.startsWith('/jobs'),
      },
      {
        name: 'Candidates',
        href: '/candidates',
        icon: Users,
        current: pathname.startsWith('/candidates'),
      },
      {
        name: 'Applications',
        href: '/recruiter/applications',
        icon: FileText,
        current: pathname.startsWith('/recruiter/applications'),
      },
    ] : []),
    ...(userRole === 'admin' ? [
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        current: pathname.startsWith('/admin/analytics'),
      },
    ] : []),
    ...(userRole === 'candidate' ? [
      {
        name: 'Upload Resume',
        href: '/candidates/upload',
        icon: Upload,
        current: pathname.startsWith('/candidates/upload'),
      },
      {
        name: 'Browse Jobs',
        href: '/jobs',
        icon: Search,
        current: pathname.startsWith('/jobs') && !pathname.startsWith('/jobs/create') && !pathname.startsWith('/jobs/edit'),
      },
    ] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'recruiter':
        return 'default';
      case 'candidate':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <nav className={cn('bg-white border-b border-gray-200 shadow-sm', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden mr-4">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h2 className="text-xl font-bold text-gray-900">HRMS Platform</h2>
                    </div>
                    <div className="flex-1 py-6">
                      <nav className="space-y-2">
                        {navigationItems.map((item) => (
                          <Button
                            key={item.name}
                            variant={item.current ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start h-12 px-4',
                              item.current && 'bg-secondary'
                            )}
                            onClick={() => {
                              router.push(item.href);
                              setIsOpen(false);
                            }}
                          >
                            <item.icon className="mr-3 h-5 w-5" />
                            <span className="font-medium">{item.name}</span>
                          </Button>
                        ))}
                      </nav>
                    </div>
                    <div className="p-6 border-t bg-gray-50">
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={undefined} />
                          <AvatarFallback>
                            {getInitials(session?.user?.email || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {session?.user?.email}
                          </p>
                          <Badge variant={getRoleBadgeVariant(userRole || '')} className="text-xs mt-1">
                            {userRole}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">HRMS</h1>
              </div>
            </div>

            {/* Desktop navigation */}
            <div className="hidden lg:flex lg:ml-8 lg:space-x-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.name}
                  variant={item.current ? 'secondary' : 'ghost'}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    item.current && 'bg-secondary text-secondary-foreground'
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Desktop user menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            <Badge variant={getRoleBadgeVariant(userRole || '')} className="px-3 py-1">
              {userRole}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={undefined} />
                    <AvatarFallback>
                      {getInitials(session?.user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userRole}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
