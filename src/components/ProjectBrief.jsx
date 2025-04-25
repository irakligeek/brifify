import { useState, useRef } from "react";
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
  const { updateBrief, generateNewBrief, saveBrief } = useBrief();
  const { user, isAuthenticated } = useAuth();
  
  // Process the initial data structure to handle both flat and nested formats
  const processInitialData = (data) => {
    // If briefData exists and contains project data, use that as the primary source
    if (data?.briefData) {
      return {
        ...data.briefData,
        // Include top-level metadata
        briefId: data.briefId || data.briefData.briefId,
        title: data.title || data.briefData.project_title,
        createdAt: data.createdAt || data.briefData.createdAt || data.updatedAt,
      };
    }
    // Otherwise use the flat structure
    return data;
  };
  
  const processedInitialData = processInitialData(initialData);
  
  const [briefData, setBriefData] = useState(processedInitialData);
  const [editData, setEditData] = useState(processedInitialData);
  
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const briefRef = useRef(null);

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
        isAuthenticated
      });
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setTimeout(() => setSharing(false), 2000);
    }
  };

  if (!briefData) {
    return <div className="text-left p-4">No project brief data provided.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 text-left space-y-4">
      <Card className="shadow-l pt-0" ref={briefRef}>
        <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 border-b text-left pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              <CardTitle className="text-slate-800 text-left font-heading">
                {briefData.project_title || "Untitled Project"}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end">
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
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 rounded-sm sm:w-auto justify-center">
                <Edit className="h-4 w-4" />
                Edit Brief
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto text-left">
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
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
