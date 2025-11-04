import { 
    linkupSearch, 
    LinkupSearchParams,
    LinkupSearchResult,
    LinkupSearchResultsResponse,
    LinkupSourcedAnswerResponse
  } from './index';
  
  /**
   * Tool call function that performs the Linkup search
   * This function is called by the handler with parsed parameters
   */
  export default async function toolCall(params: LinkupSearchParams): Promise<string> {
    try {
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