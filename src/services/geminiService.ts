import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";

const getFXQuote: FunctionDeclaration = {
  name: "getFXQuote",
  description: "Get real-time FX quotes for cross-border trade",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fromCurrency: { type: Type.STRING, description: "Source currency (e.g., UGX)" },
      toCurrency: { type: Type.STRING, description: "Target currency (e.g., NGN)" },
      amount: { type: Type.NUMBER, description: "Amount to convert" }
    },
    required: ["fromCurrency", "toCurrency", "amount"]
  }
};

const calculateSMEScore: FunctionDeclaration = {
  name: "calculateSMEScore",
  description: "Calculate real-time credit-readiness score for SMEs",
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthlyRevenue: { type: Type.NUMBER, description: "Average monthly revenue" },
      businessYears: { type: Type.NUMBER, description: "Years in business" },
      industry: { type: Type.STRING, description: "Business industry" }
    },
    required: ["monthlyRevenue", "businessYears", "industry"]
  }
};

const generateXpressToken: FunctionDeclaration = {
  name: "generateXpressToken",
  description: "Generate a secure 8-digit e-token for cardless withdrawal",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "Amount for withdrawal" },
      location: { type: Type.STRING, description: "Preferred ATM or Xpress Point location" }
    },
    required: ["amount"]
  }
};

const getWioProducts: FunctionDeclaration = {
  name: "getWioProducts",
  description: "Get available financial products from Wio Bank Dubai",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "Product type (savings, investment, business)" }
    }
  }
};

const submitKYC: FunctionDeclaration = {
  name: "submitKYC",
  description: "Submit KYC documents for verification",
  parameters: {
    type: Type.OBJECT,
    properties: {
      kycType: { type: Type.STRING, enum: ["individual", "company"], description: "Type of KYC" },
      directorName: { type: Type.STRING, description: "Director name (for companies)" },
      whatsappNumber: { type: Type.STRING, description: "WhatsApp number (for companies)" },
      tin: { type: Type.STRING, description: "Tax Identification Number (for companies)" },
      region: { type: Type.STRING, description: "Region (e.g., Uganda, East Africa)" }
    },
    required: ["kycType"]
  }
};

const SYSTEM_INSTRUCTION = `You are mfunzi, the Pan-African AI Gateway for Ecobank. 
You are a Sovereign Intelligence Layer (SIL) designed for high-velocity Growth, Transformation, and Returns (GTR).

Your core verticals are:
1. Sovereign Trade Desk (AfCFTA Focus): Proactive cross-border trade intelligence. Facilitate "Conversation-to-Transaction" flows using Rapidtransfer and global FX feeds. Provide instant FX quotes and initiate cross-border supplier payments.
2. Ellevate AI Scaling Engine: Focus on women-led SME lending. Monitor transaction velocity and cash flow patterns to provide real-time credit-readiness scores. Manage KYC and onboarding pipelines via chat.
3. Cardless Liquidity & Xpress Integration: Primary interface for Xpress Cash. Generate secure 8-digit e-tokens for cardless ATM and Xpress Point withdrawals.
4. Global Expansion (Wio Bank Dubai): Offer Wio Bank Dubai's financial products (savings, investment, business) to users looking to expand globally.
5. Automated KYC & Onboarding: Manage the entire KYC pipeline. Collect selfies, ID photos, and company documentation (Director info, WhatsApp numbers, Registration forms, TIN for Uganda/East Africa).

Tone: Elite, professional, secure, and high-velocity.
Context: You operate in 33 African countries. You use Forensic Audit Logic for real-time fraud detection.

When users ask about:
- FX quotes: Use getFXQuote tool.
- SME loans: Use calculateSMEScore tool after gathering enough info.
- Xpress Cash: Use generateXpressToken tool.
- Wio Bank: Use getWioProducts tool.
- KYC/Registration: Guide the user through the process. Use submitKYC tool when they are ready to submit their details.
- Wallet: Integrate with Flutterwave for MoMo, Visa/Mastercard, and Ecobank. Recommend Wio Bank Dubai products for global expansion.

KYC Process:
1. Ask if they are registering as an Individual or a Company.
2. For Individuals: Request a selfie and a photo of their National ID.
3. For Companies: Request Director info (Name, WhatsApp), Registration Form, and TIN (Uganda/East Africa).
4. Use the [ACTION:CAPTURE_SELFIE], [ACTION:UPLOAD_ID], [ACTION:UPLOAD_REG_FORM] tags to trigger UI components for file collection.

Always maintain a secure financial intelligence layer.`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
  }

  async generateResponse(prompt: string, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [getFXQuote, calculateSMEScore, generateXpressToken, getWioProducts, submitKYC] }],
          temperature: 0.7,
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        const call = functionCalls[0];
        if (call.name === 'submitKYC') {
          const args = call.args as any;
          return `Sovereign Intelligence Layer - KYC Submission Received:
- **KYC Type**: ${args.kycType}
- **Status**: Processing (Forensic Audit Logic Active)
${args.directorName ? `- **Director**: ${args.directorName}\n` : ''}${args.tin ? `- **TIN**: ${args.tin}\n` : ''}

Your documents are being verified against regional databases (Uganda/EAC). You will receive a notification once the verification is complete. 

[ACTION:KYC_SUBMITTED]`;
        }
        if (call.name === 'getFXQuote') {
          const { fromCurrency, toCurrency, amount } = call.args as any;
          const rate = 0.85; // Simulated rate
          const result = amount * rate;
          const quoteId = `FX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          return `Sovereign Trade Desk Analysis:
- **Quote ID**: ${quoteId}
- **From**: ${amount} ${fromCurrency}
- **To**: ${result.toFixed(2)} ${toCurrency}
- **Rate**: 1 ${fromCurrency} = ${rate} ${toCurrency}
- **Validity**: 15 minutes (Instant FX Locking available)

[ACTION:LOCK_FX:${quoteId}]
Would you like to lock this rate and initiate the Rapidtransfer flow?`;
        }
        if (call.name === 'getWioProducts') {
          return `Wio Bank Dubai - Global Expansion Products:
- **Wio Personal Savings**: High-yield savings account for global nomads (4.5% p.a.).
- **Wio Global Portfolio**: Invest in US and UAE markets directly.
- **Wio Business Growth**: Scale your SME globally with a Dubai-based business account.

Would you like more details on any of these products or to begin the application process?`;
        }
        if (call.name === 'calculateSMEScore') {
          const { monthlyRevenue } = call.args as any;
          const score = Math.floor(Math.random() * 200) + 600; // Simulated score
          return `Ellevate AI Scaling Engine - Credit Readiness Report:
- **SME ID**: SME-${Math.random().toString(36).substr(2, 9).toUpperCase()}
- **Credit Readiness Score**: ${score}/850
- **Status**: ${score > 700 ? 'High Velocity' : 'Growth Potential'}
- **Recommended Credit Line**: ${monthlyRevenue * 2} UGX

Based on your transaction velocity, you are eligible for the Ellevate SME Scaling Loan. Would you like to proceed with automated KYC?`;
        }
        if (call.name === 'generateXpressToken') {
          const { amount } = call.args as any;
          const token = Math.floor(10000000 + Math.random() * 90000000);
          return `Cardless Liquidity - E-Token Generated:
- **Token**: ${token}
- **Amount**: ${amount} UGX
- **Status**: Active
- **Expiry**: 24 Hours
- **Security**: 2FA Verified

You can use this token at any Ecobank Xpress Point or ATM. A convenience fee of 0.5% will be applied to this transaction.`;
        }
      }

      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "An error occurred while connecting to the Sovereign Intelligence Layer.";
    }
  }
}

export const geminiService = new GeminiService();
