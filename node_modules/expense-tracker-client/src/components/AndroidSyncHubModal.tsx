import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Radio,
  FileText,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../api.js';
import { MobileSyncConfig, ParsedSmsPreview } from '../types.js';

interface AndroidSyncHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
}

const SAMPLE_SMS_PRESETS = [
  {
    title: 'HDFC UPI • Zomato',
    bank: 'HDFC',
    sender: 'HDFCBK',
    text: 'Sent Rs.450.00 from HDFC Bank A/C **1234 to ZOMATO on 29-AUG-26. UPI Ref 382910. Avail Bal: Rs 15,200.00'
  },
  {
    title: 'ICICI Card • Netflix',
    bank: 'ICICI',
    sender: 'ICICIB',
    text: 'Acct XX8901 debited with INR 899.00 on 29-Aug-26. Info: BIL*NETFLIX. Available Bal: INR 34,120.00'
  },
  {
    title: 'SBI UPI • Swiggy',
    bank: 'SBI',
    sender: 'SBIN',
    text: 'Dear SBI User, your A/c ending 4321 is debited by Rs 250.00 on 29Aug26 by transfer to SWIGGY Ref No 392019. Balance: Rs. 8420.00'
  },
  {
    title: 'Axis Salary Credit',
    bank: 'AXIS',
    sender: 'AXISBK',
    text: 'Your A/C **9876 is credited with Rs 85,000.00 on 29-AUG-26 by INFOSYS TECH SALARY. Avail Bal: Rs 1,02,400.00'
  },
  {
    title: 'Swiggy Refund Credit',
    bank: 'HDFC',
    sender: 'HDFCBK',
    text: 'Dear Customer, INR 350.00 is refunded to your A/C XX4321 from SWIGGY. Ref: 481928'
  },
  {
    title: 'Kotak • Blinkit Grocery',
    bank: 'KOTAK',
    sender: 'KOTAKB',
    text: 'Paid Rs.640.00 to BLINKIT using Kotak Bank A/C XX5432 on 29-08-2026. UPI Ref: 8812903. Avail Bal: Rs 21,300.00'
  }
];

export const AndroidSyncHubModal: React.FC<AndroidSyncHubModalProps> = ({
  isOpen,
  onClose,
  onTransactionAdded
}) => {
  const [config, setConfig] = useState<MobileSyncConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'simulator'>('guide');
  const [selectedApp, setSelectedApp] = useState<'macrodroid' | 'tasker'>('macrodroid');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Simulator state
  const [smsInput, setSmsInput] = useState(SAMPLE_SMS_PRESETS[0].text);
  const [senderInput, setSenderInput] = useState(SAMPLE_SMS_PRESETS[0].sender);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedSmsPreview | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      handleParseSms(smsInput, senderInput);
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const cfg = await api.getMobileConfig();
      setConfig(cfg);
    } catch (e) {
      console.error('Failed to load mobile config:', e);
      // Fallback with default demo key if offline/auth sync delayed
      setConfig({
        apiKey: 'sp_live_demo',
        webhookUrl: `http://${window.location.hostname || 'localhost'}:4000/api/sync/mobile-webhook?apiKey=sp_live_demo`,
        activeConnectionsCount: 1,
        instructions: {
          android_macrodroid: {
            appName: 'MacroDroid',
            trigger: 'SMS Received',
            action: 'HTTP Request',
            method: 'POST',
            url: `http://${window.location.hostname || 'localhost'}:4000/api/sync/mobile-webhook?apiKey=sp_live_demo`,
            contentType: 'application/json',
            bodyPayload: '{"text": "[sms_message_body]", "sender": "[sms_number]"}'
          },
          android_tasker: {
            appName: 'Tasker',
            trigger: 'Event -> Received Text',
            action: 'HTTP Request',
            url: `http://${window.location.hostname || 'localhost'}:4000/api/sync/mobile-webhook?apiKey=sp_live_demo`,
            body: '{"text": "%SMSRB", "sender": "%SMSRF"}'
          }
        }
      });
    }
  };

  const getFullWebhookUrl = () => {
    const key = config?.apiKey || 'sp_live_demo';
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://192.168.0.101:3000';
    return `${origin}/api/sync/mobile-webhook?apiKey=${key}`;
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerating your API Key will invalidate your previous key. Continue?')) return;
    setIsRegenerating(true);
    try {
      const res = await api.regenerateApiKey();
      if (config) {
        setConfig({
          ...config,
          apiKey: res.apiKey,
          webhookUrl: res.webhookUrl
        });
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleParseSms = async (text: string, sender?: string) => {
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const res = await api.parseSms(text, sender);
      setParsedResult(res.parsed);
    } catch (err: any) {
      setParsedResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyPreset = (preset: typeof SAMPLE_SMS_PRESETS[0]) => {
    setSmsInput(preset.text);
    setSenderInput(preset.sender);
    handleParseSms(preset.text, preset.sender);
    setIngestSuccessMsg(null);
  };

  const handleTestIngest = async () => {
    if (!smsInput.trim()) return;
    setIsIngesting(true);
    setErrorMessage(null);
    setIngestSuccessMsg(null);
    try {
      const res = await api.ingestMobileTransaction({
        text: smsInput,
        sender: senderInput,
        source: 'android_simulator_test'
      });

      if (res.success) {
        if (res.duplicateSkipped) {
          setIngestSuccessMsg(`⚠️ Duplicate detected: ${res.message || 'Already recorded.'}`);
        } else {
          setIngestSuccessMsg(`⚡ Successfully recorded: ₹${res.transaction?.amount} at ${res.transaction?.merchant_name}`);
          onTransactionAdded?.();
        }
      } else {
        setErrorMessage(res.message || 'Failed to ingest transaction');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing test ingestion');
    } finally {
      setIsIngesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-2xl p-6 rounded-3xl border border-zinc-700 bg-zinc-900/95 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Android Real-Time Phone Sync</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live SSE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Automated SMS & notification logging directly from your Android phone</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Zero-Touch Automation Guide
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            SMS Tester & Live Simulator
          </button>
        </div>

        {/* Tab 1: Zero-Touch Automation Setup */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            {/* User Webhook & API Key Box */}
            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Your Personal Webhook Endpoint</span>
                <button
                  onClick={handleRegenerateKey}
                  disabled={isRegenerating}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  title="Rotate API Key"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate Key
                </button>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-400 font-semibold">Webhook Target URL (HTTP POST):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullWebhookUrl()}
                    className="flex-1 bg-zinc-900 border border-zinc-700/80 px-3 py-2 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(getFullWebhookUrl(), 'url')}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                  >
                    {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'url' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* App Choice Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-300">Select Android Automation Tool:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp('macrodroid')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedApp === 'macrodroid'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    🤖 MacroDroid
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Recommended</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">Free, easiest 2-minute setup, no root needed</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedApp('tasker')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedApp === 'tasker'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">⚡ Tasker / Automate</div>
                  <div className="text-[11px] text-zinc-400 mt-1">For advanced Android power users</div>
                </button>
              </div>
            </div>

            {/* Step-by-Step Guide for MacroDroid */}
            {selectedApp === 'macrodroid' && (
              <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 space-y-3 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-2">
                  <span>How to set up MacroDroid in 3 simple steps:</span>
                </div>

                <div className="space-y-2.5 text-zinc-300 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <div>
                      <strong>Install MacroDroid</strong> (Free from Google Play Store). Tap <em>"Add Macro"</em>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <div>
                      <strong>Add Trigger:</strong> Tap <span className="text-amber-300">+ Trigger</span> &rarr; <em>"SMS Received"</em> &rarr; Select <em>"Any Content"</em> (or filter for bank messages containing <code>debited, credited, spent, Rs, INR</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <div>
                      <strong>Add Action:</strong> Tap <span className="text-amber-300">+ Action</span> &rarr; <em>"Connectivity"</em> &rarr; <em>"HTTP Request"</em>:
                      <div className="mt-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2 font-mono text-[11px]">
                        <div><span className="text-zinc-500">Method:</span> <strong className="text-emerald-300">POST</strong></div>
                        <div className="truncate"><span className="text-zinc-500">URL:</span> <span className="text-zinc-300">{getFullWebhookUrl()}</span></div>
                        <div><span className="text-zinc-500">Content-Type:</span> <span className="text-zinc-300">application/json</span></div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-zinc-400 font-sans font-semibold">Body Content:</span>
                          <button
                            onClick={() => copyToClipboard('{"text": "[sms_message_body]", "sender": "[sms_number]"}', 'body')}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-sans font-bold flex items-center gap-1"
                          >
                            {copiedField === 'body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedField === 'body' ? 'Copied' : 'Copy JSON'}
                          </button>
                        </div>
                        <code className="text-emerald-400 block bg-zinc-950 p-2 rounded border border-zinc-800">
                          {`{"text": "[sms_message_body]", "sender": "[sms_number]"}`}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-zinc-400 flex items-center gap-1.5 border-t border-zinc-800/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>That's it! Whenever your bank sends an SMS or UPI alert, SpendPulse records it automatically in real time with zero manual entry.</span>
                </div>
              </div>
            )}

            {/* Tasker Guide */}
            {selectedApp === 'tasker' && (
              <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 space-y-3 text-xs">
                <div className="font-bold text-emerald-400">Tasker Configuration:</div>
                <div className="space-y-2 text-zinc-300 font-mono text-[11px]">
                  <div>1. Profile: <strong>Event &rarr; Phone &rarr; Received Text (SMS)</strong></div>
                  <div>2. Task Action: <strong>Net &rarr; HTTP Request</strong></div>
                  <div>- Method: <strong>POST</strong></div>
                  <div className="truncate">- URL: <strong>{config?.webhookUrl}</strong></div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-400 font-sans font-semibold">Body:</span>
                    <button
                      onClick={() => copyToClipboard('{"text": "%SMSRB", "sender": "%SMSRF"}', 'tasker_body')}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-sans font-bold flex items-center gap-1"
                    >
                      {copiedField === 'tasker_body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'tasker_body' ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <code className="text-emerald-400 block bg-zinc-950 p-2 rounded border border-zinc-800">
                    {`{"text": "%SMSRB", "sender": "%SMSRF"}`}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interactive SMS Tester & Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Quick Test Bank Templates:</label>
                <span className="text-[10px] text-zinc-500">Tap to load preset</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SMS_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[11px] font-semibold text-zinc-300 transition-all flex items-center gap-1"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Freeform SMS Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Bank SMS / Notification Text:</label>
                <span className="text-[10px] text-zinc-400 font-mono">Sender: {senderInput}</span>
              </div>
              <textarea
                rows={3}
                value={smsInput}
                onChange={(e) => {
                  setSmsInput(e.target.value);
                  handleParseSms(e.target.value, senderInput);
                  setIngestSuccessMsg(null);
                }}
                placeholder="Paste any bank SMS or UPI payment message here..."
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
              />
            </div>

            {/* Live Parsing Preview */}
            {parsedResult ? (
              <div className="p-4 bg-zinc-950/80 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live Parser Extracted Attributes</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    High Confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Amount</span>
                    <span className="font-bold text-white font-mono text-sm">
                      ₹{parsedResult.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Merchant / Payee</span>
                    <span className="font-bold text-emerald-400 truncate block">
                      {parsedResult.merchantName}
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Type & Mode</span>
                    <span className="font-semibold text-zinc-200 capitalize truncate block">
                      {parsedResult.transactionType} • {parsedResult.paymentMode}
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Account Mask</span>
                    <span className="font-mono text-zinc-300 font-semibold truncate block">
                      {parsedResult.maskedAccount || 'Mobile'}
                    </span>
                  </div>
                </div>

                {parsedResult.remainingBalance !== undefined && (
                  <div className="text-[11px] text-zinc-400">
                    Extracted Ledger Balance: <strong className="text-zinc-200 font-mono">₹{parsedResult.remainingBalance.toLocaleString('en-IN')}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/60 text-xs text-zinc-500 text-center">
                {isParsing ? 'Parsing SMS...' : 'Type or paste a bank transaction SMS above to preview extracted fields.'}
              </div>
            )}

            {/* Success & Error Messages */}
            {ingestSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{ingestSuccessMsg}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTestIngest}
                disabled={isIngesting || !parsedResult}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {isIngesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Recording Realtime Event...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Simulate Real-Time Ingestion
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
