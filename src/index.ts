export interface LinkupSearchParams {
    query: string;
    depth?: 'standard' | 'deep';
    outputType?: 'searchResults' | 'sourcedAnswer' | 'structured';
    structuredOutputSchema?: string;
    includeImages?: boolean;
    fromDate?: string;
    toDate?: string;
    includeDomains?: string[];
    excludeDomains?: string[];
  }
  
  export interface LinkupSource {
    name: string;
    url: string;
    snippet: string;
  }
  
  export interface LinkupImage {
    url: string;
    title?: string;
    description?: string;
  }
  
  export interface LinkupSearchResultsResponse {
    results: string;
    sources: LinkupSource[];
    images?: LinkupImage[];
  }
  
  export interface LinkupSourcedAnswerResponse {
    answer: string;
    sources: LinkupSource[];
    images?: LinkupImage[];
  }
  
  export type LinkupSearchResult = 
    | LinkupSearchResultsResponse 
    | LinkupSourcedAnswerResponse 
    | Record<string, any>;
  
  export async function linkupSearch(
    params: LinkupSearchParams
  ): Promise<LinkupSearchResult> {
    const apiKey = process.env.LINKUP_API_KEY;
    
    if (!apiKey) {
      throw new Error('LINKUP_API_KEY environment variable is not set');
    }
  
    const apiUrl = 'https://api.linkup.so/v1/search';
  
    // Build request body with all parameters
    const requestBody: Record<string, any> = {
      q: params.query,
      depth: params.depth || 'standard',
      outputType: params.outputType || 'sourcedAnswer',
    };
  
    // Add optional parameters if provided
    if (params.structuredOutputSchema) {
      requestBody.structuredOutputSchema = params.structuredOutputSchema;
    }
    
    if (params.includeImages !== undefined) {
      requestBody.includeImages = params.includeImages.toString();
    }
    
    if (params.fromDate) {
      requestBody.fromDate = params.fromDate;
    }
    
    if (params.toDate) {
      requestBody.toDate = params.toDate;
    }
    
    if (params.includeDomains && params.includeDomains.length > 0) {
      requestBody.includeDomains = params.includeDomains;
    }
    
    if (params.excludeDomains && params.excludeDomains.length > 0) {
      requestBody.excludeDomains = params.excludeDomains;
    }
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Linkup API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      
      // Return based on output type
      const outputType = params.outputType || 'sourcedAnswer';
      
      if (outputType === 'structured') {
        // Return structured data as-is
        return data;
      } else if (outputType === 'searchResults') {
        // Format search results
        const sources = (data.results || []).map((result: any) => ({
          name: result.name || result.title || 'Unknown',
          url: result.url || '',
          snippet: result.content || result.snippet || result.description || ''
        }));
        
        const images = data.images ? data.images.map((img: any) => ({
          url: img.url,
          title: img.title,
          description: img.description
        })) : undefined;
  
        return {
          results: data.results || 'No results found',
          sources,
          images
        };
      } else {
        // Format sourced answer
        const sources = (data.sources || []).map((source: any) => ({
          name: source.name || source.title || 'Unknown',
          url: source.url || '',
          snippet: source.snippet || source.description || ''
        }));
        
        const images = data.images ? data.images.map((img: any) => ({
          url: img.url,
          title: img.title,
          description: img.description
        })) : undefined;
  
        return {
          answer: data.answer || 'No answer found',
          sources,
          images
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search with Linkup: ${error.message}`);
      }
      throw error;
    }
  }