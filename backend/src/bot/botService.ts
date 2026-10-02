import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

export interface BotIntent {
  intent: 'CREATE_EXPENSE' | 'GET_BALANCE' | 'UNKNOWN';
  amount?: number;
  category?: string;
  title?: string;
  payer?: string;
  participants?: string[];
  splitType?: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

export class FairBotService {
  public static async extractIntent(text: string): Promise<BotIntent> {
    const fallbackMock = (input: string): BotIntent => {
      const lowerText = input.toLowerCase();
      if (lowerText.includes('paid') && lowerText.match(/\d+/)) {
        const amountMatch = lowerText.match(/\d+/);
        const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
        let payer = 'You';
        if (lowerText.includes('rahul paid')) payer = 'Rahul';
        else if (lowerText.includes('aman paid')) payer = 'Aman';
        
        const participants = [];
        if (lowerText.includes('me')) participants.push('Hari');
        if (lowerText.includes('rahul')) participants.push('Rahul');
        if (lowerText.includes('aman')) participants.push('Aman');
        
        let title = 'Miscellaneous';
        const forIndex = lowerText.indexOf(' for ');
        if (forIndex !== -1) {
          title = input.substring(forIndex + 5).trim();
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }

        // If they didn't specify anyone, default to "everyone" in a real app, but for now just empty array which gets handled by frontend
        return { intent: 'CREATE_EXPENSE', amount, payer, participants, splitType: 'equal', title };
      }
      if (lowerText.includes('owe me') || lowerText.includes('my balance') || lowerText.includes('how much do i owe')) return { intent: 'GET_BALANCE' };
      return { intent: 'UNKNOWN' };
    };

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      return fallbackMock(text);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are an AI assistant for an expense splitting app called FairFlat.
        Extract the structured intent from the user's message.
        Possible intents: CREATE_EXPENSE, GET_BALANCE, UNKNOWN.
        Return ONLY a JSON object. Example:
        { "intent": "CREATE_EXPENSE", "amount": 2400, "payer": "Hari", "participants": ["Hari", "Rahul"], "splitType": "equal" }
        
        User message: "${text}"
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
         const jsonStr = match[0];
         const parsed = JSON.parse(jsonStr) as BotIntent;
         if (parsed.intent !== 'UNKNOWN') return parsed;
      }
      
      // If Gemini returned UNKNOWN or failed to parse, try fallback
      return fallbackMock(text);
    } catch (e) {
      console.error('Gemini API Error:', e);
      return fallbackMock(text);
    }
  }

  public static async scanReceipt(base64Image: string, mimeType: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      // Mock fallback
      return {
        merchant: 'Mock AI Restaurant',
        date: new Date().toISOString(),
        items: [
          { name: 'Pizza', quantity: 1, price: 800 },
          { name: 'Burger', quantity: 1, price: 400 },
          { name: 'Drinks', quantity: 2, price: 300 }
        ],
        tax: 200,
        serviceCharge: 100,
        total: 1800
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze this receipt and extract the structured data.
        Return ONLY a JSON object exactly matching this format, with no markdown formatting around it:
        {
          "merchant": "string",
          "date": "ISO string",
          "items": [
            { "name": "string", "quantity": number, "price": number }
          ],
          "tax": number,
          "serviceCharge": number,
          "total": number
        }
      `;

      const imageParts = [
        {
          inlineData: {
            data: base64Image,
            mimeType
          }
        }
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = result.response.text().trim();
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Gemini API Error (Scan):', e);
      throw new Error('Failed to parse receipt');
    }
  }
}
