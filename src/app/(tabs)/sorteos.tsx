import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { SorteoCard } from "@/components/sorteos/SorteoCard";
import {
  AppText,
  EmptyState,
  ErrorBlock,
  Fab,
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

export default function SorteosScreen() {
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

  const abrirSorteo = useCallback(
    (sorteo: SorteoResumen) => {
      router.push({ pathname: "/sorteo/[id]", params: { id: sorteo.id } });
    },
    [router],
  );

  return (
    <Screen>
      <FlatList
        data={sorteos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SorteoCard sorteo={item} onPress={() => abrirSorteo(item)} />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 110,
          gap: 0,
        }}
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
              title="Sorteos"
              subtitle={`${sorteos.length} de ${data?.length ?? 0} sorteos`}
            />
            <SearchBar
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por nombre…"
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
              icon="ticket-outline"
              title={busqueda ? "Sin resultados" : "Sin sorteos"}
              description={
                busqueda
                  ? "Prueba con otro nombre o cambia el filtro."
                  : "Crea un sorteo mensual, de Navidad, del Niño o extraordinario."
              }
              actionLabel={busqueda ? undefined : "Crear sorteo"}
              onAction={busqueda ? undefined : () => router.push("/sorteo/nuevo")}
            />
          )
        }
        ListFooterComponent={
          sorteos.length > 0 ? (
            <AppText variant="caption" className="mt-4 text-center">
              El tipo se deduce del nombre del sorteo.
            </AppText>
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      />
      <Fab label="Crear sorteo" onPress={() => router.push("/sorteo/nuevo")} />
    </Screen>
  );
}
