import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Edit,
  FileDown,
  Copy,
  FileIcon,
  Link2,
  Loader2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Packer } from "docx";
import {
  downloadBriefAsPDF,
  downloadBriefAsDOCX,
  copyBriefToClipboard,
  shareBrief,
} from "@/lib/document/briefUtils";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";

export default function ProjectBrief({ initialData }) {
  const { brief, updateBrief, generateNewBrief, saveBrief, deleteBrief } = useBrief();
  const { user, isAuthenticated } = useAuth();
  
  // Process the initial data structure to handle both flat and nested formats
  const processInitialData = (data) => {
    // If briefData exists and contains project data, use that as the primary source
    if (data?.briefData) {
      return {
        ...data.briefData,
        // Include top-level metadata
        briefId: data.briefId || data.briefData.briefId,
        // title: data.title || data.briefData.project_title,
        createdAt: data.createdAt || data.briefData.createdAt || data.updatedAt,
      };
    }
    // Otherwise use the flat structure
    return data;
  };
  
  // Use brief from context if available, otherwise fall back to initialData prop
  const currentBrief = brief || initialData;
  const processedInitialData = processInitialData(currentBrief);
  
  const [briefData, setBriefData] = useState(processedInitialData);
  const [editData, setEditData] = useState(processedInitialData);
  
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const briefRef = useRef(null);

  // Update local state when brief changes in context
  useEffect(() => {
    if (brief) {
      const processedBrief = processInitialData(brief);
      setBriefData(processedBrief);
      setEditData(processedBrief);
    }
  }, [brief]);

  const handleEditChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: Array.isArray(editData[field])
        ? value.split('\n').filter(item => item.trim() !== '')
        : value
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Update local state
      setBriefData(editData);
      updateBrief(editData);
      
      // If the user is authenticated, save the updated brief to the server
      if (isAuthenticated && user) {
        try {
          const saveResult = await saveBrief(editData);
          if (saveResult && saveResult.success) {
            toast.success(saveResult.message || "Brief updated successfully!");
          } else {
            console.error("Error saving brief - no success in response");
            toast.error("Failed to save brief. Please try again.");
          }
        } catch (error) {
          console.error("Error saving brief:", error);
          toast.error("Failed to save brief. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error during brief save:", error);
      toast.error("An error occurred while saving the brief");
    } finally {
      setIsSaving(false);
      setOpen(false);
    }
  };

  const downloadBrief = async (format) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error("You must be logged in to download briefs");
      return;
    }
    
    if (format === "PDF") {
      downloadBriefAsPDF(briefData);
    } else if (format === "DOCX") {
      const doc = await downloadBriefAsDOCX(briefData);
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${briefData.project_title.replace(
        /\s+/g,
        "_"
      )}_brief.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("DOCX downloaded successfully");
    }
  };

  const copyToClipboard = async () => {
    try {
      setCopying(true);
      await copyBriefToClipboard(briefData);
    } catch (err) {
      console.error("Copy failed:", err);
    } finally {
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const shareUrl = async () => {
    try {
      setSharing(true);
      await shareBrief({
        briefData,
        user,
        isAuthenticated,
      });
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setTimeout(() => setSharing(false), 2000);
    }
  };

  const handleDeleteBrief = async () => {
    if (!isAuthenticated || !briefData.briefId) {
      toast.error("You must be logged in to delete briefs");
      return;
    }
    
    try {
      setIsDeleting(true);
      const result = await deleteBrief(briefData.briefId);
      
      if (result.success) {
        toast.success("Brief deleted successfully");
        // The deleteBrief function in the context already updates the saved briefs list
        // and clears the current brief if needed
      } else {
        toast.error(result.error || "Failed to delete brief");
      }
    } catch (error) {
      console.error("Error deleting brief:", error);
      toast.error("An error occurred while deleting the brief");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditClick = () => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to edit briefs");
      return;
    }
    setOpen(true);
  };

  if (!briefData) {
    return <div className="text-left p-4">No project brief data provided.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 text-left space-y-4">
      <Card className="pt-0 rounded-md" ref={briefRef}>
        <CardHeader className="bg-gradient-to-r rounded-t-md from-slate-100 to-slate-50 border-b text-left pt-6 ">
          <div className="flex items-start flex-col justify-start gap-4
          sm:!flex-row sm:!justify-between sm:!items-center">
            <div className="flex items-center gap-2">
              <CardTitle className="text-slate-800 text-left font-heading">
                {briefData.project_title || "Untitled Project"}
              </CardTitle>
            </div>
            <div className="flex flex-col itmes-start
            sm:!items-end ">
              <CardDescription className="text-sm font-medium text-slate-500 text-left">
                Platform: {briefData.platform || "Not specified"}
              </CardDescription>
              {briefData.createdAt && (
                <CardDescription className="text-sm font-medium text-slate-500 text-left">
                  Created on: {(() => {
                    const date = new Date(briefData.createdAt);
                    const options = { year: 'numeric', month: 'long', day: 'numeric' };
                    return date.toLocaleDateString('en-US', options);
                  })()}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-2 text-left">
          <div className="space-y-6">
            {Object.entries(briefData).map(([key, value]) => {
              // Skip empty arrays, undefined/null values, and metadata
              if (!value || 
                  (Array.isArray(value) && value.length === 0) || 
                  key === 'briefId' || 
                  key === 'createdAt' || 
                  key === 'updatedAt' ||
                  key === 'recordType' || 
                  key === 'timestamp' ||
                  key === 'userId' ||
                  key === 'title') {
                return null;
              }
              
              // Format the field name for display
              let fieldName = key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              // Format date fields
              let displayValue = value;
              if ((key === 'createdAt' || key === 'timestamp') && value) {
                const date = new Date(value);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                displayValue = date.toLocaleDateString('en-US', options);
              }

              // Ensure we're not trying to render an object directly
              if (typeof displayValue === 'object' && displayValue !== null && !Array.isArray(displayValue)) {
                return null; // Skip objects that aren't arrays
              }

              return (
                <div key={key}>
                  <h3 className="text-sm font-medium text-slate-500 mb-2 text-left">
                    {fieldName}
                  </h3>
                  {Array.isArray(displayValue) ? (
                    <ul className="list-disc pl-5 space-y-1 text-left">
                      {displayValue.map((item, index) => {
                        // Ensure we're not rendering objects in the list
                        const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item);
                        return (
                          <li key={index} className="text-slate-700 text-left">
                            {itemStr}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-slate-700 text-left">
                      {String(displayValue)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex border-t pt-4 mt-4 text-left gap-4 items-start justify-between flex-col sm:!flex-row">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="flex items-center gap-2 rounded-sm w-auto"
            >
              {copying ? (
                <>
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>

            {isAuthenticated && (
              <Button
                variant="outline"
                onClick={shareUrl}
                className="flex items-center gap-2 rounded-sm w-auto"
              >
                {sharing ? (
                  <>
                    Sharing ...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Share
                  </>
                )}
              </Button>
            )}

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 justify-center rounded-sm sm:w-auto">
                    <FileDown className="h-4 w-4" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => downloadBrief("PDF")}>
                    <FileIcon className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadBrief("DOCX")}>
                    <FileIcon className="h-4 w-4 mr-2" />
                    Download as DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex gap-2 flex-col sm:!flex-row sm:items-center">
            {isAuthenticated && (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-sm p-2 text-red-500 bg-red-50  hover:bg-red-100 hover:text-red-600
                    focus:ring-red-500 focus:ring-offset-red-50 focus:ring-offset-2"
                    title="Delete Brief"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[425px] text-left">
                  <DialogHeader>
                    <DialogTitle className="text-left">Delete Brief</DialogTitle>
                    <DialogDescription className="text-left">
                      Are you sure you want to delete this brief? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex items-center justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteBrief}
                      disabled={isDeleting}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Brief"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            {/* Display login message for anonymous users */}
            {!isAuthenticated && (
              <div className="text-sm text-gray-500 mt-2">
                <p>Login to edit, download, or share this brief.</p>
              </div>
            )}
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2 rounded-sm sm:w-auto justify-center"
                  onClick={handleEditClick}
                >
                  <Edit className="h-4 w-4" />
                  Edit Brief
                </Button>
              </DialogTrigger>
              {isAuthenticated && (
                <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto text-left">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-left">
                      Edit Project Brief
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      Make changes to the project brief here. Click save when you're
                      done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {Object.entries(editData).map(([key, value]) => {
                      // Skip certain technical fields that shouldn't be edited
                      if (key === 'briefId' || 
                          key === 'createdAt' || 
                          key === 'updatedAt' ||
                          key === 'recordType' ||
                          key === 'userId' ||
                          key === 'title') return null;
                      
                      // Skip non-editable objects
                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        return null;
                      }
                      
                      // Format the field name for display
                      const fieldName = key
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <div key={key} className="grid gap-2">
                          <Label htmlFor={key} className="text-left">
                            {fieldName} {Array.isArray(value) && '(one per line)'}
                          </Label>
                          {Array.isArray(value) ? (
                            <Textarea
                              id={key}
                              value={value.join('\n')}
                              onChange={(e) => handleEditChange(key, e.target.value)}
                              rows={3}
                              className="text-left"
                            />
                          ) : (
                            <Input
                              id={key}
                              value={value || ''}
                              onChange={(e) => handleEditChange(key, e.target.value)}
                              className="text-left"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <DialogFooter className="text-left">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              )}
            </Dialog>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
