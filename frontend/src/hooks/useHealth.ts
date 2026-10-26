import { useCallback, useEffect, useState } from "react";
import { getHealth } from "../services/api";
import type { HealthResponse } from "../types/api";

type State =
  | { status: "loading" }
  | { status: "online"; data: HealthResponse }
  | { status: "offline"; error: string };

export function useHealth() {
  const [state, setState] = useState<State>({ status: "loading" });

  const check = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "online", data: await getHealth() });
    } catch (e) {
      const msg = e instanceof Error && e.name !== "AbortError" ? e.message : "The backend did not respond in time.";
      setState({ status: "offline", error: msg });
    }
  }, []);

  useEffect(() => { void check(); }, [check]);
  return { state, retry: check };
}
