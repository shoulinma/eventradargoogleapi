require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { findBusinesses, GoogleApiError } = require('./googlePlaces');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/businesses/search', async (request, response) => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new GoogleApiError('Server is missing GOOGLE_MAPS_API_KEY.', 503);
    }

    const result = await findBusinesses({
      address: request.body?.address,
      radiusMiles: request.body?.radiusMiles ?? 5,
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    });
    response.json(result);
  } catch (error) {
    const status = error instanceof GoogleApiError ? error.status : 500;
    response.status(status).json({
      error: status === 500 ? 'An unexpected server error occurred.' : error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Business Finder is running at http://localhost:${port}`);
});
