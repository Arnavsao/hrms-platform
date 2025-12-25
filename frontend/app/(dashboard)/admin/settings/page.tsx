'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  ArrowLeft,
  Save,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  Bell,
  Database,
  Clock,
  Wrench
} from 'lucide-react';

interface SystemSettings {
  ai_matching_threshold: number;
  auto_screening_enabled: boolean;
  email_notifications_enabled: boolean;
  max_resume_size_mb: number;
  session_timeout_minutes: number;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  ai_model_version: string;
}

export default function SystemSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
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

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSystemSettings();
      setSettings(data);
      setHasChanges(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.updateSystemSettings(settings);
      setSuccessMessage('System settings updated successfully');
      setHasChanges(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading settings...</p>
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
                    <Settings className="mr-3 h-8 w-8 text-blue-600" />
                    System Settings
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Configure platform behavior and features
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={fetchSettings} disabled={isSaving}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
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

          {settings && (
            <>
              {/* AI & Matching Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-yellow-600" />
                    AI & Matching Configuration
                  </CardTitle>
                  <CardDescription>Configure AI-powered matching and processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="ai_matching_threshold">
                        AI Matching Threshold (%)
                      </Label>
                      <Input
                        id="ai_matching_threshold"
                        type="number"
                        min="0"
                        max="100"
                        value={settings.ai_matching_threshold}
                        onChange={(e) => updateSetting('ai_matching_threshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">
                        Minimum match score required for automatic shortlisting
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai_model_version">AI Model Version</Label>
                      <select
                        id="ai_model_version"
                        value={settings.ai_model_version}
                        onChange={(e) => updateSetting('ai_model_version', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Balanced)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                      </select>
                      <p className="text-sm text-gray-500">
                        Select the AI model for resume parsing and matching
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="auto_screening">Auto-Screening</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Automatically initiate screening for high-scoring candidates
                      </p>
                    </div>
                    <Switch
                      id="auto_screening"
                      checked={settings.auto_screening_enabled}
                      onCheckedChange={(checked) => updateSetting('auto_screening_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5 text-purple-600" />
                    System Limits & Quotas
                  </CardTitle>
                  <CardDescription>Configure system resource limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="max_resume_size">
                        Max Resume Size (MB)
                      </Label>
                      <Input
                        id="max_resume_size"
                        type="number"
                        min="1"
                        max="50"
                        value={settings.max_resume_size_mb}
                        onChange={(e) => updateSetting('max_resume_size_mb', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">
                        Maximum allowed resume file size for uploads
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_timeout">
                        <Clock className="inline mr-1 h-4 w-4" />
                        Session Timeout (minutes)
                      </Label>
                      <Input
                        id="session_timeout"
                        type="number"
                        min="5"
                        max="1440"
                        value={settings.session_timeout_minutes}
                        onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">
                        Auto-logout inactive users after this duration
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5 text-green-600" />
                    Communications & Notifications
                  </CardTitle>
                  <CardDescription>Configure email and notification settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="email_notifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Send email notifications for application updates and system events
                      </p>
                    </div>
                    <Switch
                      id="email_notifications"
                      checked={settings.email_notifications_enabled}
                      onCheckedChange={(checked) => updateSetting('email_notifications_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Control */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-red-600" />
                    System Control & Access
                  </CardTitle>
                  <CardDescription>Critical system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="registration">User Registration</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Allow new users to register on the platform
                      </p>
                    </div>
                    <Switch
                      id="registration"
                      checked={settings.registration_enabled}
                      onCheckedChange={(checked) => updateSetting('registration_enabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <Label htmlFor="maintenance" className="text-red-700">
                        <Wrench className="inline mr-1 h-4 w-4" />
                        Maintenance Mode
                      </Label>
                      <p className="text-sm text-red-600 mt-1">
                        Disable platform access for all users except admins
                      </p>
                    </div>
                    <Switch
                      id="maintenance"
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                    />
                  </div>

                  {settings.maintenance_mode && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Maintenance mode is currently ACTIVE. Only administrators can access the platform.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Save Footer */}
              {hasChanges && (
                <div className="fixed bottom-6 right-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium">You have unsaved changes</p>
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
