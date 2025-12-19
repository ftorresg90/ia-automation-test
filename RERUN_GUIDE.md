# 🔄 Cómo Usar el Botón de Re-run con Auto-Heal

## ✅ Buenas Noticias
**El botón de re-run YA EXISTE** en el Dashboard. No necesitas hacer nada adicional.

## 📍 Dónde Encontrarlo

1. Ve a tu proyecto en el Dashboard (`http://localhost:5173`)
2. En la columna derecha verás "Recent Executions"
3. Cada ejecución completada (PASSED o FAILED) tiene dos botones:
   - **"Watch Video"** (azul) - Para ver el video
   - **▶ (Play icon)** (gris) - Para **RE-EJECUTAR**

## 🔄 Flujo Completo de Auto-Corrección

### Paso 1: Primera Ejecución (Falla)
```
1. Click "Run Visual Validation"
2. El test falla por un selector incorrecto
3. Status: FAILED ❌
```

### Paso 2: Auto-Heal Automático
El sistema detecta el error y lo corrige:
```
Backend logs:
🚑 [Auto-Heal] analysis started...
🚑 [Auto-Heal] Targeting file: .../pages/SearchPage.ts
✅ [Auto-Heal] Patched file SearchPage.ts:
  - this.searchBtn = page.locator('#wrong-id');
  + this.searchBtn = page.locator('button[type="submit"]');
[Registry] Saved verified selector for "searchBtn"
```

### Paso 3: Re-ejecutar con el Fix
```
1. En la ejecución fallida, click en el botón ▶ (Play)
2. Se crea una NUEVA ejecución con el código corregido
3. Status: PASSED ✅
```

## 🎯 Ejemplo Visual

```
┌─────────────────────────────────────┐
│ Recent Executions                   │
├─────────────────────────────────────┤
│ ❌ FAILED                           │
│ Execution ID: 1234                  │
│ Issues detected...                  │
│                                     │
│ [Watch Video] [▶]  ← ESTE BOTÓN    │
│                     ↑               │
│                Re-ejecuta el test   │
└─────────────────────────────────────┘
```

## 💡 Tip
Después de un auto-heal, el mensaje de error incluirá:
```
🚑 AUTO-HEAL: The system detected a fixable error and 
patched the test code automatically. Please re-run the 
test to verify.
```

Cuando veas este mensaje, simplemente haz click en el botón ▶ para re-ejecutar.

## ⚙️ Código Relevante

El botón está en `frontend/src/components/ExecutionList.tsx`:
```tsx
<button
    onClick={() => onRetry(exec.id)}
    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm font-medium border border-gray-200"
    title="Retry"
>
    <Play className="w-4 h-4 fill-current" />
</button>
```

Y la función `handleRetryExecution` en `ProjectDetails.tsx` (línea 245):
```tsx
const handleRetryExecution = async (executionId: string) => {
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:3001/execution/retry/${executionId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    // Crea una nueva ejecución con el mismo proyecto/test cases
};
```
