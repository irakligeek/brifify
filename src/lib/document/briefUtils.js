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
    // Skip project_title as it's already handled
    if (
      key === "project_title" ||
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
    // Skip project_title as it's already handled
    if (
      key === "project_title" ||
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
      // Skip project_title as it's already handled
      if (
        key === "project_title" ||
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

    await navigator.clipboard.writeText(formattedText);
    toast("Project brief has been copied");
    return true;
  } catch (err) {
    toast.error("Could not copy to clipboard. Please try again.");
    console.error("Copy failed:", err);
    return false;
  }
};

export const shareBrief = async ({ briefData }) => {
  try {
    // Get anonymous user data from localStorage
    const anonymousUser = JSON.parse(localStorage.getItem('brifify_anonymous_user') || '{}');
    
    const response = await axios.post(
      "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/share-brief",
      {
        briefData,
        userId: anonymousUser?.id
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const url = JSON.parse(response.data.body)?.url;
    await navigator.clipboard.writeText(url);
    toast.success("Share URL copied to clipboard");
    return true;
  } catch (err) {
    console.error("Share failed:", err);
    toast.error("Failed to generate share URL");
    return false;
  }
};
