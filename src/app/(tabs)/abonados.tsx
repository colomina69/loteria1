import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { AbonadoCard } from "@/components/abonados/AbonadoCard";
import {
  AppText,
  EmptyState,
  ErrorBlock,
  Fab,
  LoadingBlock,
  PageHeader,
  Screen,
  SearchBar,
  SwitchRow,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { listAbonados } from "@/lib/api/abonados";
import { normalizar } from "@/lib/derive";
import { colors } from "@/lib/theme";

export default function AbonadosScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, reload } = useAsync(listAbonados);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const abonados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return (data ?? []).filter((abonado) => {
      const coincideTexto =
        texto.length === 0 || normalizar(abonado.nombre).includes(texto);
      const coincideActivo = !soloActivos || abonado.activo;
      return coincideTexto && coincideActivo;
    });
  }, [data, busqueda, soloActivos]);

  return (
    <Screen>
      <FlatList
        data={abonados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AbonadoCard
            abonado={item}
            onPress={() =>
              router.push({ pathname: "/abonado/[id]", params: { id: item.id } })
            }
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
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
              title="Abonados"
              subtitle={`${abonados.length} de ${data?.length ?? 0} abonados`}
            />
            <SearchBar
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por nombre…"
            />
            <SwitchRow
              label="Solo abonados activos"
              description="Desactiva para incluir abonados dados de baja"
              value={soloActivos}
              onValueChange={setSoloActivos}
            />
            {error ? <ErrorBlock message={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading && !data ? (
            <LoadingBlock />
          ) : error ? undefined : (
            <EmptyState
              icon="people-outline"
              title={busqueda ? "Sin resultados" : "Sin abonados"}
              description={
                busqueda
                  ? "Prueba con otro nombre."
                  : "Registra a los clientes habituales para asignarles décimos."
              }
              actionLabel={busqueda ? undefined : "Crear abonado"}
              onAction={busqueda ? undefined : () => router.push("/abonado/nuevo")}
            />
          )
        }
        ListFooterComponent={
          abonados.length > 0 ? (
            <View className="mt-4 gap-1">
              <AppText variant="caption" className="text-center">
                «Mensual» participa en todos los sorteos mensuales.
              </AppText>
              <AppText variant="caption" className="text-center">
                «Solo extraordinarios» aparece únicamente en Navidad, Niño y
                extraordinarios.
              </AppText>
            </View>
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      />
      <Fab label="Crear abonado" onPress={() => router.push("/abonado/nuevo")} />
    </Screen>
  );
}
