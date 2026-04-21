import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, BellRing, Smartphone, Sparkles, AlertCircle, CheckCircle, RefreshCcw, Zap, MessageSquare, ListTodo, ChevronRight, Copy, LogOut, DownloadCloud } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    importProvidersFrom(LucideAngularModule.pick({ BellRing, Smartphone, Sparkles, AlertCircle, CheckCircle, RefreshCcw, Zap, MessageSquare, ListTodo, ChevronRight, Copy, LogOut, DownloadCloud }))
  ]
};
