# Documento de Requisitos del Producto (PRD)
## Aplicación para Gestión de Décimos y Abonados de Lotería

---

## 1. Visión General del Producto
La aplicación está diseñada para automatizar y simplificar la administración de la venta de décimos de lotería a abonados recurrentes (mensuales) y participantes en sorteos extraordinarios (Navidad y El Niño). Permite llevar un control preciso de inventario de décimos, estados de pago de abonados y emisión/registro de asignaciones en tiempo real.

---

## 2. Objetivos del Proyecto
* **Centralización de datos:** Almacenar y sincronizar abonados, sorteos e inventarios en una base de datos segura (Supabase).
* **Control de Stock Dinámico:** Gestionar la cantidad disponible de décimos y permitir la ampliación de inventario en sorteos extraordinarios.
* **Trazabilidad de Cobros:** Controlar en tiempo real los décimos cobrados y los pendientes de pago por cada sorteo.
* **Experiencia de Usuario Eficiente:** Ofrecer una interfaz moderna, limpia y rápida basada en React Native (Expo) con estilos Tailwind (NativeWind).

---

## 3. Perfiles de Usuario (User Personas)
* **Administrador / Gestor de Lotería:** Persona encargada de dar de alta sorteos, registrar nuevos abonados, aumentar el cupo de décimos consignados y marcar las ventas o cobros a medida que los abonados pagan.

---

## 4. Requisitos Funcionales

### 4.1. Gestión de Sorteos
* **Alta de Sorteos:** Permite ingresar nombre, fecha de celebración, precio por décimo, cantidad inicial de décimos consignados y tipo de sorteo (`mensual`, `navidad`, `nino`, `extraordinario`).
* **Ampliación de Inventario:** Opción para añadir décimos adicionales a sorteos no mensuales (e.g. consignación extra recibida).
* **Visualización de Stock:** Muestra la relación entre décimos vendidos y décimos disponibles por sorteo.

### 4.2. Gestión de Abonados
* **Alta de Abonado:** Registro de datos personales (nombre completo y teléfono).
* **Suscripciones del Abonado:** Flags para identificar si participa en:
  * Sorteo Mensual Habitual.
  * Sorteo de Navidad.
  * Sorteo del Niño.
* **Listado de Abonados:** Muestra todos los clientes registrados y sus tipos de suscripción activa.

### 4.3. Registro y Control de Pagos
* **Filtrado por Sorteo:** Selección del sorteo activo para ver el listado de abonados.
* **Acción de Cobro:** Permitir marcar un décimo como "Cobrado", generando un registro en la tabla `registro_pagos` con fecha y monto.
* **Actualización Automática de Inventario:** Cada vez que se confirma un cobro, el número de décimos disponibles para el sorteo debe reducirse automáticamente en 1 unidad.
* **Estado de Pago:** Indicación clara en el listado de abonados sobre si el pago está `pendiente` o `pagado`.

---

## 5. Requisitos No Funcionales
* **Rendimiento:** Tiempos de respuesta de lectura/escritura en base de datos inferiores a 1 segundo.
* **Compatibilidad Multiplataforma:** Desarrollo mediante Expo (React Native) para permitir ejecución en Android e iOS.
* **Persistencia:** Integración directa mediante SDK de Supabase con conexión segura mediante API keys.
* **Interfaz de Usuario (UI/UX):** Estética moderna en modo oscuro (*Dark Mode*) construida con Tailwind CSS / NativeWind.



---

## 7. Fases de Desarrollo

* **Fase 1:** Configuración del entorno Expo, Tailwind/NativeWind y SDK de Supabase.
* **Fase 2:** Implementación de pantallas de ABM (Alta, Baja, Modificación) para Sorteos y Abonados.
* **Fase 3:** Lógica de asignación de décimos y actualización en cascada de inventario tras realizar pagos.
* **Fase 4:** Pruebas de integración, verificación de bordes (stock en 0) y refinamiento de UI/UX.