export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  gemini_configured: boolean;
  mode: "ai" | "demo";
  timestamp: string;
}
