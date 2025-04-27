"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TextContent } from "pdfjs-dist/types/src/display/api";
import * as pdfjsLib from "pdfjs-dist";
import { truncateWords } from "../utils/truncate";
import { PdfReader } from "@/app/api/lib/utils/resumeReader";

// Initialize PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
}

interface ResumeUploaderProps {
  onResumeProcessed: (text: string) => void;
}

export const ResumeUploader = ({ onResumeProcessed }: ResumeUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [resumeText, setResumeText] = useState<string>("");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setStatus("");
      console.log("selectedFile", file);
      await handlePdfParse(selectedFile);
    } else {
      setFile(null);
      setStatus("Please select a PDF file");
    }
  };

  const handlePdfParse = async (pdfFile: File) => {
    setIsProcessing(true);
    setStatus("Processing PDF...");

    try {
      // Convert File to Buffer
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use PdfReader to extract text
      const pdfReader = new PdfReader();
      const fullText = await pdfReader.extractText(buffer);
      console.log("Full text:", fullText);

      // Truncate the text
      const truncatedText = truncateWords(fullText, 4000);
      console.log("Extracted and truncated text:", truncatedText);

      setResumeText(truncatedText);
      onResumeProcessed(truncatedText);
      setStatus("Resume processed successfully!");
    } catch (error) {
      setStatus("Failed to process PDF. Please try again.");
      console.error("PDF parsing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
        <CardDescription>Upload your resume in PDF format</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
          {status && (
            <p
              className={`text-sm ${
                status.includes("success")
                  ? "text-green-600"
                  : status.includes("Failed")
                  ? "text-red-600"
                  : "text-blue-600"
              }`}
            >
              {status}
            </p>
          )}
          {resumeText && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Extracted Text:</h3>
              <div className="max-h-60 overflow-y-auto bg-gray-50 p-4 rounded text-sm">
                {resumeText}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
