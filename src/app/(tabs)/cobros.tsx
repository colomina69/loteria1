import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { SorteoCard } from "@/components/sorteos/SorteoCard";
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Screen,
  SearchBar,
  Segmented,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { listSorteos } from "@/lib/api/sorteos";
import { normalizar, TIPO_LABEL, TIPO_ORDER } from "@/lib/derive";
import type { SorteoResumen, SorteoTipo } from "@/lib/database.types";
import { colors } from "@/lib/theme";

type FiltroTipo = "todos" | SorteoTipo;

const FILTROS: { value: FiltroTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  ...TIPO_ORDER.map((tipo) => ({ value: tipo, label: TIPO_LABEL[tipo] })),
];

export default function CobrosScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, reload } = useAsync(listSorteos);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");

  const sorteos = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return (data ?? []).filter((sorteo) => {
      const coincideTexto =
        texto.length === 0 || normalizar(sorteo.nombre).includes(texto);
      const coincideTipo = filtro === "todos" || sorteo.tipo === filtro;
      return coincideTexto && coincideTipo;
    });
  }, [data, busqueda, filtro]);

  const abrirCobros = useCallback(
    (sorteo: SorteoResumen) => {
      router.push({
        pathname: "/cobro/[sorteoId]",
        params: { sorteoId: sorteo.id },
      });
    },
    [router],
  );

  return (
    <Screen>
      <FlatList
        data={sorteos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SorteoCard sorteo={item} onPress={() => abrirCobros(item)} />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            <PageHeader
              title="Cobros"
              subtitle="Selecciona un sorteo para registrar décimos"
            />
            <SearchBar
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar sorteo…"
            />
            <Segmented options={FILTROS} value={filtro} onChange={setFiltro} />
            {error ? <ErrorBlock message={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading && !data ? (
            <LoadingBlock />
          ) : error ? undefined : (
            <EmptyState
              icon="cash-outline"
              title="No hay sorteos para cobrar"
              description="Crea un sorteo primero desde la pestaña Sorteos."
              actionLabel="Ir a sorteos"
              onAction={() => router.navigate("/sorteos")}
            />
          )
        }
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}
