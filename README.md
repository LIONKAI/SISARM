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

Verifique en una terminal:
```
conda --version
```

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

Abra una terminal en la carpeta donde quiera guardar el proyecto y ejecute:

```
git clone https://github.com/LIONKAI/SISARM.git
cd SISARM
```

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

**Prerrequisito:** Miniconda instalado (paso 2.1).

Desde la raíz del proyecto:

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

Desde la raíz del proyecto, cree el entorno virtual:

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

> Esta sección **es igual para ambas rutas**. Antes de empezar confirme que su entorno está activo: el prompt debe mostrar `(sisarm)` (Ruta A) o `(venv)` (Ruta B). Si no, vuelva al paso 5 y actívelo.

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

Abra **una segunda terminal** (mantenga la primera abierta para el backend). En esta terminal **no** necesita activar conda ni venv — el frontend usa npm de forma independiente.

```
cd frontend
npm install
```

Esto instalará todas las dependencias de React. Tarda 1-2 minutos la primera vez.

Cree un archivo `.env` dentro de la carpeta `frontend/` con este contenido:

```
VITE_API_URL=http://127.0.0.1:8080/api
```

---

## 8. Ejecutar el sistema

Necesita **dos terminales abiertas simultáneamente**, una para el backend y otra para el frontend.

### Terminal 1 — Backend

En la raíz del proyecto, con el entorno activado:
- Ruta A: `conda activate sisarm`
- Ruta B: `source venv/bin/activate` (o el equivalente Windows del paso 5)

Luego:
```
python manage.py runserver 8080
```

Verá:
```
Starting development server at http://127.0.0.1:8080/
```

### Terminal 2 — Frontend

En la carpeta `frontend/`:
```
npm run dev
```

Verá:
```
Local:   http://localhost:5173/
```

### Acceder a la aplicación

Abra en su navegador:
```
http://localhost:5173/
```

Para acceder al panel de administración de Django:
```
http://127.0.0.1:8080/admin/
```

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

---

## Autor

Rolando Gutiérrez, Edwin Hidalgo, Jennifer Llanes — Proyecto académico, Santa Cruz, Bolivia.

Repositorio: [github.com/LIONKAI/SISARM](https://github.com/LIONKAI/SISARM)
