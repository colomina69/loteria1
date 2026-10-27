# Lotería · Gestión de décimos y abonados

Aplicación Expo (React Native) para administrar sorteos, abonados y cobros de décimos.
Interfaz oscura con NativeWind v5 (Tailwind CSS v4) y persistencia directa en Supabase.

## Requisitos

- Node.js 20 o superior
- npm
- Expo Go en el móvil o un emulador Android
- Proyecto Supabase con las tablas `sorteos`, `abonados` y `pagos`

## Puesta en marcha

```bash
npm install
npm start
```

Después pulsa `a` para abrir en Android o escanea el QR con Expo Go.

Para lanzar directamente en el emulador/dispositivo Android:

```bash
npm run android
```

## Variables de entorno

Crea un archivo `.env` en la raíz (hay una plantilla en `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Solo se debe usar la **publishable/anon key**. Las variables `EXPO_PUBLIC_*` quedan
incrustadas en el bundle, así que nunca incluyas una secret key.

## Migración obligatoria

Antes de usar la app ejecuta en orden los archivos de `supabase/migrations/` en **Supabase → SQL Editor**:

- `001_stock.sql`: añade `decimos_iniciales` y `decimos_extra` a `sorteos`, elimina la restricción que impedía varios décimos por abonado/sorteo, crea `registrar_cobro` y `ampliar_stock`, y rellena el stock histórico.
- `002_cambio.sql`: añade `pagos.nombre_cambio` y actualiza `registrar_cobro` para el método «Cambio».
- `003_modalidad.sql`: añade `abonados.modalidad` (`mensual` o `extraordinario`) con valor por defecto `mensual`.

Sin estas migraciones las pantallas de sorteos, abonados y cobros fallarán.

## Base de datos

La app usa el cliente oficial `@supabase/postgrest-js` para consultas REST (sin auth ni realtime):

| Tabla | Columnas usadas |
| --- | --- |
| `sorteos` | `id`, `nombre`, `fecha`, `precio`, `decimos_iniciales`, `decimos_extra`, `created_at` |
| `abonados` | `id`, `nombre`, `activo`, `modalidad`, `created_at` |
| `pagos` | `id`, `abonado_id`, `sorteo_id`, `estado`, `fecha_pago`, `metodo_pago`, `nombre_cambio`, `created_at` |

Reglas:

- **Tipo de sorteo:** se deduce del nombre (`Navidad`, `Niño` o `Extraordinario`; si no, mensual).
- **Modalidad:** al crear o editar un abonado se elige «Mensual» (participa en los sorteos mensuales) o «Solo extraordinarios» (solo Navidad, Niño y extraordinarios). Se guarda en `abonados.modalidad`.
- **Suscripciones:** «Navidad» y «Niño» se deducen del historial de pagos; los abonados de solo extraordinarios siempre son elegibles en esos sorteos.
- **Stock:** disponible = `decimos_iniciales + decimos_extra - décimos vendidos`. Se muestra en las tarjetas, el detalle y la hoja de cobro.
- **Varios décimos:** cada fila de `pagos` es un décimo del abonado en el sorteo. El RPC valida y ajusta el stock de forma atómica.
- **Ampliación:** los sorteos no mensuales tienen un botón «Ampliar stock»; los mensuales fijan el inventario al crearse.
- **Métodos de pago:** efectivo, Bizum, tarjeta, transferencia y **Cambio** (solo Navidad/Niño). El cambio exige el nombre del décimo o persona y se guarda en `pagos.nombre_cambio`.
- **Teléfono:** no existe en el esquema; no se solicita.
- **Monto:** se calcula multiplicando los décimos cobrados por `sorteos.precio`.

## Estados de pago

- Sin fila en `pagos` o fila `pending`: Pendiente.
- Fila `paid`: Pagado.
- Fila `delivered`: Entregado.

## Scripts

```bash
npm start          # Metro + Expo
npm run android    # Abrir en Android
npm run ios        # Abrir en iOS (requiere macOS)
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Estructura

```
src/app/(tabs)        Inicio, Sorteos, Abonados y Cobros
src/app/sorteo        Alta y detalle de sorteo
src/app/abonado       Alta y detalle de abonado
src/app/cobro         Cobros por sorteo
src/components        UI y tarjetas
src/lib/api           Consultas Supabase
src/lib/derive.ts     Tipo, suscripciones y estados derivados
src/hooks/useAsync.ts Carga, recarga y refresco al enfocar
supabase/migrations   Migración de stock y varios décimos
```

Los iconos son SVG locales con `react-native-svg`, sin carga de fuentes de iconos.

## Generar un APK

Esta entrega se ejecuta en Expo Go o en un emulador. Para generar un APK de prueba se puede configurar EAS Build:

```bash
npx eas-cli build:configure
npx eas-cli build -p android --profile preview
```

No se incluye firma ni configuración de tienda en esta entrega.

## Seguridad

La publishable key permite leer y escribir porque las políticas RLS del proyecto
están abiertas a `anon`. Cualquiera que extraiga la clave del APK podría modificar
los datos. Si se necesita proteger la información, el siguiente paso es añadir
autenticación con Supabase Auth y políticas por usuario.

La secret key compartida durante la configuración debe rotarse y no debe incluirse
en la aplicación.
