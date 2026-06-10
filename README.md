# SISARM — Sistema de Clasificación Arancelaria y Gestión de Mercancías

Aplicación web full-stack para despachantes de aduana en Bolivia. Permite buscar mercancías en el Arancel Aduanero Boliviano, consultar documentación legal de respaldo, calcular tributos sobre valor CIF y gestionar acceso seguro mediante autenticación con recuperación de contraseña por email.

**Stack:** Django (backend) + React + Vite (frontend) + PostgreSQL.

---

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación de software base](#2-instalación-de-software-base)
3. [Clonar el repositorio](#3-clonar-el-repositorio)
4. [Configurar la base de datos](#4-configurar-la-base-de-datos)
5. [Crear el entorno Python — elegir Ruta A o Ruta B](#5-crear-el-entorno-python--elegir-ruta-a-o-ruta-b)
6. [Configurar y poblar el backend (pasos comunes)](#6-configurar-y-poblar-el-backend-pasos-comunes)
7. [Configurar el frontend](#7-configurar-el-frontend)
8. [Ejecutar el sistema](#8-ejecutar-el-sistema)
9. [Credenciales de prueba](#9-credenciales-de-prueba)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Resolución de problemas comunes](#11-resolución-de-problemas-comunes)

---

## 1. Requisitos previos

Software que debe estar instalado en su computadora:

| Software           | Versión recomendada | Para qué se usa                                  |
|--------------------|---------------------|--------------------------------------------------|
| Conda (Miniconda)  | 23 o superior       | Crear el entorno Python del backend (Ruta A)     |
| Python             | 3.13                | Ejecutar el backend Django (solo si usa Ruta B)  |
| PostgreSQL         | 15 o superior       | Base de datos                                    |
| Node.js            | 18 o superior       | Ejecutar el frontend React                       |
| Git                | Cualquier versión   | Clonar el repositorio                            |

> **Importante:** el backend se instala con **una** de dos rutas alternativas. **Elija una y siga solo esa.**
> - **Ruta A — conda + `environment.yml`** (recomendada). Trae Python 3.13 incluido en el entorno.
> - **Ruta B — `venv` + `requirements.txt`** (alternativa). Requiere tener Python 3.13 ya instalado en el sistema.

---

## 2. Instalación de software base

### 2.1 Conda (Miniconda) — solo si va a usar Ruta A

Descargue Miniconda desde [https://www.anaconda.com/download/success](https://www.anaconda.com/download/success) (sección "Miniconda Installers") e instálelo con los valores por defecto.

#### Cómo abrir el prompt de conda (Windows)

Tras instalar Miniconda o Anaconda, tiene **tres maneras** de obtener una terminal con conda activado. Elija la que le resulte más cómoda:

1. **Desde el menú Inicio (la más rápida).** Presione la tecla **Windows** y escriba `Anaconda Prompt` o `Miniconda Prompt`. Es un acceso directo que ya viene configurado con conda activo. Verá `(base)` al inicio del prompt.

2. **Desde PowerShell o CMD existente.** Si abre una PowerShell o CMD normal, conda **no estará disponible** hasta que lo inicialice una vez con:
   ```
   conda init powershell
   ```
   (o `conda init cmd.exe` para CMD). Cierre la ventana, abra una nueva, y debería ver `(base)` al inicio.

3. **Desde Git Bash o WSL.** Si usa Git Bash o WSL, ejecute `conda init bash` desde el Anaconda Prompt una vez, cierre y vuelva a abrir.

> Si su terminal **no muestra `(base)`** al inicio, conda no está activo y los comandos `conda env create ...` o `conda activate ...` van a fallar. Vuelva a la opción 1 o 2 antes de continuar.

#### Verificación

Con el prompt de conda abierto, ejecute:
```
conda --version
```
Debe mostrar algo como `conda 24.x.x`.

Si ya tiene Anaconda instalada, no necesita Miniconda — sirve igual.

### 2.2 Python 3.13 — solo si va a usar Ruta B

Descargue desde [https://www.python.org/downloads/](https://www.python.org/downloads/) **Python 3.13**. Durante la instalación marque la casilla **"Add Python to PATH"**.

Verifique:
```
python --version
```
Debe mostrar `Python 3.13.x`. Versiones anteriores (3.11, 3.12) no son compatibles con las dependencias del proyecto.

### 2.3 PostgreSQL

Descargue desde [https://www.postgresql.org/download/](https://www.postgresql.org/download/) y siga el instalador. Durante la instalación le pedirá una contraseña para el usuario `postgres` — **anótela**, la necesitará en el paso 4.

El instalador también incluye **pgAdmin**, una herramienta gráfica para administrar la BD.

### 2.4 Node.js

Descargue desde [https://nodejs.org/](https://nodejs.org/) (versión LTS). Verifique:
```
node --version
npm --version
```

### 2.5 Git

Descargue desde [https://git-scm.com/downloads](https://git-scm.com/downloads). Acepte los valores por defecto.

---

## 3. Clonar el repositorio

Abra una terminal en la carpeta donde quiera guardar el proyecto (por ejemplo `C:\Users\TuUsuario\Documentos\` en Windows o `~/Proyectos/` en Linux/Mac) y ejecute:

```
git clone https://github.com/LIONKAI/SISARM.git
cd SISARM
```

Después del `cd SISARM` la terminal queda **dentro** de la carpeta del proyecto. Esa carpeta es la que en este README se llama **"raíz del proyecto"** o **"carpeta `SISARM/`"**: contiene `manage.py`, `environment.yml`, `requirements.txt`, `frontend/`, `backend/`, `api/`, etc.

> **Importante:** salvo cuando el README diga explícitamente lo contrario (sección 7 frontend), todos los comandos posteriores deben ejecutarse **estando ubicados en esta raíz**. Si abre una nueva terminal en otro momento, lo primero que debe hacer es navegar a esta carpeta con `cd ruta\donde\esté\SISARM` antes de cualquier otro comando.
>
> Para verificar dónde está parado:
> - **Windows:** `cd` (sin argumentos) o `dir manage.py` — si lista el archivo, está en el lugar correcto.
> - **Linux/Mac:** `pwd` y `ls manage.py`.

---

## 4. Configurar la base de datos

### 4.1 Crear la base de datos

Abra **pgAdmin** (instalado junto con PostgreSQL). En el panel izquierdo:

1. Expanda **Servers** y conéctese con la contraseña del usuario `postgres`.
2. Clic derecho sobre **Databases** → **Create** → **Database...**
3. En "Database" escriba: `sisarm_db`
4. Clic en **Save**.

### 4.2 Verificar credenciales

El archivo `backend/settings.py` tiene configurado por defecto el usuario `postgres` con la contraseña `dorolan3`. Si su PostgreSQL usa una contraseña distinta:

**Opción A** (recomendada): edite `backend/settings.py` y reemplace `dorolan3` por su contraseña en la sección de "Desarrollo local".

**Opción B**: defina `DATABASE_URL` en el archivo `.env` con su propia URL de conexión.

---

## 5. Crear el entorno Python — elegir Ruta A o Ruta B

> ⚠️ **Elija solo una de las dos rutas siguientes.** No ejecute ambas. Cuando termine la ruta elegida, continúe al paso 6.

---

### 🅰️ Ruta A — conda + environment.yml (recomendada)

**Prerrequisito:** Miniconda instalado (paso 2.1) y prompt de conda abierto (subsección "Cómo abrir el prompt de conda" del paso 2.1). El prompt debe mostrar `(base)` al inicio.

**Ubicación:** la terminal debe estar **dentro de la carpeta `SISARM/`** (la que se creó al clonar). Si no lo está, navegue con `cd ruta\hacia\SISARM`. Verifique con `dir environment.yml` (Windows) o `ls environment.yml` (Linux/Mac) — el archivo debe aparecer.

Una vez ubicado en la raíz, ejecute:

```
conda env create -f environment.yml
```

Este comando crea un entorno llamado `sisarm` con Python 3.13 y todas las dependencias del backend. Tarda 3-5 minutos la primera vez.

Active el entorno:

```
conda activate sisarm
```

El prompt debería mostrar `(sisarm)` al inicio. **Cada vez** que abra una nueva terminal para trabajar en el backend deberá ejecutar `conda activate sisarm` antes de cualquier comando.

Para actualizar el entorno tras un `git pull` futuro:
```
conda env update -f environment.yml --prune
```

✅ **Listo con Ruta A. Continúe al paso 6.**

---

### 🅱️ Ruta B — venv + requirements.txt (alternativa, sin conda)

**Prerrequisito:** Python 3.13 instalado en el sistema (paso 2.2). No funcionará con Python 3.11 ni 3.12.

**Ubicación:** la terminal debe estar **dentro de la carpeta `SISARM/`** (la que se creó al clonar). Verifique con `dir requirements.txt` (Windows) o `ls requirements.txt` (Linux/Mac) — el archivo debe aparecer.

Una vez ubicado en la raíz, cree el entorno virtual:

```
python -m venv venv
```

Active el entorno:

- **Windows (PowerShell):** `.\venv\Scripts\activate`
- **Windows (CMD):** `venv\Scripts\activate.bat`
- **Linux/Mac:** `source venv/bin/activate`

El prompt debería mostrar `(venv)` al inicio. **Cada vez** que abra una nueva terminal deberá reactivarlo con el mismo comando.

Instale las dependencias:

```
pip install --upgrade pip
pip install -r requirements.txt
```

> El archivo se llama **`requirements.txt`** (no "requeriments.txt"). Si pip responde "No such file or directory", revise la ortografía y que esté ejecutando el comando desde la raíz del proyecto.

✅ **Listo con Ruta B. Continúe al paso 6.**

---

## 6. Configurar y poblar el backend (pasos comunes)

> Esta sección **es igual para ambas rutas**. Antes de empezar confirme dos cosas:
> 1. **Ubicación:** la terminal debe seguir estando en la raíz del proyecto (carpeta `SISARM/`, donde está `manage.py`). Verifique con `dir manage.py` (Windows) o `ls manage.py` (Linux/Mac).
> 2. **Entorno activo:** el prompt debe mostrar `(sisarm)` (Ruta A) o `(venv)` (Ruta B) al inicio. Si no, vuelva al paso 5 y actívelo.
>
> **Todos los comandos de esta sección 6 se ejecutan desde la raíz del proyecto, no desde `frontend/` ni desde `backend/`.**

### 6.1 Configurar variables de entorno

Copie el archivo `.env.example` a `.env` en la raíz del proyecto:

- **Windows:** `copy .env.example .env`
- **Linux/Mac:** `cp .env.example .env`

Abra `.env` en un editor de texto y complete los valores marcados con `<CORCHETES>`. En particular:

- **EMAIL_HOST_USER** y **EMAIL_HOST_PASSWORD**: necesarios para que funcione la recuperación de contraseña por email. Siga las instrucciones dentro del propio `.env.example` para generar una "contraseña de aplicación" de Gmail.

### 6.2 Aplicar migraciones (crear tablas)

```
python manage.py migrate
```

Verá una lista de migraciones aplicándose. Al final debe terminar sin errores.

### 6.3 Cargar los aranceles

El proyecto incluye 3 archivos JSON con los primeros 3 capítulos del Arancel Aduanero Boliviano. Cárguelos en la BD:

```
python cargar_consolidado.py arancel_01.json arancel_02.json arancel_03.json
```

Debería ver el resumen:
```
Capítulos:      3
Nodos totales:  507
Hojas:          355
Documentos:     303
Preferencias:   2485
```

### 6.4 Crear un superusuario

```
python manage.py createsuperuser
```

Complete usuario, email y contraseña. Esta cuenta le permitirá entrar al sistema y al panel de administración de Django.

---

## 7. Configurar el frontend

> La primera terminal (la del backend) **debe quedar abierta**. No la cierre ni use Ctrl+C todavía. Para el frontend abrirá una **segunda terminal independiente**.

### 7.1 Abrir una segunda terminal en la carpeta del proyecto

Abra una nueva ventana de terminal (PowerShell, CMD, Anaconda Prompt o la que prefiera — para el frontend no importa porque **no se usa conda ni venv aquí**, npm es independiente).

Navegue hasta **la misma carpeta `SISARM/` donde clonó el proyecto** en el paso 3. Por ejemplo:

```
cd C:\Users\TuUsuario\Documentos\SISARM
```

(Reemplace `C:\Users\TuUsuario\Documentos\SISARM` por la ruta real donde tenga el proyecto en su computadora.)

Verifique que está en la raíz:
- **Windows:** `dir frontend` debe listar la carpeta `frontend/`.
- **Linux/Mac:** `ls frontend` debe listar la carpeta `frontend/`.

### 7.2 Entrar a la carpeta `frontend/`

Desde la raíz del proyecto, entre a la subcarpeta del frontend:

```
cd frontend
```

A partir de aquí su terminal está dentro de `SISARM/frontend/`. **Todos los comandos del frontend (npm install, npm run dev) deben ejecutarse desde aquí**, no desde la raíz, no desde `backend/`, no desde ningún otro lado.

Verifique con:
- **Windows:** `dir package.json` debe listar el archivo.
- **Linux/Mac:** `ls package.json` debe listar el archivo.

### 7.3 Instalar dependencias del frontend

Estando **dentro de `SISARM/frontend/`**, ejecute:

```
npm install
```

Esto descarga e instala todas las dependencias de React/Vite en una carpeta `node_modules/` que se crea dentro de `frontend/`. Tarda 1-2 minutos la primera vez. Verá una barra de progreso y al final un resumen con la cantidad de paquetes instalados. Si aparecen warnings amarillos puede ignorarlos; solo los errores rojos importan.

> Si `npm install` falla con "ENOENT package.json no encontrado", está en la carpeta equivocada. Vuelva a 7.2.

### 7.4 Crear el archivo `.env` del frontend

Estando **dentro de `SISARM/frontend/`** (no en la raíz), cree un archivo nuevo llamado `.env` con este único contenido:

```
VITE_API_URL=http://127.0.0.1:8080/api
```

> **Importante:** este `.env` es **distinto** del `.env` de la raíz que creó en el paso 6.1. Son dos archivos `.env` separados, en dos carpetas distintas, con distintas variables. No los confunda ni los mezcle.

Para crearlo rápido desde la terminal:
- **Windows (PowerShell):** `echo "VITE_API_URL=http://127.0.0.1:8080/api" | Out-File -Encoding utf8 .env`
- **Windows (CMD):** `echo VITE_API_URL=http://127.0.0.1:8080/api > .env`
- **Linux/Mac:** `echo "VITE_API_URL=http://127.0.0.1:8080/api" > .env`

O bien créelo manualmente con cualquier editor de texto (VS Code, Notepad, nano) guardándolo dentro de `SISARM/frontend/.env`.

---

## 8. Ejecutar el sistema

El sistema necesita **dos procesos corriendo simultáneamente**, cada uno en su propia terminal. No los combine en una sola ventana.

| Terminal   | Carpeta donde se ejecuta            | Entorno     | Comando                          |
|------------|-------------------------------------|-------------|----------------------------------|
| Terminal 1 | Raíz del proyecto (`SISARM/`)       | conda/venv  | `python manage.py runserver 8080` |
| Terminal 2 | Subcarpeta `SISARM/frontend/`       | (ninguno)   | `npm run dev`                     |

### Terminal 1 — Backend

Esta es la **primera terminal**, la que vino usando desde el paso 5. Debe cumplir:

1. **Ubicación:** raíz del proyecto, la carpeta `SISARM/` donde está `manage.py`. Si no está ahí, navegue con `cd ruta\hacia\SISARM`.
2. **Entorno activo:** el prompt muestra `(sisarm)` o `(venv)` al inicio. Si no, actívelo:
   - **Ruta A:** `conda activate sisarm`
   - **Ruta B (Windows PowerShell):** `.\venv\Scripts\activate`
   - **Ruta B (Windows CMD):** `venv\Scripts\activate.bat`
   - **Ruta B (Linux/Mac):** `source venv/bin/activate`

Luego ejecute:
```
python manage.py runserver 8080
```

Verá:
```
Starting development server at http://127.0.0.1:8080/
```

**No cierre esta terminal ni presione Ctrl+C** mientras esté usando el sistema. Mientras no aparezca un nuevo prompt, el servidor sigue corriendo — eso es lo correcto.

### Terminal 2 — Frontend

Esta es la **segunda terminal**, la que abrió en el paso 7.1. Debe cumplir:

1. **Ubicación:** subcarpeta `SISARM/frontend/`, no la raíz del proyecto. Verifique con `dir package.json` (Windows) o `ls package.json` (Linux/Mac). Si está en la raíz, ejecute `cd frontend`.
2. **Entorno:** ninguno. No active conda ni venv aquí.

Luego ejecute:
```
npm run dev
```

Verá:
```
Local:   http://localhost:5173/
```

Igual que con el backend, **no cierre esta terminal** mientras use el sistema.

### Acceder a la aplicación

Con **ambas** terminales corriendo, abra su navegador favorito y visite:
```
http://localhost:5173/
```

Para el panel de administración de Django:
```
http://127.0.0.1:8080/admin/
```

### Detener el sistema

Cuando termine, presione **Ctrl+C** en cada terminal por separado. Las dependencias y la BD quedan intactas — la próxima vez solo necesita reactivar el entorno (`conda activate sisarm`) y volver a correr `python manage.py runserver 8080` + `npm run dev` (desde sus carpetas correspondientes).

---

## 9. Credenciales de prueba

Use el superusuario que creó en el paso 6.4, o cree un usuario nuevo desde la pantalla de registro de la aplicación.

**Reglas de validación del registro (HU 1.1 v2):**
- Usuario: 3-20 caracteres, sin espacios. Solo letras, números, "_", "." y "-".
- Contraseña: mínimo 8 caracteres, con al menos una letra, un número y un símbolo.

**Probar recuperación de contraseña (HU 1.2):**

Use un correo que esté registrado en el sistema. El enlace de recuperación se enviará a ese correo. Requiere que `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD` estén correctamente configurados en `.env`.

---

## 10. Estructura del proyecto

```
SISARM/
│
├── api/                    Aplicación principal de Django (modelos, vistas, lógica)
│   ├── models.py           Modelo de datos consolidado (7 tablas)
│   ├── views.py            Endpoints REST (búsqueda, autenticación, recuperación)
│   └── migrations/         Migraciones de la base de datos
│
├── backend/                Configuración del proyecto Django
│   ├── settings.py         Configuración general
│   └── urls.py             Enrutamiento principal
│
├── aduanas/                Aplicación auxiliar
│
├── frontend/               Aplicación React + Vite
│   ├── src/
│   │   ├── App.jsx                 Componente raíz con ruteo
│   │   ├── Auth.jsx                Login, registro y solicitud de recuperación
│   │   ├── BuscadorArancel.jsx     Buscador con ficha y calculadora CIF
│   │   ├── ExploradorArancel.jsx   Navegación jerárquica del arancel
│   │   └── RestablecerPassword.jsx Pantalla de nueva contraseña
│   └── package.json
│
├── arancel_01.json         Datos del Capítulo 1 — Animales vivos
├── arancel_02.json         Datos del Capítulo 2 — Carne
├── arancel_03.json         Datos del Capítulo 3 — Pescados
├── cargar_consolidado.py   Script para poblar la BD con los JSON
├── environment.yml         Entorno conda (Ruta A — recomendada)
├── requirements.txt        Dependencias pip (Ruta B — alternativa)
├── manage.py               Punto de entrada de Django
├── .env.example            Plantilla de variables de entorno
└── README.md               Este archivo
```

---

## 11. Resolución de problemas comunes

**`pip install -r requirements.txt` responde "No such file or directory":**
Revise la ortografía — el archivo se llama `requirements.txt`, no `requeriments.txt`. Confirme que está en la raíz del proyecto con `ls` (Linux/Mac) o `dir` (Windows).

**`pip install -r requirements.txt` falla con errores de versión de Python:**
Las dependencias requieren **Python 3.13**. Verifique con `python --version`. Si tiene 3.11 o 3.12, instale Python 3.13 (paso 2.2) o use la Ruta A con conda, que ya trae la versión correcta.

**`conda env create -f environment.yml` falla:**
Ejecute primero `conda update -n base conda` para actualizar conda. Si el problema persiste, elimine un entorno previo con `conda env remove -n sisarm` y vuelva a crearlo.

**Error "Connection refused" al iniciar Django:**
La BD PostgreSQL no está corriendo. Inicie el servicio de PostgreSQL desde los servicios de Windows o desde pgAdmin.

**Error "password authentication failed":**
La contraseña de PostgreSQL en su computadora no coincide con la del `settings.py`. Ajuste como se indica en el paso 4.2.

**El frontend no encuentra el backend:**
Verifique que `VITE_API_URL=http://127.0.0.1:8080/api` esté en `frontend/.env` y que ambos servidores estén corriendo.

**No llega el email de recuperación:**
Verifique que la "contraseña de aplicación" de Gmail esté correctamente generada y copiada sin espacios en `.env`. Revise la carpeta de Spam en su correo.

**`npm install` responde "ENOENT package.json no encontrado":**
Está ejecutando el comando desde la carpeta equivocada. `npm install` solo funciona **dentro de `SISARM/frontend/`**, donde está el `package.json` del frontend. Ejecute `cd frontend` desde la raíz del proyecto y vuelva a intentar.

**`python manage.py ...` responde "No such file or directory" o "can't open file 'manage.py'":**
Está ejecutando el comando desde la carpeta equivocada. Los comandos de Django (`migrate`, `runserver`, `createsuperuser`, `cargar_consolidado.py`) corren desde la **raíz del proyecto** (`SISARM/`), no desde `frontend/` ni desde `backend/`. Ejecute `cd ..` hasta volver a la raíz y verifique con `dir manage.py` (Windows) o `ls manage.py` (Linux/Mac).

**`conda activate sisarm` o `npm` responden "no se reconoce como comando":**
Para conda: vea la subsección "Cómo abrir el prompt de conda" del paso 2.1. Para npm: cierre y reabra la terminal después de instalar Node.js, o reinicie la computadora.

---

## Autor

Rolando Gutiérrez, Edwin Hidalgo, Jennifer Llanes — Proyecto académico, Santa Cruz, Bolivia.

Repositorio: [github.com/LIONKAI/SISARM](https://github.com/LIONKAI/SISARM)
