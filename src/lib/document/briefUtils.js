import { jsPDF } from "jspdf";
import { Document, Paragraph, HeadingLevel } from "docx";
import { toast } from "sonner";
import axios from "axios";

const formatFieldName = (key) => {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const downloadBriefAsPDF = (briefData) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(briefData.project_title, 20, yPos);
  yPos += 20;

  // Iterate through all fields
  Object.entries(briefData).forEach(([key, value]) => {
    // Skip project_title, technical fields and empty values
    if (
      key === "project_title" ||
      key === "briefId" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "recordType" ||
      key === "userId" ||
      key === "title" ||
      !value ||
      (Array.isArray(value) && value.length === 0)
    ) {
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
        doc.text(item, 25, yPos);
        yPos += 7;
      });
      yPos += 3;
    } else {
      const textLines = doc.splitTextToSize(value.toString(), 170);
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

  doc.save(`${briefData.project_title.replace(/\s+/g, "_")}_brief.pdf`);
  toast.success("PDF downloaded successfully");
};

export const downloadBriefAsDOCX = async (briefData) => {
  const children = [
    new Paragraph({
      text: briefData.project_title,
      heading: HeadingLevel.HEADING_1,
      bold: true,
      size: 32,
    }),
    new Paragraph({}), // Add spacing
  ];

  // Iterate through all fields
  Object.entries(briefData).forEach(([key, value]) => {
    // Skip project_title, technical fields and empty values
    if (
      key === "project_title" ||
      key === "briefId" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "recordType" ||
      key === "userId" ||
      key === "title" ||
      !value ||
      (Array.isArray(value) && value.length === 0)
    ) {
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
        ...value.map(
          (item) =>
            new Paragraph({
              text: item,
              bullet: {
                level: 0,
              },
            })
        )
      );
    } else {
      children.push(
        new Paragraph({
          text: value.toString(),
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
    let formattedText = `${briefData.project_title}\r\n\r\n`;

    // Iterate through all fields
    Object.entries(briefData).forEach(([key, value]) => {
      // Skip project_title, technical fields and empty values
      if (
        key === "project_title" ||
        key === "briefId" ||
        key === "createdAt" ||
        key === "updatedAt" ||
        key === "recordType" ||
        key === "userId" ||
        key === "title" ||
        !value ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return;
      }

      formattedText += `${formatFieldName(key)}:\r\n`;

      if (Array.isArray(value)) {
        formattedText += value.map((item) => `• ${item}`).join("\r\n");
      } else {
        formattedText += value.toString();
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
