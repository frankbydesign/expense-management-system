import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Upload, User, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProfileSettingsProps {
  user: any;
  accessToken: string;
  onProfileUpdate: () => void;
}

export function ProfileSettings({ user, accessToken, onProfileUpdate }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error('Please select an avatar image');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/profile/avatar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to upload avatar');
        setIsUploadingAvatar(false);
        return;
      }

      toast.success('Avatar updated successfully');
      setAvatarFile(null);
      setAvatarPreview(null);
      onProfileUpdate();
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name, email }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to update profile');
        setIsUpdating(false);
        return;
      }

      toast.success('Profile updated successfully');
      
      // If email changed, user needs to log in again
      if (email !== user.email) {
        toast.info('Please log in again with your new email');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        onProfileUpdate();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload a profile picture to personalize your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Current Avatar</Label>
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatarUrl || ''} alt={user.name || 'User'} />
                <AvatarFallback className="text-xl">
                  {user.name ? getInitials(user.name) : <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
            </div>

            {avatarPreview && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarPreview} alt="Preview" />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-upload">Upload New Avatar</Label>
            <div className="flex items-center gap-4">
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={isUploadingAvatar}
                className="max-w-sm"
              />
              <Button
                onClick={handleUploadAvatar}
                disabled={!avatarFile || isUploadingAvatar}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingAvatar ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            <p className="text-gray-600">Recommended: Square image, at least 200x200 pixels</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </Label>
              <Input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={isUpdating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isUpdating}
                required
              />
              {email !== user.email && (
                <p className="text-orange-600">
                  Changing your email will require you to log in again
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                type="text"
                value={user.role === 'consultant' ? 'Consultant' : 'Manager'}
                disabled
                className="bg-gray-100"
              />
              <p className="text-gray-600">Your role cannot be changed</p>
            </div>

            <Button type="submit" disabled={isUpdating}>
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
