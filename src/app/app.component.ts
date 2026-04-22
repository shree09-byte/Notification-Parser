import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LucideAngularModule, BellRing, Smartphone, Sparkles, AlertCircle, CheckCircle, RefreshCcw, Zap, MessageSquare, ListTodo, ChevronRight, Copy, LogOut, DownloadCloud, Settings } from 'lucide-angular';
import { GoogleGenAI, Type } from '@google/genai';
import { marked } from 'marked';
import { FirebaseService, NotificationRecord } from './firebase.service';
import { User } from 'firebase/auth';
import { registerPlugin, Capacitor } from '@capacitor/core';

declare const process: any;
declare const GEMINI_API_KEY: string;

interface NotificationSettingsPlugin {
  openSettings(): Promise<void>;
}
const NotificationSettings = registerPlugin<NotificationSettingsPlugin>('NotificationSettings');

export interface ParserResult {
  summary: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  actionItems: string[];
  suggestedReply: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  appName = '';
  titleText = '';
  body = '';
  persona = 'Executive Brief';
  personas = ['Standard Triage', 'Executive Brief', 'Developer Mode'];
  
  resultData: ParserResult | null = null;
  isLoading = false;
  error: string | null = null;
  randomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  user: User | null = null;
  history: NotificationRecord[] = [];
  showingHistory = false;

  isNative = Capacitor.isNativePlatform();

  constructor(private sanitizer: DomSanitizer, public firebase: FirebaseService) {}

  ngOnInit() {
    this.firebase.user$.subscribe(u => {
      this.user = u;
      if (u && this.isNative) {
        // Sync userId to native storage for the background listener
        localStorage.setItem('CapacitorStorage.userId', u.uid);
      }
    });

    this.firebase.notifications$.subscribe(n => {
      this.history = n;
    });
  }

  async setupMobileListener() {
    if (this.isNative) {
      try {
        await NotificationSettings.openSettings();
      } catch (err) {
        console.error('Failed to open notification settings', err);
        alert('Could not open settings. Please go to Settings > App & Notifications > Special App Access > Notification Access and enable Pulse Intelligence.');
      }
    }
  }

  get parsedSummary(): SafeHtml {
    if (!this.resultData?.summary) return '';
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.resultData.summary) as string);
  }

  sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(content) as string);
  }

  login() {
    this.firebase.login();
  }

  get loginError(): string | null {
    return this.firebase.error;
  }

  get isLoginLoading(): boolean {
    return this.firebase.isLoading;
  }

  logout() {
    this.firebase.logout();
  }

  async handleParse() {
    if (!this.appName || !this.titleText || !this.body) return;

    this.isLoading = true;
    this.error = null;
    this.resultData = null;

    try {
      let apiKey = '';
      try {
        apiKey = GEMINI_API_KEY;
      } catch (e) {
        if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
          apiKey = process.env.GEMINI_API_KEY;
        }
      }

      if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Act as an advanced Mobile Notification Triage AI.
Your task is to analyze the raw notification through the lens of a "${this.persona}" persona.

Data to Process:
Source App: ${this.appName}
Headline: ${this.titleText}
Content: ${this.body}

Rules:
- Summary must be under 40 words, highly glanceable, applying bold to key names/times/values.
- For "Executive Brief" persona: focus strictly on business impact and high-level decisions.
- For "Developer Mode" persona: focus on technical details, system states, and actionable ops.
- Extract any clear actions requested into 'actionItems'.
- If the notification implies a conversational response, draft a brief, professional 'suggestedReply'.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A concise, single-paragraph glanceable summary. Under 40 words." },
              category: { type: Type.STRING, description: "1-2 word classification (e.g., Update, Action, Noise, Alert)" },
              priority: { type: Type.STRING, description: "Must be exactly CRITICAL, HIGH, NORMAL, or LOW." },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "0-3 bullet points defining explicit required actions." },
              suggestedReply: { type: Type.STRING, description: "Brief auto-reply draft if a response is expected. Empty string if not." }
            },
            required: ["summary", "category", "priority", "actionItems", "suggestedReply"]
          }
        }
      });

      if (response.text) {
        this.resultData = JSON.parse(response.text.trim()) as ParserResult;
        this.randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Save to Firebase if logged in
        if (this.user) {
          try {
            await this.firebase.addNotification({
              appName: this.appName,
              titleText: this.titleText,
              body: this.body,
              persona: this.persona,
              ...this.resultData
            });
          } catch (fbErr: any) {
            console.error("Failed to save to firebase", fbErr);
            this.error = "Firebase Sync Error: " + (fbErr.message || JSON.stringify(fbErr));
          }
        }

      } else {
        throw new Error('No valid response received from model.');
      }
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'An error occurred while parsing the notification.';
    } finally {
      this.isLoading = false;
    }
  }

  handleClear() {
    this.appName = '';
    this.titleText = '';
    this.body = '';
    this.resultData = null;
    this.error = null;
  }

  copyToClipboard(text: string) {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }
}
