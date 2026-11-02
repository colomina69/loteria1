# Lotería · Gestión de décimos y abonados

Aplicación Expo (React Native) para administrar sorteos, abonados y cobros de décimos.
Interfaz oscura con NativeWind v5 (Tailwind CSS v4) y persistencia directa en Supabase.

## Requisitos

- Node.js 20 o superior
- npm
- Expo Go en el móvil, un emulador Android o el APK de `dist/`
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
- `004_standalone_cambio.sql`: permite `pagos.abonado_id` nulo y añade `registrar_cambio_suelto` para cambios de décimo sin abonado.
- `005_monthly_auto_stock.sql`: amplía automáticamente el stock de los sorteos mensuales al cobrar.
- `006_security_invoker_and_index.sql`: ejecuta las RPC como `SECURITY INVOKER` y añade el índice de `pagos.abonado_id`.
- `007_abonado_telefono.sql`: añade `abonados.telefono` (opcional).
- `008_entrega_sin_cobro.sql`: separa `pagos.estado` (`pending`/`paid`) de `pagos.entregado` y añade la RPC `registrar_entrega`.

Sin estas migraciones las pantallas de sorteos, abonados y cobros fallarán.

## Base de datos

La app usa el cliente oficial `@supabase/postgrest-js` para consultas REST (sin auth ni realtime):

| Tabla | Columnas usadas |
| --- | --- |
| `sorteos` | `id`, `nombre`, `fecha`, `precio`, `decimos_iniciales`, `decimos_extra`, `created_at` |
| `abonados` | `id`, `nombre`, `telefono`, `activo`, `modalidad`, `created_at` |
| `pagos` | `id`, `abonado_id` (nulo en cambios sin abonado), `sorteo_id`, `estado`, `fecha_pago`, `metodo_pago`, `nombre_cambio`, `created_at` |

Reglas:

- **Tipo de sorteo:** se deduce del nombre (`Navidad`, `Niño` o `Extraordinario`; si no, mensual).
- **Temporada:** el contador anual de Inicio va del 1 de septiembre al 31 de agosto y se muestra como `2026/27`.
- **Modalidad:** al crear o editar un abonado se elige «Mensual» (participa en todos los sorteos) o «Solo extraordinarios» (solo Navidad, Niño y extraordinarios). Se guarda en `abonados.modalidad`.
- **Elegibilidad:** en la pantalla de cobro aparecen siempre todos los abonados activos de la modalidad correspondiente; ya no hay que activar «Incluir todos».
- **Stock:** disponible = `decimos_iniciales + decimos_extra - décimos activos - cambios sin abonado`. Un décimo está activo si está cobrado (`estado = 'paid'`) o entregado (`entregado = true`). En los sorteos mensuales el stock se amplía automáticamente al cobrar (no hay límite); en los extraordinarios sí se respeta el inventario.
- **Varios décimos:** cada fila de `pagos` es un décimo del abonado en el sorteo. El RPC valida y ajusta el stock de forma atómica.
- **Ampliación:** los sorteos no mensuales tienen un botón «Ampliar stock»; los mensuales amplían el stock automáticamente al cobrar.
- **Métodos de pago:** efectivo, Bizum, tarjeta, transferencia y **Cambio** (solo Navidad/Niño). El cambio exige el nombre del décimo o persona y se guarda en `pagos.nombre_cambio`.
- **Cambios sin abonado:** en sorteos extraordinarios se puede registrar un décimo cambiado por otro de otra entidad. Se guarda en `pagos` con `abonado_id = null`, descuenta stock y no aparece en el historial de ningún abonado.
- **Teléfono:** opcional en el alta y la edición del abonado (`abonados.telefono`).
- **Entrega y cobro separados:** se puede entregar un décimo sin cobrarlo (`entregado = true`, `estado = 'pending'`), aparece como «Entregado sin cobrar» y descuenta stock. Después se puede cobrar desde la hoja de cobro. «Dejar sin movimiento» anula cobro y entrega; «Deshacer entrega» solo retira la entrega.
- **Totales:** «Total vendido» = décimos activos × `sorteos.precio`; «Cobrado» = décimos de abonados cobrados × precio; «Debo por cambios» = cambios sin abonado × precio; «Debo por entregados sin cobrar» = entregados sin cobrar × precio.

## Estados de pago

- Sin fila en `pagos`, o `pending` sin entregar: Pendiente.
- `pending` + `entregado`: Entregado sin cobrar.
- `paid` sin entregar: Pagado.
- `paid` + `entregado`: Entregado.
- Mezcla de cobrados y entregados sin cobrar: Parcial.

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
supabase/migrations   Migraciones de stock, cambios, modalidad y seguridad
```

Los iconos son SVG locales con `react-native-svg`, sin carga de fuentes de iconos.

## APK

La APK standalone está en **`dist/Loteria-1.0.0.apk`** (Android 7+, `arm64-v8a`, ~32 MB).
No necesita Expo Go ni Metro; conecta directamente con Supabase.

Para instalarla:

1. Copia el archivo al móvil.
2. Ábrelo y permite «Instalar apps desconocidas».
3. Si ya había una versión con otra firma, desinstálala primero.

Por USB con depuración activa:

```bash
adb install -r dist/Loteria-1.0.0.apk
```

Está firmada con la clave de depuración de Android, suficiente para uso personal.
Para publicar en Play Store hay que generar un keystore de release y configurar la firma.

### Compilar localmente

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Requiere JDK 17/21 y Android SDK. En Windows, si la ruta del proyecto es muy larga
(OneDrive), compila desde una copia en una ruta corta (por ejemplo `C:\l1`) con
Ninja 1.12 o superior. El APK queda en `android/app/build/outputs/apk/release/`.

## Seguridad

- Las políticas RLS están abiertas a `anon` porque la app es personal y no tiene login.
  Cualquiera que extraiga la publishable key del APK podría modificar los datos.
- Las RPC se ejecutan como `SECURITY INVOKER` y los advisors de Supabase están limpios.
- **Acción manual pendiente:** rotar la secret key compartida durante la configuración
  en Supabase → Settings → API.
- Si se quiere proteger la información: activar Supabase Auth, añadir pantalla de login
  y cambiar las políticas RLS a `authenticated`.
