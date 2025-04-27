import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchPageContent } from "../lib/utils/pageParser";
import { crawlPage } from "../lib/utils/crawler";
import { GoogleCustomSearch } from "../lib/utils/googleSearch";
import { RagProcessor } from "../lib/utils/ragProcessor";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

function ensureValidUrl(urlString: string): URL {
  // Clean up the URL string
  let cleanedUrl = urlString.trim();

  // Remove any duplicate protocol prefixes
  cleanedUrl = cleanedUrl.replace(/^(https?:\/\/)+/, "https://");

  // If no protocol is present, add https://
  if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
    cleanedUrl = `https://${cleanedUrl}`;
  }

  try {
    return new URL(cleanedUrl);
  } catch (error) {
    console.error("Invalid URL:", cleanedUrl);
    throw new Error("Invalid URL provided");
  }
}

interface PageContents {
  [key: string]: string;
}

async function analyzeContent(content: string, searchContext?: string) {
  try {
    const contextPrompt = searchContext
      ? `Additional context from web search:\n${searchContext}\n\n`
      : "";

    const prompt = `You are a professional career advisor. Analyze this company page content and extract key information for a cover letter.

    ${contextPrompt}Analyze this content and extract:
    1) Company values and culture
    2) Key requirements and qualifications
    3) Responsibilities and expectations

    Content: ${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
}

async function generateCoverLetter(
  companyInfo: string,
  jobInfo: string,
  candidateInfo: string,
  searchContext?: string
) {
  try {
    const contextPrompt = searchContext
      ? `Additional company research:\n${searchContext}\n\n`
      : "";

    const prompt = `You are a professional cover letter writer. Create a compelling cover letter based on this information:

    ${contextPrompt}Company Information: ${companyInfo}
    Job Information: ${jobInfo}
    Candidate Information: ${candidateInfo}
    Format the cover letter professionally with proper spacing and paragraphs.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
}

const foundPaths = async (baseUrl: URL) => {
  try {
    console.log("crawling in generate cv base url", baseUrl);
    const paths = await crawlPage(baseUrl.toString(), baseUrl.toString());
    return (
      paths.filter((path: string) => {
        const lowercasePath = path.toLowerCase();
        return (
          lowercasePath.includes("career") ||
          lowercasePath.includes("jobs") ||
          lowercasePath.includes("positions") ||
          lowercasePath.includes("opportunities") ||
          lowercasePath.includes("about")
          // lowercasePath.includes("blog")
        );
      }) ?? []
    );
  } catch (error) {
    console.error("Error crawling page:", error);
  }
};

export async function POST(request: Request) {
  try {
    if (!request.body) {
      return NextResponse.json(
        {
          success: false,
          error: "No request body provided",
        },
        { status: 400 }
      );
    }

    const { company_applying_for, resumeText } = await request.json();
    console.log("resume text", resumeText);
    console.log("url", company_applying_for);
    const url = ensureValidUrl(company_applying_for);

    // Initialize RAG components
    const searchClient = new GoogleCustomSearch();
    const ragProcessor = new RagProcessor();

    // Perform company research using RAG
    const companySearchQuery = `${url.hostname} company culture values mission`;
    const searchResults = await searchClient.search(companySearchQuery);
    const processedContext = await ragProcessor.processSearchResults(
      searchResults
    );

    const paths = await foundPaths(url);
    const pageContents: PageContents = {};

    if (paths) {
      for (const path of paths) {
        try {
          // Handle both absolute and relative paths
          const fullUrl = path.startsWith("http")
            ? path
            : new URL(path, url.origin).toString();
          const content = await fetchPageContent(fullUrl);
          if (content) {
            pageContents[path] = content;
          }
        } catch (error) {
          console.error(`Error processing path ${path}:`, error);
          continue;
        }
      }
    }
    console.log("paths", paths);
    const aboutPath = paths?.find((path) =>
      path.toLowerCase().includes("about")
    );
    const careersPath = paths?.find((path) =>
      path.toLowerCase().includes("career")
    );

    const aboutAnalysis = aboutPath
      ? await analyzeContent(pageContents[aboutPath], processedContext)
      : null;
    const careersAnalysis = careersPath
      ? await analyzeContent(pageContents[careersPath], processedContext)
      : null;

    const candidateAnalysis = await analyzeContent(resumeText);

    let coverLetter = null;
    console.log("generating cover letter");
    console.log("about analysis", aboutAnalysis);
    console.log("careers analysis", careersAnalysis);
    if (aboutAnalysis && careersAnalysis) {
      console.log("about analysis", aboutAnalysis);
      coverLetter = await generateCoverLetter(
        aboutAnalysis,
        careersAnalysis,
        candidateAnalysis ?? "",
        processedContext
      );
      console.log("cover letter", coverLetter);
    }

    return NextResponse.json({
      success: true,
      analysis: {
        about: aboutAnalysis,
        careers: careersAnalysis,
        candidate: candidateAnalysis,
        searchContext: processedContext,
      },
      body: coverLetter,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate cover letter",
      },
      { status: 500 }
    );
  }
}
