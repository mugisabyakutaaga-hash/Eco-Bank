import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Menu, 
  X, 
  Wallet, 
  TrendingUp, 
  Users, 
  CreditCard, 
  LogOut, 
  Plus, 
  History,
  ShieldCheck,
  Globe,
  Zap,
  Camera,
  Upload,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { FirebaseProvider, useAuth } from './lib/FirebaseProvider';
import { Message, Transaction } from './types';
import { db } from './lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { financialService } from './services/financialService';

const safeFormatDate = (date: any, formatStr: string) => {
  try {
    if (!date) return '...';
    const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '...';
    return format(d, formatStr);
  } catch (e) {
    return '...';
  }
};

function ChatApp() {
  const { user, profile, logout, signIn, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferProvider, setTransferProvider] = useState<'flutterwave' | 'ecobank'>('flutterwave');
  const [error, setError] = useState<string | null>(null);
  const [kycFiles, setKycFiles] = useState<{ [key: string]: string }>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraPurpose, setCameraPurpose] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.uid, 'chats'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => doc.data() as Message).reverse();
        setMessages(fetchedMessages);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTxs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(fetchedTxs);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || isSending) return;
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setInput('');
    setIsSending(true);

    try {
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...userMessage,
        timestamp: serverTimestamp(),
      });

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await geminiService.generateResponse(input, history);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...assistantMessage,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to connect to the Sovereign Intelligence Layer. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || !transferAmount || !transferRecipient) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await financialService.initiateTransfer({
        toUserId: transferRecipient,
        amount: parseFloat(transferAmount),
        currency: profile?.currency || 'UGX',
        provider: transferProvider
      });

      if (result.success) {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          userId: user.uid,
          amount: parseFloat(transferAmount),
          type: 'transfer',
          status: 'completed',
          provider: transferProvider,
          timestamp: serverTimestamp(),
        });
        setIsTransferModalOpen(false);
        setTransferAmount('');
        setTransferRecipient('');
      } else {
        setError(result.error || "Transfer failed.");
      }
    } catch (err) {
      setError("A network error occurred during the transfer.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLockFX = async (quoteId: string) => {
    setIsSending(true);
    setError(null);
    try {
      const result = await financialService.lockFXRate(quoteId);
      if (result.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: `**Rate Locked Successfully**\n\nLock ID: ${result.lockId}\n\nYour FX rate has been secured for the next 15 minutes. You can now proceed with the cross-border payment.`,
          timestamp: new Date().toISOString(),
        };
        await addDoc(collection(db, 'users', user.uid, 'chats'), {
          ...assistantMessage,
          timestamp: serverTimestamp(),
        });
      }
    } catch (err) {
      setError("Failed to lock FX rate.");
    } finally {
      setIsSending(false);
    }
  };

  const startCamera = async (purpose: string) => {
    setCameraPurpose(purpose);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera.");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraPurpose) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setKycFiles(prev => ({ ...prev, [cameraPurpose]: dataUrl }));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setCameraPurpose(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, purpose: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKycFiles(prev => ({ ...prev, [purpose]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">mfunzi</h1>
            <p className="text-slate-400 text-lg">Sovereign Intelligence Layer for Ecobank</p>
          </div>
          <button 
            onClick={signIn}
            className="w-full py-4 px-6 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-3"
          >
            <Globe className="w-5 h-5" />
            Enter the Pan-African Gateway
          </button>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Powered by Forensic Audit Logic</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -320 }}
        className={cn(
          "fixed lg:static inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 z-50 transition-all duration-300 ease-in-out",
          "flex flex-col",
          !isSidebarOpen && "lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">mfunzi</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {/* Wallet Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-xl shadow-blue-900/20">
            <div className="flex justify-between items-start mb-4">
              <Wallet className="w-6 h-6 text-blue-100" />
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white uppercase tracking-wider">
                {profile?.role || 'User'}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-blue-100/80 text-sm">Available Balance</p>
              <h3 className="text-2xl font-bold tracking-tight">
                {profile?.currency} {profile?.walletBalance.toLocaleString()}
              </h3>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
                Deposit
              </button>
              <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
                Withdraw
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sovereign Verticals</h4>
            <div className="grid grid-cols-1 gap-2">
              <button className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-700/50 group">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Trade Desk</p>
                  <p className="text-[10px] text-slate-500">Instant FX Quotes</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-700/50 group">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500/20">
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Ellevate SME</p>
                  <p className="text-[10px] text-slate-500">Credit Readiness</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-700/50 group">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                  <Zap className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Xpress Cash</p>
                  <p className="text-[10px] text-slate-500">E-Token Generation</p>
                </div>
              </button>
            </div>
          </div>

          {/* Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h4>
              <History className="w-4 h-4 text-slate-500" />
            </div>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No recent transactions</p>
              ) : (
                transactions.map(tx => (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {tx.type === 'transfer' ? <Send className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                          <p className="text-[10px] text-slate-500">{tx.provider} • {safeFormatDate(tx.timestamp, 'MMM d, HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xs font-bold",
                          tx.type === 'withdrawal' || tx.type === 'transfer' ? "text-red-400" : "text-emerald-400"
                        )}>
                          {tx.type === 'withdrawal' || tx.type === 'transfer' ? '-' : '+'}{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-[8px] uppercase tracking-widest text-slate-600 font-bold">{tx.status}</p>
                      </div>
                    </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Exit Gateway
          </button>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold tracking-tight">Sovereign Intelligence Layer</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Encrypted Connection</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-lg transition-all"
              title="Transfer Funds"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-bold">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-500">{profile?.email}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">Welcome to the Gateway</h3>
                <p className="text-slate-400">
                  I am mfunzi, your Sovereign Intelligence Layer. How can I facilitate your growth today?
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  "Get FX quote for UGX to NGN",
                  "Check my SME credit readiness",
                  "Generate Xpress Cash token",
                  "Transfer to Rapidtransfer"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-left hover:border-blue-500/50 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={cn(
                "flex gap-4 max-w-3xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                msg.role === 'user' ? "bg-slate-800" : "bg-blue-600"
              )}>
                {msg.role === 'user' ? <Users className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              <div className={cn(
                "space-y-1",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-slate-800 text-slate-100 rounded-tr-none" 
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content.replace(/\[ACTION:LOCK_FX:.*?\]/g, '').replace(/\[ACTION:.*?\]/g, '')}</ReactMarkdown>
                  </div>
                  {msg.role === 'assistant' && msg.content.includes('[ACTION:LOCK_FX:') && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <button 
                        onClick={() => {
                          const match = msg.content.match(/\[ACTION:LOCK_FX:(.*?)\]/);
                          if (match) handleLockFX(match[1]);
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Lock FX Rate Now
                      </button>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.content.includes('[ACTION:CAPTURE_SELFIE]') && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identity Verification</p>
                      <button 
                        onClick={() => startCamera('selfie')}
                        className={cn(
                          "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          kycFiles['selfie'] ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                        )}
                      >
                        {kycFiles['selfie'] ? <CheckCircle2 className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                        {kycFiles['selfie'] ? "Selfie Captured" : "Take Selfie"}
                      </button>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.content.includes('[ACTION:UPLOAD_ID]') && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Upload</p>
                      <label className={cn(
                        "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        kycFiles['id_photo'] ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                      )}>
                        {kycFiles['id_photo'] ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                        {kycFiles['id_photo'] ? "ID Photo Uploaded" : "Upload ID Photo"}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_photo')} />
                      </label>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.content.includes('[ACTION:UPLOAD_REG_FORM]') && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company Documentation</p>
                      <label className={cn(
                        "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        kycFiles['reg_form'] ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                      )}>
                        {kycFiles['reg_form'] ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        {kycFiles['reg_form'] ? "Registration Form Uploaded" : "Upload Registration Form"}
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'reg_form')} />
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  {safeFormatDate(msg.timestamp, 'HH:mm')}
                </p>
              </div>
            </motion.div>
          ))}
          {isSending && (
            <div className="flex gap-4 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 rounded-tl-none">
                <div className="flex gap-1">
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-slate-950/50 backdrop-blur-md border-t border-slate-800">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs"
            >
              <X className="w-4 h-4" />
              {error}
            </motion.div>
          )}
          <div className="max-w-4xl mx-auto relative">
            <textarea 
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Command the Sovereign Intelligence Layer..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all shadow-lg shadow-blue-900/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-4 font-bold uppercase tracking-widest">
            Forensic Audit Logic Active • Secure Transaction Environment
          </p>
        </div>
      </main>

      {/* Transfer Modal */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Transfer Funds</h3>
                <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recipient UID</label>
                  <input 
                    type="text"
                    value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    placeholder="Enter recipient's unique ID"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount ({profile?.currency})</label>
                  <input 
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setTransferProvider('flutterwave')}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-sm font-bold",
                        transferProvider === 'flutterwave' ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      )}
                    >
                      Flutterwave
                    </button>
                    <button 
                      onClick={() => setTransferProvider('ecobank')}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-sm font-bold",
                        transferProvider === 'ecobank' ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      )}
                    >
                      Ecobank
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleTransfer}
                  disabled={!transferAmount || !transferRecipient || isSending}
                  className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:bg-slate-800 disabled:text-slate-600 mt-4"
                >
                  {isSending ? "Processing..." : "Confirm Transfer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Capture {cameraPurpose}</h3>
                <button onClick={stopCamera} className="p-2 hover:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative aspect-video bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="p-6 flex justify-center">
                <button 
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 border-2 border-slate-950 rounded-full" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <ChatApp />
    </FirebaseProvider>
  );
}
