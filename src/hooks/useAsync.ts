import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { mensajeError } from "@/lib/api/errors";

type UseAsyncResult<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useAsync<T>(cargar: () => Promise<T>): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montado = useRef(true);
  const primerEnfoque = useRef(true);

  const ejecutar = useCallback(
    async (modo: "inicial" | "refresco" | "silencio" = "inicial") => {
      if (!montado.current) return;
      if (modo === "inicial") setLoading(true);
      if (modo === "refresco") setRefreshing(true);
      setError(null);

      try {
        const resultado = await cargar();
        if (montado.current) setData(resultado);
      } catch (err) {
        if (montado.current) setError(mensajeError(err));
      } finally {
        if (montado.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cargar],
  );

  useEffect(() => {
    montado.current = true;
    let cancelado = false;

    void (async () => {
      try {
        const resultado = await cargar();
        if (!cancelado) {
          setData(resultado);
          setError(null);
        }
      } catch (err) {
        if (!cancelado) setError(mensajeError(err));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
      montado.current = false;
    };
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      if (primerEnfoque.current) {
        primerEnfoque.current = false;
        return;
      }
      void ejecutar("silencio");
    }, [ejecutar]),
  );

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => ejecutar("refresco"),
  };
}
