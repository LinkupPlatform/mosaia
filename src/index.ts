import toolCall from "./tool-call";

type RawEvent = {
    body: string;
}

type ParsedEvent = {
    args: Record<string, string>;
    secrets: Record<string, string>;
}

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

export async function handler(event: RawEvent) {
    const {
        args,
        secrets: {
            LINKUP_API_KEY
        }
    } = JSON.parse(event.body) as ParsedEvent;

    // Set the API key from secrets as an environment variable
    if (LINKUP_API_KEY) {
        process.env.LINKUP_API_KEY = LINKUP_API_KEY;
    }

    try {
        // Parse search parameters from args
        const searchParams: LinkupSearchParams = {
            query: args.query || '',
            depth: args.depth as 'standard' | 'deep' | undefined,
            outputType: args.outputType as 'searchResults' | 'sourcedAnswer' | 'structured' | undefined,
            structuredOutputSchema: args.structuredOutputSchema,
            includeImages: args.includeImages === 'true' || args.includeImages === '1',
            fromDate: args.fromDate,
            toDate: args.toDate,
            includeDomains: args.includeDomains ? JSON.parse(args.includeDomains) : undefined,
            excludeDomains: args.excludeDomains ? JSON.parse(args.excludeDomains) : undefined,
        };

        // Validate required parameter
        if (!searchParams.query) {
            return {
                statusCode: 400,
                body: JSON.stringify('Missing required parameter: query'),
            };
        }

        const result = await toolCall(searchParams);

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error: unknown) {
        let message = '';

        if (error instanceof Error) {
            message = error.message;
        } else {
            message = 'Unknown error';
        }

        return {
            statusCode: 500,
            body: JSON.stringify(message),
        };
    }
}