
import {genkit} from 'genkit';

// Since no flows are using generative AI models anymore,
// the googleAI plugin and the GEMINI_API_KEY are not required.
// This simplifies setup and prevents startup errors if the key is missing.
export const ai = genkit({
  plugins: [],
});
