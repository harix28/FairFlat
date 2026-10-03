import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

export interface BotIntent {
  reply?: string;
  intent: 'CREATE_EXPENSE' | 'GET_BALANCE' | 'UNKNOWN';
  amount?: number;
  category?: string;
  title?: string;
  payer?: string;
  participants?: string[];
  splitType?: string;
  splitDetails?: { name: string, amount: number }[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

export class RoomioBotService {
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
        return { reply: `Got it. Should I save this ${title} expense for ₹${amount} paid by ${payer}?`, intent: 'CREATE_EXPENSE', amount, payer, participants, splitType: 'equal', title };
      }
      if (lowerText.includes('owe me') || lowerText.includes('my balance') || lowerText.includes('how much do i owe')) return { reply: "You can check your balances in the Dashboard. I'm still learning to read live balances!", intent: 'GET_BALANCE' };
      return { reply: "I didn't quite catch that. Try saying something like 'I paid 500 for pizza'.", intent: 'UNKNOWN' };
    };

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      return fallbackMock(text);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are a highly intelligent and conversational AI assistant for an expense splitting app called Roomio.
        The user is talking to you in a mix of English and Hinglish (Hindi + English). You must understand casual phrases like "meine pay kiye" (I paid) or "split karenge" (we will split).
        You must provide a helpful and conversational "reply" directed at the user, and also extract the structured "intent" from the user's message.
        Possible intents: CREATE_EXPENSE, GET_BALANCE, UNKNOWN.
        
        If the user wants to add an expense, set the intent to CREATE_EXPENSE, fill in the details, and write a "reply" asking them to confirm the action.
        If the user specifies custom split amounts (e.g., "mein aur rahul split karenge 150 aur 350 mein"), set splitType to "custom" and populate the "splitDetails" array mapping names to amounts.

        Return ONLY a JSON object EXACTLY matching this structure. Example:
        { "reply": "Hello! I am RoomioBot. How can I help you manage your expenses today?", "intent": "UNKNOWN" }
        { "reply": "Got it! Should I save this pizza expense for ₹500 paid by Hari?", "intent": "CREATE_EXPENSE", "amount": 500, "payer": "Hari", "participants": ["Hari", "Rahul"], "splitType": "equal", "title": "Pizza" }
        { "reply": "Sure, I'll split the ₹500. Hari pays ₹150 and Rahul pays ₹350. Sound good?", "intent": "CREATE_EXPENSE", "amount": 500, "payer": "You", "splitType": "custom", "title": "Miscellaneous", "splitDetails": [{ "name": "Hari", "amount": 150 }, { "name": "Rahul", "amount": 350 }] }
        
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

  public static async scanReceipt(base64Image: string, mimeType: string, groupId?: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      // Mock fallback
      return {
        merchant: 'Mock AI Restaurant',
        date: new Date().toISOString(),
        items: [
          { name: 'Pizza', quantity: 1, price: 800, participants: [] },
          { name: 'Burger', quantity: 1, price: 400, participants: [] },
          { name: 'Drinks', quantity: 2, price: 300, participants: [] }
        ],
        tax: 200,
        serviceCharge: 100,
        total: 1800
      };
    }

    try {
      let groupContext = '';
      if (groupId) {
        // dynamic import of prisma to avoid circular dependency issues at top level
        const { prisma } = require('../prisma');
        const members = await prisma.groupMember.findMany({
          where: { groupId },
          include: { user: { select: { id: true, name: true } } }
        });
        
        // Fetch past itemized expenses to determine habits
        const recentExpenses = await prisma.expense.findMany({
          where: { groupId, splitType: 'itemized' },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                participants: {
                  include: { user: { select: { name: true, id: true } } }
                }
              }
            }
          }
        });

        const memberInfo = members.map((m: any) => `{ id: "${m.user.id}", name: "${m.user.name}" }`).join(', ');
        
        let habitString = '';
        if (recentExpenses.length > 0) {
          habitString = 'Past household habits for reference:\n';
          recentExpenses.forEach((exp: any) => {
            exp.items.forEach((item: any) => {
               const pNames = item.participants.map((p: any) => p.user.name).join(' and ');
               if (pNames) {
                 habitString += `- "${item.name}" is typically consumed/paid by ${pNames}.\n`;
               }
            });
          });
        }

        groupContext = `
        The user is scanning a receipt for a group. Here are the group members: [${memberInfo}].
        ${habitString}
        If you can intelligently guess who consumed which item (e.g., based on the past household habits provided, or if the item explicitly has someone's name on it in the receipt), assign their user 'id' in the 'participants' array for that item. If unsure, leave the 'participants' array empty for that item, and the frontend will default to all members.
        `;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze this receipt and extract the structured data.
        ${groupContext}
        
        Return ONLY a JSON object exactly matching this format, with no markdown formatting around it:
        {
          "merchant": "string",
          "date": "ISO string",
          "items": [
            { "name": "string", "quantity": number, "price": number, "participants": ["user_id_1", "user_id_2"] }
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
