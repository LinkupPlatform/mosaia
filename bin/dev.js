const dotenv = require('dotenv');
const express = require('express');
const { handler } = require('../dist/tool-call');

dotenv.config();

const app = express();

const { LINKUP_API_KEY, PORT } = process.env;

if(LINKUP_API_KEY === undefined) {
    console.log('`LINKUP_API_KEY` not set. Please set your Linkup API key.');
    process.exit(1);
}

app.get('/', async (req, res) => {
    const { query, depth, outputType, includeImages, fromDate, toDate, includeDomains, excludeDomains } = req.query;

    try {
        const result = await handler({
            query: query || 'What is the capital of France?',
            depth: depth || 'standard',
            outputType: outputType || 'sourcedAnswer',
            includeImages: includeImages === 'true',
            fromDate: fromDate,
            toDate: toDate,
            includeDomains: includeDomains ? includeDomains.split(',') : undefined,
            excludeDomains: excludeDomains ? excludeDomains.split(',') : undefined
        });

        res.status(200).send(result);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

const port = PORT || 3000;
app.listen(port, () => {
    console.log(`Local development server running on port ${port}`);
});
