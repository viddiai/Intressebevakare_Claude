import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  userInitials: string;
  userId: string;
  onUploadSuccess: (imageUrl: string) => void;
}

export function ProfileImageUpload({
  currentImageUrl,
  userInitials,
  userId,
  onUploadSuccess,
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return "Endast JPG och PNG filer är tillåtna";
    }

    if (file.size > maxSize) {
      return "Filen får max vara 5MB";
    }

    return null;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({
        title: "Ogiltig fil",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Ingen fil vald",
        description: "Välj en fil att ladda upp",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('profileImage', selectedFile);

      const response = await fetch(`/api/users/${userId}/profile-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Uppladdning misslyckades');
      }

      const data = await response.json();
      
      toast({
        title: "Profilbild uppladdad",
        description: "Din profilbild har uppdaterats",
      });

      onUploadSuccess(data.profileImageUrl);
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Uppladdning misslyckades",
        description: error.message || "Kunde inte ladda upp bilden",
        variant: "destructive",
      });
      
      // Revert preview on error
      setPreviewUrl(currentImageUrl || null);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setSelectedFile(null);
    setPreviewUrl(currentImageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewUrl || undefined} />
          <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Label htmlFor="profile-image-upload" className="text-sm font-medium">
            Profilbild
          </Label>
          <p className="text-xs text-muted-foreground">
            JPG eller PNG, max 5MB
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid="button-choose-image"
        >
          <Upload className="w-4 h-4 mr-2" />
          Välj fil
        </Button>

        {selectedFile && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
              data-testid="button-upload-image"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Laddar upp...
                </>
              ) : (
                'Ladda upp'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemovePreview}
              disabled={isUploading}
              data-testid="button-cancel-upload"
            >
              <X className="w-4 h-4 mr-2" />
              Avbryt
            </Button>
          </>
        )}
      </div>

      {selectedFile && (
        <p className="text-xs text-muted-foreground">
          Vald fil: {selectedFile.name}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        id="profile-image-upload"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />
    </div>
  );
}
