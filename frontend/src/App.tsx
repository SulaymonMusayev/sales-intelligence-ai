import { Activity, RefreshCw } from "lucide-react";
import { useHealth } from "./hooks/useHealth";

export default function App() {
  const { state, retry } = useHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <header>
        <h1 className="text-2xl font-semibold">Sales Intelligence AI</h1>
        <p className="mt-1 text-sm text-slate-600">
          Setup check. All data in this app will be synthetic, AI-generated demo data.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-accent" aria-hidden />
          Backend connection
        </div>

        {state.status === "loading" && <p className="mt-3 text-sm text-slate-500">Checking backend…</p>}

        {state.status === "online" && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Status</dt><dd className="text-emerald-700">Online</dd>
            <dt className="text-slate-500">Service</dt><dd>{state.data.service} v{state.data.version}</dd>
            <dt className="text-slate-500">Mode</dt>
            <dd>{state.data.mode === "ai" ? "Gemini configured" : "Demo mode (no Gemini key)"}</dd>
          </dl>
        )}

        {state.status === "offline" && (
          <p className="mt-3 text-sm text-red-700">
            Can't reach the backend: {state.error} Start it with <code>uvicorn app.main:app --reload</code> from{" "}
            <code>backend/</code>, then retry.
          </p>
        )}

        <button
          onClick={retry}
          disabled={state.status === "loading"}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Check again
        </button>
      </section>
    </main>
  );
}
