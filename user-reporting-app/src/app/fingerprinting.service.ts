import { Injectable } from "@angular/core";
import { from, shareReplay } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class FingerprintingService {
  browserFingerPrint$ = from(this.generateBrowserFingerprint()).pipe(
    shareReplay(1),
  );

  private async generateBrowserFingerprint(): Promise<string> {
    const fingerprintData = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      // deviceMemory: navigator.deviceMemory,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(fingerprintData));
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      console.error("Fingerprint generation failed:", error);
      throw error;
    }
  }
}
