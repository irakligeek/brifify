import { jsPDF } from "jspdf";
import { Document, Paragraph, HeadingLevel } from "docx";
import { toast } from "sonner";
import axios from "axios";

// Define metadata fields that should not be displayed or included in exports
const METADATA_FIELDS = [
  'briefId', 
  'createdAt', 
  'updatedAt',
  'recordType', 
  'timestamp',
  'userId',
  'title'
];

// Define required fields that should always be prioritized in exports
const REQUIRED_FIELDS = [
  'project_title',
  'description',
  'features'
];

const formatFieldName = (key) => {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper function to organize fields for structured display
const organizeFields = (briefData) => {
  const result = {
    required: {},
    other: {}
  };
  
  // First pass: collect required fields
  REQUIRED_FIELDS.forEach(field => {
    if (
      briefData[field] !== undefined && 
      briefData[field] !== null && 
      !(Array.isArray(briefData[field]) && briefData[field].length === 0)
    ) {
      result.required[field] = briefData[field];
    }
  });
  
  // Second pass: collect other fields
  Object.entries(briefData).forEach(([key, value]) => {
    // Skip metadata fields, required fields (already handled), and empty values
    if (
      METADATA_FIELDS.includes(key) ||
      REQUIRED_FIELDS.includes(key) ||
      value === null || 
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && !Array.isArray(value))
    ) {
      return;
    }
    
    result.other[key] = value;
  });
  
  return result;
};

export const downloadBriefAsPDF = (briefData) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Title - always use project_title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(briefData.project_title || "Untitled Project", 20, yPos);
  yPos += 20;

  // Organize fields for structured display
  const { required, other } = organizeFields(briefData);
  
  // First display required fields
  Object.entries(required).forEach(([key, value]) => {
    // Skip project_title as it's already displayed as the document title
    if (key === "project_title") {
      return;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(formatFieldName(key) + ":", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, "normal");

    if (Array.isArray(value)) {
      value.forEach((item) => {
        doc.text("•", 20, yPos);
        const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
        doc.text(itemText, 25, yPos);
        yPos += 7;
      });
      yPos += 3;
    } else {
      const textLines = doc.splitTextToSize(String(value), 170);
      doc.text(textLines, 20, yPos);
      yPos += textLines.length * 7 + 3;
    }

    yPos += 7; // Add space between sections
  });

  // Then display other fields
  Object.entries(other).forEach(([key, value]) => {
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(formatFieldName(key) + ":", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, "normal");

    if (Array.isArray(value)) {
      value.forEach((item) => {
        doc.text("•", 20, yPos);
        const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
        doc.text(itemText, 25, yPos);
        yPos += 7;
      });
      yPos += 3;
    } else {
      const textLines = doc.splitTextToSize(String(value), 170);
      doc.text(textLines, 20, yPos);
      yPos += textLines.length * 7 + 3;
    }

    yPos += 7; // Add space between sections
  });

  // Add footer with generation date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  doc.setFontSize(10);
  doc.setFont(undefined, "italic");
  doc.text(`Generated on ${formattedDate}`, 20, doc.internal.pageSize.height - 10);

  doc.save(`${(briefData.project_title || "project_brief").replace(/\s+/g, "_")}_brief.pdf`);
  toast.success("PDF downloaded successfully");
};

export const downloadBriefAsDOCX = async (briefData) => {
  const children = [
    new Paragraph({
      text: briefData.project_title || "Untitled Project",
      heading: HeadingLevel.HEADING_1,
      bold: true,
      size: 32,
    }),
    new Paragraph({}), // Add spacing
  ];

  // Organize fields for structured display
  const { required, other } = organizeFields(briefData);
  
  // First display required fields
  Object.entries(required).forEach(([key, value]) => {
    // Skip project_title as it's already displayed as the document title
    if (key === "project_title") {
      return;
    }

    children.push(
      new Paragraph({
        text: formatFieldName(key),
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 28,
      })
    );

    if (Array.isArray(value)) {
      children.push(
        ...value.map(item => {
          const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
          return new Paragraph({
            text: itemText,
            bullet: {
              level: 0,
            },
          });
        })
      );
    } else {
      children.push(
        new Paragraph({
          text: String(value),
        })
      );
    }

    children.push(new Paragraph({})); // Add spacing between sections
  });

  // Then display other fields
  Object.entries(other).forEach(([key, value]) => {
    children.push(
      new Paragraph({
        text: formatFieldName(key),
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 28,
      })
    );

    if (Array.isArray(value)) {
      children.push(
        ...value.map(item => {
          const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
          return new Paragraph({
            text: itemText,
            bullet: {
              level: 0,
            },
          });
        })
      );
    } else {
      children.push(
        new Paragraph({
          text: String(value),
        })
      );
    }

    children.push(new Paragraph({})); // Add spacing between sections
  });

  // Add footer with generation date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  children.push(
    new Paragraph({}), // Add spacing
    new Paragraph({
      text: `Generated on ${formattedDate}`,
      italic: true,
      size: 20,
    })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
};

export const copyBriefToClipboard = async (briefData) => {
  try {
    let formattedText = `${briefData.project_title || "Untitled Project"}\r\n\r\n`;

    // Organize fields for structured display
    const { required, other } = organizeFields(briefData);
    
    // First add required fields to the clipboard text
    Object.entries(required).forEach(([key, value]) => {
      // Skip project_title as it's already added as the title
      if (key === "project_title") {
        return;
      }

      formattedText += `${formatFieldName(key)}:\r\n`;

      if (Array.isArray(value)) {
        formattedText += value.map(item => {
          const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
          return `• ${itemText}`;
        }).join("\r\n");
      } else {
        formattedText += String(value);
      }

      formattedText += "\r\n\r\n";
    });

    // Then add other fields to the clipboard text
    Object.entries(other).forEach(([key, value]) => {
      formattedText += `${formatFieldName(key)}:\r\n`;

      if (Array.isArray(value)) {
        formattedText += value.map(item => {
          const itemText = typeof item === 'object' ? JSON.stringify(item) : String(item);
          return `• ${itemText}`;
        }).join("\r\n");
      } else {
        formattedText += String(value);
      }

      formattedText += "\r\n\r\n";
    });

    // Add generation date at the end
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    formattedText += `Generated on ${formattedDate}`;

    await navigator.clipboard.writeText(formattedText);
    toast("Project brief has been copied");
    return true;
  } catch (err) {
    toast.error("Could not copy to clipboard. Please try again.");
    console.error("Copy failed:", err);
    return false;
  }
};

export const shareBrief = async ({ briefData, user, isAuthenticated }) => {
  if(!isAuthenticated || !user) {
    return false;
  }

  try {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error("You must be logged in to share briefs");
      return false;
    }
    
    // Check if briefId exists - this is critical for the lambda function
    if (!briefData.briefId) {
      console.error("Missing briefId in briefData");
      toast.error("Error: Brief ID is missing");
      return false;
    }

    // Since we verified user is authenticated, we can use user data
    const userData = { 
      userId: user.sub,
      sub: user.sub,
      email: user.email
    };
    
    const response = await axios.post(
      "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/share-brief",
      {
        briefData,
        ...userData
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.idToken}`
        },
      }
    );

    // Parse the response carefully
    let url;
    try {
      const responseBody = typeof response.data.body === 'string' 
        ? JSON.parse(response.data.body) 
        : response.data.body;
      
      url = responseBody?.url;
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      toast.error("Error processing server response");
      return false;
    }
    
    if (!url) {
      console.error("No URL in response:", response.data);
      toast.error("Unable to generate share URL");
      return false;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Share URL copied to clipboard");
    return true;
  } catch (err) {
    console.error("Share failed:", err.response?.data || err.message);
    toast.error(err.response?.data?.error || "Failed to generate share URL");
    return false;
  }
};

export const editBrief = async ({ briefData, user, isAuthenticated, onContinue }) => {
  // Check if user is authenticated
  if (!isAuthenticated) {
    toast.error("You must be logged in to edit briefs");
    return false;
  }
  
  // If authenticated, proceed with edit operation
  if (typeof onContinue === 'function') {
    onContinue(briefData);
  }
  
  return true;
};

// Helper function to check if user can edit briefs
export const canEditBrief = (isAuthenticated) => {
  return isAuthenticated;
};

// Export constants for use in other components
export { METADATA_FIELDS, REQUIRED_FIELDS };
