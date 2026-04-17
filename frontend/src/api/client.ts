export type ModelOption = {
  version: string;
  display_name?: string;
  stage?: string;
  available?: boolean;
};

export type PredictFileResponse = {
  run_id: string;
  download_url: string;
  model_version?: string;
  model_display_name?: string;
  filename?: string;
  stats?: Record<string, unknown>;
  preview_rows?: Record<string, unknown>[];
  preview_count?: number;
  total_count?: number;
  error?: string;
};

export type HealthResponse = {
  status: string;
  model_version?: string;
  message?: string;
};

export type DriftAlert = {
  timestamp: string;
  type: string;
  feature: string;
  psi: number;
  threshold: number;
};

export type DriftResponse = {
  drift_detected: boolean;
  alerts_count: number;
  alerts: DriftAlert[];
  psi_threshold: number;
};

export type RetrainResponse = {
  record?: {
    version?: string;
    stage?: string;
    created_at?: string;
  };
  metrics?: {
    accuracy?: number;
    f1?: number;
  };
  promoted?: boolean;
};

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Réponse non JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function postDriftCheck(payload: FormData): Promise<DriftResponse> {
  return fetchJson<DriftResponse>("/api/drift", {
    method: "POST",
    body: payload,
  });
}

export function postRetrain(payload: FormData): Promise<RetrainResponse> {
  return fetchJson<RetrainResponse>("/api/retrain", {
    method: "POST",
    body: payload,
  });
}
