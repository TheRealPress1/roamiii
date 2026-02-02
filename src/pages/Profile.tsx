import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Loader2, Lock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/layout/Header';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Avatar cropper state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Get next redirect from query params
  const nextUrl = searchParams.get('next');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setTagline(profile.tagline || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Convert to data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCroppedSave = async (croppedBlob: Blob) => {
    if (!user) return;

    setCropModalOpen(false);
    setUploading(true);

    try {
      const filePath = `${user.id}/avatar.png`;

      // Upload cropped blob
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithTimestamp);

      // Update profile immediately (upsert in case profile doesn't exist)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          avatar_url: urlWithTimestamp,
        });

      if (updateError) throw updateError;

      toast.success('Photo saved!');
      refreshProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setRawImageSrc(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          name: name.trim() || null,
          phone: phone.trim() || null,
          tagline: tagline.trim() || null,
          avatar_url: avatarUrl,
        });

      if (error) throw error;

      toast.success('Profile saved!');
      await refreshProfile();

      // Redirect based on next param or default to dashboard
      if (nextUrl) {
        // Clear pending invite code if redirecting to invite page
        if (nextUrl.includes('/invite/')) {
          localStorage.removeItem('pending_invite_code');
        }
        navigate(nextUrl);
      } else {
        navigate('/app');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        // First + Last initial
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      // Just first 2 chars of single name
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Back button - only show if not in onboarding flow */}
          {!nextUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app')}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          )}

          {/* Profile Card */}
          <div className="bg-card rounded-3xl border border-border shadow-xl p-8">
            {/* Avatar Section - Centered at top */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <Avatar className="h-28 w-28 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-lg">
                  <AvatarImage 
                    src={avatarUrl || undefined} 
                    alt="Profile photo" 
                    className="object-cover object-center"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-2xl font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Hover overlay */}
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                
                {/* Small edit button at bottom-right */}
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Form Fields - Partiful style */}
            <div className="space-y-6">
              {/* Name - Big prominent input */}
              <div>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-xl font-medium border-0 border-b-2 border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Bio/Tagline */}
              <div className="space-y-1">
                <Input
                  placeholder="Add a bio"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="h-12 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent placeholder:text-muted-foreground/50"
                />
                <p className="text-xs text-muted-foreground">
                  One line your trip crew will see
                </p>
              </div>

              {/* Phone - Private block */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Phone number · Only visible to you
                </p>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>

              {/* Email - Private block (read-only) */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Email · Only visible to you
                </p>
                <div className="relative">
                  <Input
                    value={user?.email || ''}
                    readOnly
                    className="h-11 bg-background pr-10 text-muted-foreground cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-8 h-12 gradient-primary text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Avatar Crop Modal */}
      {rawImageSrc && (
        <AvatarCropModal
          open={cropModalOpen}
          imageSrc={rawImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageSrc(null);
          }}
          onSave={handleCroppedSave}
        />
      )}
    </div>
  );
}
