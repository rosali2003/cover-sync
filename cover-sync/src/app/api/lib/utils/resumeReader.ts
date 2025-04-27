import * as pdfjsLib from "pdfjs-dist";

export class PdfReader {
  async extractText(file: Buffer): Promise<string> {
    try {
      // Convert Buffer to Uint8Array
      const uint8Array = new Uint8Array(file);

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      let fullText = "";

      // Extract text from each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + " ";
      }

      // Basic cleanup
      const text = fullText
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return text;
    } catch (error) {
      console.error("Error reading PDF:", error);
      throw new Error("Failed to read PDF file");
    }
  }
}
