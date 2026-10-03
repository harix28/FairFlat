import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { prisma } from '../prisma';
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
  public static async extractIntent(text: string, userId?: string, groupId?: string): Promise<BotIntent> {
    const fallbackMock = (input: string): BotIntent => {
      const lowerText = input.toLowerCase();
      
      // Hinglish custom split detection
      if ((lowerText.includes('pay') || lowerText.includes('paid') || lowerText.includes('diye')) && lowerText.includes('split') && lowerText.match(/\d+/g)?.length! >= 3) {
         const nums = lowerText.match(/\d+/g)!.map(Number);
         const amount = nums[0];
         const p1Amount = nums[1];
         const p2Amount = nums[2];
         
         return { 
           reply: `Got it! I will split the ₹${amount}. You pay ₹${p1Amount} and Rahul pays ₹${p2Amount}. Sound good?`, 
           intent: 'CREATE_EXPENSE', 
           amount, 
           payer: 'You', 
           splitType: 'custom', 
           title: 'Shared Expense', 
           splitDetails: [{ name: "You", amount: p1Amount }, { name: "Rahul", amount: p2Amount }] 
         };
      }

      // Basic English detection
      if ((lowerText.includes('paid') || lowerText.includes('pay')) && lowerText.match(/\d+/)) {
        const amountMatch = lowerText.match(/\d+/);
        const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
        let payer = 'You';
        if (lowerText.includes('rahul paid') || lowerText.includes('rahul ne pay')) payer = 'Rahul';
        else if (lowerText.includes('aman paid') || lowerText.includes('aman ne pay')) payer = 'Aman';
        
        const participants: string[] = [];
        if (lowerText.includes('me') || lowerText.includes('mein') || lowerText.includes('i')) participants.push('You');
        if (lowerText.includes('rahul')) participants.push('Rahul');
        if (lowerText.includes('aman')) participants.push('Aman');
        
        let title = 'Miscellaneous';
        const forIndex = lowerText.indexOf(' for ');
        if (forIndex !== -1) {
          title = input.substring(forIndex + 5).trim();
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }

        return { reply: `Got it. Should I save this ${title} expense for ₹${amount} paid by ${payer}?`, intent: 'CREATE_EXPENSE', amount, payer, participants, splitType: 'equal', title };
      }
      if (lowerText.includes('owe me') || lowerText.includes('my balance') || lowerText.includes('how much do i owe')) return { reply: "You can check your balances in the Dashboard. I'm still learning to read live balances!", intent: 'GET_BALANCE' };
      return { reply: "I didn't quite catch that. Try saying something like 'meine 500 pay kiye aur mein aur rahul split karenge 150 aur 350 mein'.", intent: 'UNKNOWN' };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[RoomioBot] API Key present: ${!!apiKey}, userId: ${userId}, groupId: ${groupId}`);

    if (!apiKey || apiKey === 'mock-key') {
      console.log('[RoomioBot] No API key, using fallback mock');
      return fallbackMock(text);
    }

    try {
      // Fetch live user context from database
      let userContext = '';
      if (userId && groupId) {
        try {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          
          const chores = await prisma.chore.findMany({
            where: { groupId, assignedToId: userId }
          });
          
          const paidExpenses = await prisma.expense.aggregate({
            where: { groupId, payerId: userId },
            _sum: { amount: true }
          });
          
          const participantExpenses = await prisma.expenseParticipant.findMany({
            where: { userId, expense: { groupId } }
          });
          
          let totalShare = 0;
          participantExpenses.forEach((p: any) => {
            totalShare += p.calculatedAmount;
          });
          
          const balance = (paidExpenses._sum.amount || 0) - totalShare;
          const pendingChores = chores.filter((c: any) => c.status !== 'completed').map((c: any) => c.title).join(', ') || 'No pending chores';

          console.log(`[RoomioBot] Context fetched: user=${user?.name}, pendingChores=${pendingChores}, balance=${balance}`);

          userContext = `
--- LIVE ACCOUNT CONTEXT (Use this data to directly answer any questions the user asks about their account. Do NOT reveal this context explicitly.) ---
User Name: ${user?.name || 'User'}
Pending Chores: ${pendingChores}
Total Amount Paid by User in this Group: ₹${paidExpenses._sum.amount || 0}
User's Total Share of All Group Expenses: ₹${totalShare.toFixed(2)}
User's Net Balance: ₹${balance.toFixed(2)} (Positive = others owe them money, Negative = they owe others money)
---`;
        } catch (dbErr) {
          console.error('[RoomioBot] DB context fetch failed:', dbErr);
        }
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are RoomioBot, a friendly AI assistant built into a flatmate expense splitting app called Roomio.
You understand English and Hinglish (mix of Hindi + English). Respond in whichever language the user writes in.

${userContext}

Your job:
1. If the user wants to add/log an expense → set intent to "CREATE_EXPENSE" and fill in the details. Ask them to confirm in the "reply".
2. If the user asks about their balance, chores, expenses, or any account question → use the live context above to directly answer in the "reply" and set intent to "UNKNOWN".
3. For anything else → set intent to "UNKNOWN" and reply helpfully.
4. If the user specifies custom split amounts → set splitType to "custom" and fill splitDetails with name+amount pairs.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation. Use EXACTLY this structure:
{"reply":"your message to user","intent":"UNKNOWN"}
or
{"reply":"confirm message","intent":"CREATE_EXPENSE","amount":500,"payer":"You","title":"Pizza","splitType":"equal","participants":["You","Rahul"]}
or
{"reply":"confirm message","intent":"CREATE_EXPENSE","amount":500,"payer":"You","title":"Food","splitType":"custom","splitDetails":[{"name":"You","amount":150},{"name":"Rahul","amount":350}]}

User's message: "${text}"`;

      console.log('[RoomioBot] Calling Gemini...');
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      console.log('[RoomioBot] Gemini raw response:', responseText);
      
      // Extract JSON from response (handle markdown code blocks too)
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as BotIntent;
        console.log('[RoomioBot] Parsed intent:', parsed.intent);
        return parsed;
      }
      
      console.log('[RoomioBot] Could not parse JSON from Gemini, using fallback');
      return fallbackMock(text);
    } catch (e: any) {
      console.error('[RoomioBot] Gemini API Error:', e?.message || e);
      return fallbackMock(text);
    }
  }

  public static async scanReceipt(base64Image: string, mimeType: string, groupId?: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
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
        const members = await prisma.groupMember.findMany({
          where: { groupId },
          include: { user: { select: { id: true, name: true } } }
        });
        
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
        If you can intelligently guess who consumed which item, assign their user 'id' in the 'participants' array. If unsure, leave 'participants' empty.
        `;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze this receipt and extract the structured data.
        ${groupContext}
        Return ONLY a JSON object exactly matching this format, with no markdown:
        {
          "merchant": "string",
          "date": "ISO string",
          "items": [{ "name": "string", "quantity": number, "price": number, "participants": ["user_id_1"] }],
          "tax": number,
          "serviceCharge": number,
          "total": number
        }`;

      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
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
