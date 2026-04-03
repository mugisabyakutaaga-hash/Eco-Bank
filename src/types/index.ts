export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'trader' | 'sme' | 'admin';
  walletBalance: number;
  currency: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fx_lock';
  status: 'pending' | 'completed' | 'failed';
  provider: 'flutterwave' | 'ecobank' | 'wio';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  updatedAt: string;
}

export interface KYCData {
  userId: string;
  type: 'individual' | 'company';
  selfieUrl?: string;
  idPhotoUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  companyInfo?: {
    directorName: string;
    whatsappNumber: string;
    registrationFormUrl: string;
    tin: string;
    region: string;
  };
  updatedAt: string;
}
