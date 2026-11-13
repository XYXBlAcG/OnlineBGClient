import { useCallback, useEffect, useRef, useState } from "react";
import { ClientStore } from "../storage";
import {
  emptyJournal,
  type ExpeditionJournal,
} from "../../domain/expedition/journal";
import type { LegacyNodeId } from "../../domain/expedition/legacy";

export function useExpeditionJournal(enabled = true) {
  const store = useRef<ClientStore>();
  const getStore = () => (store.current ??= new ClientStore());
  const [journal, setJournal] = useState<ExpeditionJournal>(emptyJournal);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setJournal(await getStore().journal());
      setError("");
      setLoading(false);
    } catch (error) {
      setError(String(error));
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
  }, [enabled, refresh]);
  const upgrade = useCallback(async (id: LegacyNodeId) => {
    try {
      setJournal(await getStore().upgradeLegacy(id));
      setError("");
    } catch (error) {
      setError(String(error));
    }
  }, []);
  const importJournal = useCallback(async (input: unknown) => {
    try {
      setJournal(await getStore().importJournal(input));
      setError("");
    } catch (error) {
      setError(String(error));
    }
  }, []);
  return {
    journal,
    loading,
    error,
    refresh,
    upgrade,
    importJournal,
  };
}
