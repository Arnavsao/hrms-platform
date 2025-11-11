'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  ArrowLeft,
  RefreshCcw,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  Laptop,
  LogOut,
  FileText,
  Eye,
  Lock
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed' | 'warning';
}

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

interface SecurityThreat {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'unauthorized_access' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip_address?: string;
  user_id?: string;
  detected_at: string;
  resolved: boolean;
}

export default function SecurityCenterPage() {
  const router = useRouter();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      const [auditData, sessionsData, threatsData] = await Promise.all([
        api.getAuditLog(50, 0),
        api.getActiveSessions(),
        api.getSecurityThreats()
      ]);
      setAuditLog(auditData.entries || []);
      setActiveSessions(sessionsData.sessions || []);
      setThreats(threatsData.threats || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch security data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async () => {
    if (!selectedSession) return;
    setIsTerminating(true);
    try {
      await api.terminateSession(selectedSession.id);
      setSuccessMessage(`Session for ${selectedSession.user_email} has been terminated`);
      setTerminateDialogOpen(false);
      await fetchSecurityData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to terminate session');
    } finally {
      setIsTerminating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading security data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
        <div className="space-y-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Shield className="mr-3 h-8 w-8 text-blue-600" />
                    Security Center
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Monitor security events and manage access
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={fetchSecurityData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">{activeSessions.length}</p>
                  </div>
                  <Activity className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Security Threats</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {threats.filter(t => !t.resolved).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Failed Logins</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {threats.filter(t => t.type === 'failed_login').length}
                    </p>
                  </div>
                  <Lock className="h-10 w-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Audit Entries</p>
                    <p className="text-3xl font-bold text-gray-900">{auditLog.length}</p>
                  </div>
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Threats */}
          {threats.filter(t => !t.resolved).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Active Security Threats
                </CardTitle>
                <CardDescription>Unresolved security issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {threats.filter(t => !t.resolved).map((threat) => (
                    <div
                      key={threat.id}
                      className="p-4 border rounded-lg bg-red-50 border-red-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(threat.severity)}>
                              {threat.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">{threat.type}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{threat.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {threat.ip_address && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {threat.ip_address}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(threat.detected_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Investigate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-green-600" />
                Active Sessions
              </CardTitle>
              <CardDescription>Currently logged-in users and their session details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No active sessions</p>
                ) : (
                  activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{session.user_email}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {session.ip_address}
                            </div>
                            <div className="flex items-center">
                              <Laptop className="h-3 w-3 mr-1" />
                              {session.user_agent.substring(0, 30)}...
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Last: {new Date(session.last_activity).toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {new Date(session.expires_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedSession(session);
                            setTerminateDialogOpen(true);
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Terminate
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-600" />
                Audit Log
              </CardTitle>
              <CardDescription>Recent security and system events (last 50 entries)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLog.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No audit entries</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {auditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 border-b hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getStatusIcon(entry.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {entry.action}
                                </span>
                                {entry.resource_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {entry.resource_type}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {entry.user_email && (
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {entry.user_email}
                                  </span>
                                )}
                                {entry.ip_address && (
                                  <span className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {entry.ip_address}
                                  </span>
                                )}
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terminate Session Dialog */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <LogOut className="h-5 w-5 mr-2" />
              Terminate Session
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate this session?
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="py-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <p><strong>User:</strong> {selectedSession.user_email}</p>
                    <p><strong>IP Address:</strong> {selectedSession.ip_address}</p>
                    <p><strong>Last Activity:</strong> {new Date(selectedSession.last_activity).toLocaleString()}</p>
                  </div>
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500 mt-4">
                The user will be immediately logged out and will need to re-authenticate.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminateSession}
              disabled={isTerminating}
            >
              {isTerminating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Terminating...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Terminate Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
