# 🔄 Guía: Cómo Probar el Auto-Correction Flow

## Flujo Automático (Ya está activo)

El sistema de auto-corrección se activa **automáticamente** cuando:

### 1. Ejecutas un Test desde el Dashboard
- Ve a `http://localhost:5173` (Frontend)
- Selecciona un proyecto (ej: "BCH" o "Wikipedia")
- Click en "▶ Run Test"

### 2. Si el Test Falla
El sistema detecta automáticamente:
```
[Execution exec-xxx] Status: FAILED
[Execution exec-xxx] analyzing failure with AI...
🚑 [Auto-Heal] analysis started...
🚑 [Auto-Heal] Targeting file: .../pages/SomePage.ts
🚑 [Auto-Heal] Consulting AI Surgeon...
```

### 3. Auto-Heal Intenta Corregir
Si la IA encuentra un fix:
```
✅ [Auto-Heal] Patched file SomePage.ts:
  - this.searchButton = page.locator('#old-wrong-id');
  + this.searchButton = page.locator('button[type="submit"]');
[Registry] Saved verified selector for "searchButton": button[type="submit"]
```

### 4. El Selector se Guarda
Revisa el archivo:
```bash
cat backend/verified_selectors.json
```

Verás algo como:
```json
[
  {
    "elementName": "searchButton",
    "selector": "button[type=\"submit\"]",
    "type": "css",
    "context": "Auto-healed from execution",
    "verifiedAt": 1734461234567
  }
]
```

### 5. Reutilización Automática
La próxima vez que generes código Java:
```
[Selector] Using VERIFIED selector for "searchButton": button[type="submit"]
```

---

## 🧪 Prueba Manual Rápida

Si quieres forzar el flujo sin esperar un fallo real:

### Opción A: Simular con un proyecto existente
```bash
cd backend
# Ejecuta un test que sabes que fallará
npm run test:playwright -- execution-temp/exec-XXXXX/test-exec-XXXXX.spec.ts
```

### Opción B: Verificar que el registro funciona
```bash
# 1. Crea un selector verificado manualmente
echo '[{"elementName":"testBtn","selector":"#verified","type":"css","context":"manual","verifiedAt":1234567890}]' > verified_selectors.json

# 2. Ejecuta el generador de Java
npm run generate:java -- --project-id=<algún-proyecto-id>

# 3. Revisa los logs - deberías ver:
# [Selector] Using VERIFIED selector for "testBtn": #verified
```

---

## 📊 Monitoreo

Para ver el flujo en acción, observa los logs del backend:
```bash
tail -f backend/execution-temp/exec-*/playwright.log
```

Busca estas líneas clave:
- `🚑 [Auto-Heal]` - Sistema de curación activado
- `[Registry] Saved` - Selector guardado
- `[Selector] Using VERIFIED` - Selector reutilizado

---

## ⚠️ Requisitos

Para que funcione completamente:
1. ✅ Variable `GEMINI_API_KEY` configurada en `.env`
2. ✅ Test que falle por selector incorrecto
3. ✅ Error debe ser de tipo `TimeoutError` o `Element not found`

---

## 🎯 Siguiente Paso Recomendado

Ejecuta un test real desde el Dashboard y observa los logs del backend.
Si falla, verás el auto-heal en acción.
