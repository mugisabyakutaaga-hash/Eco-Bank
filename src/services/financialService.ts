/**
 * Financial Service for Flutterwave and Wio Bank integrations.
 * Note: In a production environment, these calls should be proxied through a server-side endpoint
 * to keep API keys secure. For this demo, we simulate the logic.
 */

export interface TransferParams {
  toUserId: string;
  amount: number;
  currency: string;
  provider: 'flutterwave' | 'ecobank';
}

export interface WioProduct {
  id: string;
  name: string;
  description: string;
  type: 'savings' | 'investment' | 'business';
  interestRate?: string;
}

export class FinancialService {
  // Simulate Flutterwave P2P Transfer
  async initiateTransfer(params: TransferParams): Promise<{ success: boolean; txId?: string; error?: string }> {
    console.log(`Initiating ${params.provider} transfer of ${params.amount} ${params.currency} to ${params.toUserId}`);
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success
    return {
      success: true,
      txId: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
  }

  // Simulate Wio Bank Dubai Product Retrieval
  async getWioProducts(): Promise<WioProduct[]> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
      {
        id: 'wio-save-1',
        name: 'Wio Personal Savings',
        description: 'High-yield savings account for global nomads.',
        type: 'savings',
        interestRate: '4.5% p.a.'
      },
      {
        id: 'wio-invest-1',
        name: 'Wio Global Portfolio',
        description: 'Invest in US and UAE markets directly from your SIL.',
        type: 'investment'
      },
      {
        id: 'wio-biz-1',
        name: 'Wio Business Growth',
        description: 'Scale your SME globally with a Dubai-based business account.',
        type: 'business'
      }
    ];
  }

  // Simulate FX Rate Locking
  async lockFXRate(quoteId: string): Promise<{ success: boolean; lockId?: string }> {
    console.log(`Locking FX rate for quote: ${quoteId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      lockId: `LOCK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
  }
}

export const financialService = new FinancialService();
