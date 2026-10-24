# 🔥 Guía de Publicación y Conexión con Google Firebase

Esta guía detalla cómo publicar el sistema **Dulce Menta** en **Google Firebase Hosting** directamente desde el repositorio de **GitHub**, además de cómo utilizar **Google Cloud Firestore** para tener una base de datos en tiempo real compartida entre celulares, tablets y computadoras sin depender de un servidor físico local.

---

## 📋 Índice
1. [Correcciones Realizadas en el Código](#-correcciones-realizadas-en-el-código)
2. [Arquitectura Híbrida: Servidor Local, Firebase y Modo Demo](#-arquitectura-híbrida)
3. [Paso 1: Crear el Proyecto en Google Firebase](#paso-1-crear-el-proyecto-en-google-firebase)
4. [Paso 2: Activar la Base de Datos Cloud Firestore](#paso-2-activar-la-base-de-datos-cloud-firestore)
5. [Paso 3: Obtener las Credenciales Web de Firebase](#paso-3-obtener-las-credenciales-web-de-firebase)
6. [Paso 4: Conectar la Aplicación con Firebase](#paso-4-conectar-la-aplicación-con-firebase)
7. [Paso 5: Configurar el Despliegue Automático desde GitHub](#paso-5-configurar-el-despliegue-automático-desde-github)
8. [Opción Alternativa: Despliegue Manual con Firebase CLI](#-opción-alternativa-despliegue-manual-con-firebase-cli)

---

## 🛠️ Correcciones Realizadas en el Código

Durante la auditoría del proyecto se identificaron y resolvieron los siguientes errores:

1. **Modal de Edición de Pedidos Faltante (`modal-edit-order`):**
   - *Problema:* Al hacer clic en el botón de lápiz (`✏️`) de cualquier pedido para editar fecha, hora o dirección, la aplicación fallaba con el error `TypeError: Cannot set properties of null (setting 'value')` porque el modal y sus campos (`edit-order-id`, `edit-order-delivery-date`, etc.) no existían en el HTML.
   - *Solución:* Se implementó el modal completo con diseño deslizable (*bottom sheet*), selección de entrega (retiro/domicilio) y guardado reactivo.

2. **Error de Función en Pestañas de Finanzas (`filterMetricsPeriod`):**
   - *Problema:* Los botones de filtrado (*Hoy*, *7 Días*, *Este Mes*, *Histórico*) invocaban `filterMetricsPeriod(...)`, pero la función en JavaScript se llamaba `loadMetrics(...)`, arrojando `ReferenceError: filterMetricsPeriod is not defined`.
   - *Solución:* Se expuso globalmente `window.filterMetricsPeriod` vinculado a `loadMetrics` y con actualización de clases activas en los chips.

3. **Pérdida Fantasma de Stock al Eliminar Clientes con Pedidos Descontados:**
   - *Problema:* En `src/routes/customers.js`, al eliminar un cliente con `force=true`, los pedidos y productos se eliminaban pero el stock de insumos previamente descontados no se restituía al inventario.
   - *Solución:* Se agregó la restauración automática de materias primas con registro de movimiento de reingreso tipo `ENTRADA` antes de la eliminación en cascada.

4. **Falta de Propiedad `.data` en Errores de Simulación Local:**
   - *Problema:* Al intentar borrar insumos en recetas o productos con pedidos en modo estático, `app.js` verificaba `err.data.in_recipes` o `err.data.has_orders`, los cuales eran `undefined`, impidiendo que aparecieran los diálogos de confirmación forzada.
   - *Solución:* Se estandarizó la función `err(msg, data)` para adjuntar siempre el objeto de metadatos.

5. **Falta de Adaptador para Publicación Estática en la Nube:**
   - *Problema:* El frontend en `public/js/api.js` dependía exclusivamente del backend Express en `/api`. Al publicarse en GitHub Pages o Firebase Hosting, todas las peticiones fallaban con error `404 Not Found`.
   - *Solución:* Se desarrolló un cliente universal multi-entorno que autodetecta si existe Express, si hay credenciales de Google Firebase Firestore, o si debe usar almacenamiento local de demostración.

---

## 🌐 Arquitectura Híbrida

El sistema ahora soporta 3 modos de datos conmutables con un solo clic desde el nuevo botón **`🔥 Cloud`** en la barra superior:

| Modo | Entorno Típico | Base de Datos | Sincronización Multi-dispositivo |
| :--- | :--- | :--- | :--- |
| **Servidor Local** | Windows PC con `INICIAR_PANADERIA.bat` | SQLite local (`bakery.db`) | En la misma red Wi-Fi local |
| **Google Firebase** | Firebase Hosting o GitHub Pages | Google Cloud Firestore | **Mundial en tiempo real** (en cualquier lugar con internet) |
| **Modo Local / Demo** | Vista previa en navegador o sin internet | Navegador (`localStorage`) | Individual por navegador / offline |

---

## Paso 1: Crear el Proyecto en Google Firebase

1. Ingresa a la consola de Google Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/) con tu cuenta de Google.
2. Haz clic en **"Agregar proyecto"** (o *"Crear proyecto"*).
3. Escribe un nombre para el proyecto (por ejemplo: `dulce-menta-panaderia`).
4. (Opcional) Puedes deshabilitar Google Analytics para simplificar la configuración.
5. Haz clic en **"Crear proyecto"** y espera unos segundos a que se inicialice.

---

## Paso 2: Activar la Base de Datos Cloud Firestore

1. En el menú lateral izquierdo de tu proyecto de Firebase, ve a **Compilación (Build)** ➔ **Firestore Database**.
2. Haz clic en el botón **"Crear base de datos"**.
3. En la ubicación del servidor, selecciona la más cercana (por ejemplo: `nam5 (us-central)` o `southamerica-east1`).
4. En las reglas de seguridad iniciales, selecciona **"Comenzar en modo de prueba"** (esto permite leer y escribir datos de inmediato).
5. Haz clic en **"Habilitar"**.

> **Nota:** El archivo `firestore.rules` ya incluido en la raíz del repositorio contiene las reglas de seguridad configuradas para la panadería.

---

## Paso 3: Obtener las Credenciales Web de Firebase

1. En la consola de Firebase, ve al ícono de engranaje ⚙️ (arriba a la izquierda junto a "Descripción general del proyecto") y selecciona **"Configuración del proyecto"**.
2. En la pestaña **General**, baja hasta la sección **"Tus apps"**.
3. Haz clic en el ícono de la web **`</>`** para registrar una aplicación web.
4. Escribe un apodo (ej: `Dulce Menta Web`).
5. Marca la casilla **"Configurar también Firebase Hosting para esta app"**.
6. Haz clic en **"Registrar app"**.
7. Verás un bloque de código con el objeto `firebaseConfig`. Copia el contenido entre llaves:

```json
{
  "apiKey": "AIzaSyD-EjemploClave123456789",
  "authDomain": "tu-proyecto.firebaseapp.com",
  "projectId": "tu-proyecto",
  "storageBucket": "tu-proyecto.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef123456"
}
```

---

## Paso 4: Conectar la Aplicación con Firebase

Tienes dos formas muy sencillas de aplicar esta configuración:

### Opción A: Desde la propia aplicación (Recomendada)
1. Abre el sistema en tu navegador.
2. Haz clic en el botón **`🔥 Cloud`** en la esquina superior derecha del encabezado.
3. En el campo **"Modo de Base de Datos"**, selecciona **"Google Firebase (Cloud Firestore en Vivo)"**.
4. Pega tu JSON de configuración de Firebase en el cuadro de texto.
5. Haz clic en **"Probar Conexión"**. Recibirás un aviso verde: *"¡Conexión a Firebase exitosa!"*.
6. Haz clic en **"Guardar Ajustes"**.
7. Si es tu primera vez en Firebase, haz clic en el botón **"Sembrar Datos en la Nube"** para cargar automáticamente los 21 ingredientes, 5 productos con recetas y clientes de ejemplo en Firestore.

### Opción B: Mediante archivo de configuración
Abre el archivo `public/js/firebase-config.js` y pega tus valores en el objeto `defaultFirebaseConfig`:
```javascript
const defaultFirebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

---

## Paso 5: Configurar el Despliegue Automático desde GitHub

El repositorio ya cuenta con el archivo de integración continua listo en:
[`.github/workflows/firebase-hosting-merge.yml`](file:///.github/workflows/firebase-hosting-merge.yml).

Para que GitHub tenga permiso de publicar automáticamente en tu Firebase Hosting cada vez que hagas un `git push`:

1. Instala Firebase CLI en tu computadora (o usa `npx`):
   ```powershell
   npx firebase-tools login:ci
   ```
   Se abrirá una ventana en tu navegador para que autorices a Firebase. Al finalizar, la terminal te entregará un **Token de Acceso** o cuenta de servicio.

2. También puedes generar la clave de cuenta de servicio de Firebase:
   - En Firebase Console ➔ **Configuración del proyecto** ⚙️ ➔ **Cuentas de servicio**.
   - Haz clic en **"Generar nueva clave privada"**. Se descargará un archivo `.json`.
   - Abre ese archivo `.json` con un editor de texto y copia todo su contenido.

3. Configura el secreto en tu repositorio de GitHub:
   - Ve a tu nuevo repositorio en GitHub (`https://github.com/reivancr/sistema_reposteria`).
   - Haz clic en **Settings** ➔ **Secrets and variables** ➔ **Actions**.
   - Haz clic en **"New repository secret"**.
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: Pega el contenido del archivo `.json` de la cuenta de servicio (o el token).
   - Haz clic en **"Add secret"**.
   - (Opcional) Crea otro secreto `FIREBASE_PROJECT_ID` con el ID de tu proyecto de Firebase (ej: `dulce-menta-panaderia`).

4. ¡Listo! A partir de este momento, cada vez que hagas `git push origin main`, GitHub Actions desplegará automáticamente la última versión de tu aplicación en tu dominio de Firebase Hosting:
   `https://tu-proyecto.web.app`

---

## ⚡ Opción Alternativa: Despliegue Manual con Firebase CLI

Si prefieres desplegar directamente desde tu terminal sin esperar a GitHub Actions:

1. Inicia sesión en Firebase:
   ```powershell
   npx firebase-tools login
   ```
2. Asocia tu proyecto:
   ```powershell
   npx firebase-tools use --add
   ```
   (Selecciona tu proyecto de la lista).
3. Despliega a Firebase Hosting:
   ```powershell
   npx firebase-tools deploy --only hosting
   ```
4. La terminal te devolverá la URL pública inmediata de tu sistema (ej: `https://mi-panaderia.web.app`).

---

## 📱 Acceso de Celulares y Tablets
Una vez publicado en Firebase Hosting:
- Puedes abrir el enlace `https://tu-proyecto.web.app` desde cualquier celular Android, iPhone o tablet iPad en el mostrador o cocina.
- Al usar Google Cloud Firestore, cualquier pedido o ajuste de inventario realizado en un teléfono se refleja instantáneamente en las demás pantallas.
