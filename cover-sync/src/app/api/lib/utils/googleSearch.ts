import axios from "axios";

export class GoogleCustomSearch {
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || "";
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || "";
  }

  async search(query: string, numResults: number = 5) {
    try {
      const response = await axios.get(
        "https://www.googleapis.com/customsearch/v1",
        {
          params: {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            num: numResults,
          },
        }
      );

      return response.data.items || [];
    } catch (error) {
      console.error("Google Search API error:", error);
      return [];
    }
  }
}
