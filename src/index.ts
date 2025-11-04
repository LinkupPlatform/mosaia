import toolCall from "./tool-call";

type RawEvent = {
    body: string;
}

type ParsedEvent = {
    args: Record<string, string>;
    secrets: Record<string, string>;
}

export async function handler(event: RawEvent) {
    const {
        args,
        secrets: {
            LINKUP_API_KEY
        }
    } = JSON.parse(event.body) as ParsedEvent;
    
    // Set the API key from secrets
    process.env.LINKUP_API_KEY = LINKUP_API_KEY;
    
    try {
        const result = await toolCall(args);
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
