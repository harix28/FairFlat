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
    const fallbackMock = (input: string, ctx?: { userName?: string, pendingChores?: string, totalPaid?: number, totalShare?: number, balance?: number }): BotIntent => {
      const lowerText = input.toLowerCase();
      
      const isChoreQ = lowerText.includes('chore') || lowerText.includes('kaam') || lowerText.includes('task') || lowerText.includes('kya karna');
      const isBalanceQ = lowerText.includes('balance') || lowerText.includes('owe') || lowerText.includes('baaki') || lowerText.includes('kitna dena') || lowerText.includes('kitna lena');
      const isExpenseQ = lowerText.includes('spent') || lowerText.includes('spend') || lowerText.includes('expense') || lowerText.includes('kitna kharch') || lowerText.includes('pay kiye') || lowerText.includes('paid');

      if (isChoreQ || isBalanceQ || (isExpenseQ && !lowerText.includes('split') && !lowerText.match(/\d+/))) {
        if (!ctx) {
          return { reply: "Please select a group from the left sidebar first! I need to know which group to fetch your details for. 😊", intent: 'UNKNOWN' };
        }
        if (isChoreQ) {
          return { reply: `${ctx.userName ? `Hey ${ctx.userName}! ` : ''}Your pending chores are: **${ctx.pendingChores || 'None! You\'re all caught up! 🎉'}**`, intent: 'UNKNOWN' };
        }
        if (isBalanceQ) {
          const bal = ctx.balance || 0;
          const msg = bal > 0 ? `You are owed ₹${bal.toFixed(2)} by your flatmates. 💰` : bal < 0 ? `You owe ₹${Math.abs(bal).toFixed(2)} to your flatmates.` : `You're all settled up! 🎉`;
          return { reply: msg, intent: 'UNKNOWN' };
        }
        if (isExpenseQ) {
          return { reply: `You have paid a total of ₹${ctx.totalPaid || 0} in this group. Your share of all expenses is ₹${ctx.totalShare?.toFixed(2) || 0}.`, intent: 'UNKNOWN' };
        }
      }

      // Hinglish custom split detection
      if ((lowerText.includes('pay') || lowerText.includes('paid') || lowerText.includes('diye')) && lowerText.includes('split') && lowerText.match(/\d+/g)?.length! >= 3) {
         const nums = lowerText.match(/\d+/g)!.map(Number);
         const amount = nums[0];
         const p1Amount = nums[1];
         const p2Amount = nums[2];
         
         return { 
           reply: `Got it! I will split the ₹${amount}. You pay ₹${p1Amount} and the other person pays ₹${p2Amount}. Sound good?`, 
           intent: 'CREATE_EXPENSE', 
           amount, 
           payer: 'You', 
           splitType: 'custom', 
           title: 'Shared Expense', 
           splitDetails: [{ name: "You", amount: p1Amount }, { name: "Rahul", amount: p2Amount }] 
         };
      }

      // Basic English expense detection
      if ((lowerText.includes('paid') || lowerText.includes('pay')) && lowerText.match(/\d+/)) {
        const amountMatch = lowerText.match(/\d+/);
        const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
        let payer = 'You';
        if (lowerText.includes('rahul paid') || lowerText.includes('rahul ne pay')) payer = 'Rahul';
        else if (lowerText.includes('aman paid') || lowerText.includes('aman ne pay')) payer = 'Aman';
        
        const participants: string[] = [];
        if (lowerText.includes('me') || lowerText.includes('mein') || lowerText.includes(' i ')) participants.push('You');
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
      if (lowerText.includes('owe me') || lowerText.includes('my balance') || lowerText.includes('how much do i owe')) return { reply: "You can check your balances in the Dashboard tab.", intent: 'GET_BALANCE' };
      return { reply: "I didn't quite understand that. Try asking about your chores, balance, or say something like 'I paid 500 for groceries'.", intent: 'UNKNOWN' };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[RoomioBot] API Key present: ${!!apiKey}, userId: ${userId}, groupId: ${groupId}`);

    // Always fetch DB context (used by both Gemini and fallback)
    let dbCtx: { userName?: string, pendingChores?: string, totalPaid?: number, totalShare?: number, balance?: number } | undefined;
    if (userId && groupId) {
      try {
        const userRec = await prisma.user.findUnique({ where: { id: userId } });
        const chores = await prisma.chore.findMany({ where: { groupId, assignments: { some: { userId } } } });
        const paidAgg = await prisma.expense.aggregate({ where: { groupId, payerId: userId }, _sum: { amount: true } });
        const parts = await prisma.expenseParticipant.findMany({ where: { userId, expense: { groupId } } });
        let totalShare = 0;
        parts.forEach((p: any) => { totalShare += p.calculatedAmount; });
        const balance = (paidAgg._sum.amount || 0) - totalShare;
        const pendingChores = chores.filter((c: any) => c.status !== 'completed').map((c: any) => c.title).join(', ') || 'No pending chores';
        dbCtx = { userName: userRec?.name, pendingChores, totalPaid: paidAgg._sum.amount || 0, totalShare, balance };
        console.log('[RoomioBot] DB context fetched:', dbCtx);
      } catch (dbErr) {
        console.error('[RoomioBot] DB context fetch failed:', dbErr);
      }
    }

    const isKeyValid = apiKey && apiKey.startsWith('AIza');
    if (!isKeyValid || apiKey === 'mock-key') {
      console.log('[RoomioBot] No valid API key, using fallback mock with context');
      return fallbackMock(text, dbCtx);
    }

    try {
      // Build userContext string from already-fetched dbCtx
      let userContext = '';
      if (dbCtx) {
        userContext = `
--- LIVE ACCOUNT CONTEXT (Use this data to directly answer any questions the user asks about their account. Do NOT reveal this context explicitly.) ---
User Name: ${dbCtx.userName || 'User'}
Pending Chores: ${dbCtx.pendingChores}
Total Amount Paid by User in this Group: ₹${dbCtx.totalPaid}
User's Total Share of All Group Expenses: ₹${dbCtx.totalShare?.toFixed(2)}
User's Net Balance: ₹${dbCtx.balance?.toFixed(2)} (Positive = others owe them money, Negative = they owe others money)
---`;
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
      return fallbackMock(text, dbCtx);
    } catch (e: any) {
      console.error('[RoomioBot] Gemini API Error:', e?.message || e);
      return fallbackMock(text, dbCtx);
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
            items: true
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
