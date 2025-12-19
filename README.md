# AutoQA Pro 🚀

AutoQA Pro es una plataforma **AI-Native** para la automatización de QA. Transforma casos de prueba en lenguaje natural (CSV/Excel) en frameworks de automatización robustos y ejecutables automáticamente.

Ahora con soporte nativo para **Playwright (TypeScript)** y **Auto-Healing** de selectores.

## ✨ Características Principales

### 🤖 Generación de Código con IA
- **NLP to Code**: Convierte pasos en español/inglés ("Hacer click en Login") en código ejecutable.
- **Deduplicación Inteligente**: Detecta pasos reutilizables para mantener el código limpio (DRY).
- **Page Object Model (POM)**: Genera automáticamente archivos POM bien estructurados.

### 🧠 Smart Selectors & Auto-Healing
- **Generación Resiliente**: Crea múltiples estrategias de selección (CSS, XPath, Text, ID) para cada elemento.
- **Auto-Healing en Runtime**: Si un selector falla, el sistema analiza el DOM en tiempo real, encuentra el elemento modificado y actualiza el selector automáticamente.
- **Adaptive Scoring**: El sistema "aprende" qué tipos de selectores son más estables para tu aplicación.

### 🎭 Ejecución con Playwright
- **Ejecución Inline**: Visualiza el estado de tus pruebas directamente en la tabla de casos de prueba.
- **Videos y Logs**: Grabación automática de video y logs detallados para cada ejecución.
- **Re-Run Granular**: Re-ejecuta tests individuales fallidos sin correr toda la suite.
- **Paralelismo**: Ejecución con soporte para múltiples workers.

### 🏢 Gestión Enterprise
- **Multi-Tenant**: Soporte para múltiples organizaciones y proyectos aislados.
- **Gestión de Proyectos**: Organiza tus suites de prueba por proyecto.

## 🛠️ Stack Tecnológico

- **Frontend**: React, TailwindCSS, Lucide Icons.
- **Backend**: Node.js, Express, Prisma (PostgreSQL).
- **AI**: Integración con Google Gemini 2.0 Flash / OpenAI.
- **Runner**: Playwright.

## 🚀 Setup & Instalación

### Prerrequisitos
- Node.js v18+
- PostgreSQL
- Npm o Bun

### Pasos de Instalación

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/ftorresg90/ia-automation-test.git
    ```

2.  **Instalar Dependencias**:
    ```bash
    # Backend
    cd backend
    npm install
    
    # Frontend
    cd ../frontend
    npm install
    ```

3.  **Configuración de Base de Datos**:
    - Crea un archivo `.env` en `backend/` basado en `.env.example`.
    - Configura tu `DATABASE_URL`.
    - Ejecuta las migraciones:
      ```bash
      cd backend
      npx prisma db push
      ```

4.  **Configuración de IA**:
    - Añade tu `GEMINI_API_KEY` o `OPENAI_API_KEY` en el `.env` del backend.

5.  **Iniciar la Aplicación**:
    Usa el script de inicio rápido para levantar ambos servicios:
    ```bash
    ./start-all.sh
    ```
    - Frontend: `http://localhost:5173`
    - Backend: `http://localhost:3001`

## 📖 Flujo de Uso

1.  **Crea un Proyecto**: Define el nombre y descripción de tu suite de pruebas.
2.  **Sube tus Test Cases**: Importa un CSV con columnas `Title`, `Description`, `Steps`, `Expected Result`.
    - *Tip: Usa el archivo `test-cases-v2.csv` incluido como plantilla.*
3.  **Genera el Framework**: AutoQA Pro analizará los pasos y generará el código Playwright.
4.  **Ejecuta**: Dispara la ejecución desde la UI ("Run All" o individual).
5.  **Visualiza Resultados**: Verás el estado `PASSED`/`FAILED`, videos de la ejecución y logs de auto-healing si ocurrieron errores.

## 📄 Licencia

MIT
