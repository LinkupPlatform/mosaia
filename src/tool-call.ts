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

async function linkupSearch(
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

/**
 * Main tool function called by the handler
 * Formats the response as a string for the agent
 */
export default async function toolCall(args: Record<string, string>): Promise<string> {
    try {
        // Convert args to LinkupSearchParams
        const params: LinkupSearchParams = {
            query: args.query,
            depth: (args.depth as 'standard' | 'deep') || 'standard',
            outputType: (args.outputType as 'searchResults' | 'sourcedAnswer' | 'structured') || 'sourcedAnswer',
        };

        // Add optional parameters if they exist
        if (args.structuredOutputSchema) {
            params.structuredOutputSchema = args.structuredOutputSchema;
        }
        if (args.includeImages) {
            params.includeImages = args.includeImages === 'true';
        }
        if (args.fromDate) {
            params.fromDate = args.fromDate;
        }
        if (args.toDate) {
            params.toDate = args.toDate;
        }
        if (args.includeDomains) {
            params.includeDomains = args.includeDomains.split(',').map(d => d.trim());
        }
        if (args.excludeDomains) {
            params.excludeDomains = args.excludeDomains.split(',').map(d => d.trim());
        }

        const result = await linkupSearch(params);
        const outputType = params.outputType || 'sourcedAnswer';
        
        // Format response based on output type
        if (outputType === 'structured') {
            // Return structured data as formatted JSON
            return JSON.stringify(result, null, 2);
        } else if (outputType === 'searchResults') {
            // Format search results
            const searchResults = result as LinkupSearchResultsResponse;
            let formattedResponse = `Search Results:\n\n`;
            
            if (searchResults.sources && searchResults.sources.length > 0) {
                searchResults.sources.forEach((source, index) => {
                    formattedResponse += `${index + 1}. ${source.name}\n`;
                    formattedResponse += `   URL: ${source.url}\n`;
                    if (source.snippet) {
                        formattedResponse += `   ${source.snippet}\n`;
                    }
                    formattedResponse += '\n';
                });
            }
            
            // Add images if present
            if (searchResults.images && searchResults.images.length > 0) {
                formattedResponse += '\nImages:\n';
                searchResults.images.forEach((image, index) => {
                    formattedResponse += `${index + 1}. ${image.title || 'Image'}\n`;
                    formattedResponse += `   URL: ${image.url}\n`;
                    if (image.description) {
                        formattedResponse += `   ${image.description}\n`;
                    }
                    formattedResponse += '\n';
                });
            }
            
            return formattedResponse;
        } else {
            // Format sourced answer (default)
            const sourcedAnswer = result as LinkupSourcedAnswerResponse;
            let formattedResponse = `Answer:\n\n${sourcedAnswer.answer}\n\n`;
            
            if (sourcedAnswer.sources && sourcedAnswer.sources.length > 0) {
                formattedResponse += 'Sources:\n';
                sourcedAnswer.sources.forEach((source, index) => {
                    formattedResponse += `${index + 1}. ${source.name}\n`;
                    formattedResponse += `   URL: ${source.url}\n`;
                    if (source.snippet) {
                        formattedResponse += `   ${source.snippet}\n`;
                    }
                    formattedResponse += '\n';
                });
            }
            
            // Add images if present
            if (sourcedAnswer.images && sourcedAnswer.images.length > 0) {
                formattedResponse += '\nImages:\n';
                sourcedAnswer.images.forEach((image, index) => {
                    formattedResponse += `${index + 1}. ${image.title || 'Image'}\n`;
                    formattedResponse += `   URL: ${image.url}\n`;
                    if (image.description) {
                        formattedResponse += `   ${image.description}\n`;
                    }
                    formattedResponse += '\n';
                });
            }
            
            return formattedResponse;
        }
    } catch (error) {
        if (error instanceof Error) {
            return `Error performing search: ${error.message}`;
        }
        return 'An unknown error occurred while searching';
    }
}
