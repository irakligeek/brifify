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
  RefreshCw,
  FileDown,
  Copy,
  Check,
  FileIcon,
  Link2,
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

export default function ProjectBrief({ initialData }) {
  const { updateBrief, generateNewBrief, anonymousUser } = useBrief();
  const [briefData, setBriefData] = useState({
    ...initialData,
    technical_requirements: initialData?.technical_requirements || [],
    technology_stack: initialData?.technology_stack || [],
  });
  const [editData, setEditData] = useState({
    ...initialData,
    technical_requirements: initialData?.technical_requirements || [],
    technology_stack: initialData?.technology_stack || [],
  });
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const briefRef = useRef(null);

  const handleEditChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: Array.isArray(editData[field])
        ? value.split('\n').filter(item => item.trim() !== '')
        : value
    });
  };

  const handleSave = () => {
    setBriefData(editData);
    updateBrief(editData);
    setOpen(false);
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
      await shareBrief({briefData});
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setTimeout(() => setSharing(false), 2000);
    }
  };

  const handleGenerateNewBrief = () => {
    generateNewBrief();
  };

  if (!briefData) {
    return <div className="text-left p-4">No project brief data provided.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 text-left space-y-4">
      <h1 className="text-3xl md:text-4xl pb-8 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent font-heading tracking-tight">
        ✨ Your Technical Brief Is Ready
      </h1>
      <Card className="shadow-l pt-0" ref={briefRef}>
        <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 border-b text-left pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              <CardTitle className="text-slate-800 text-left font-heading">
                {briefData.project_title}
              </CardTitle>
            </div>
            <CardDescription className="text-sm font-medium text-slate-500 text-left">
              Platform: {briefData.platform}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-2 text-left">
          <div className="space-y-6">
            {Object.entries(briefData).map(([key, value]) => {
              // Skip empty arrays or undefined/null values
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              // Format the field name for display
              const fieldName = key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              return (
                <div key={key}>
                  <h3 className="text-sm font-medium text-slate-500 mb-2 text-left">
                    {fieldName}
                  </h3>
                  {Array.isArray(value) ? (
                    <ul className="list-disc pl-5 space-y-1 text-left">
                      {value.map((item, index) => (
                        <li key={index} className="text-slate-700 text-left">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-700 text-left">
                      {value}
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
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
