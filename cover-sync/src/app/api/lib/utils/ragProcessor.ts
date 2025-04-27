interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export class RagProcessor {
  async processSearchResults(results: SearchResult[]): Promise<string> {
    // Combine and format search results into useful context
    const processedResults = results
      .map(result => {
        return `
Title: ${result.title}
Summary: ${result.snippet}
Source: ${result.link}
        `.trim();
      })
      .join('\n\n');

    return processedResults;
  }
}
