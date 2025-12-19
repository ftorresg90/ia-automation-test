# 🚨 Solución al Problema de Cuota de API

## El Problema
Tu API key de Gemini ha excedido la cuota gratuita. Los modelos experimentales (`gemini-2.0-flash-exp`, `gemini-exp-1206`) tienen límites muy restrictivos:
- **0 requests/día** en free tier
- **0 tokens/minuto** en free tier

## 📊 Opciones de Solución

### Opción 1: Habilitar Billing (Recomendado para Producción)
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Habilita billing en tu proyecto
3. Los límites aumentarán significativamente:
   - 1,500 requests/día → 1,000,000 requests/día
   - Costo muy bajo (~$0.075 por 1M tokens)

### Opción 2: Esperar Reset de Cuota (24 horas)
La cuota gratuita se resetea cada 24 horas. Puedes esperar hasta mañana.

### Opción 3: Deshabilitar IA Temporalmente ✅ (Implementado)
He configurado el sistema para que funcione **sin IA** cuando hay problemas de cuota:

**Lo que sigue funcionando:**
- ✅ Ejecución de tests con Playwright
- ✅ Generación de videos
- ✅ Page Object Model (POM)
- ✅ Descarga de framework Java/Selenium

**Lo que NO funcionará (temporalmente):**
- ❌ Auto-Heal (corrección automática de tests)
- ❌ Análisis de fallos con IA
- ❌ Generación de Gherkin mejorado con IA

**Modo de degradación:**
El sistema usará fallbacks heurísticos en lugar de IA.

## 🔧 Configuración Actual

Tu `.env` actual:
\`\`\`
GEMINI_API_KEY="AIzaSyAbvG_XZ9-FOP0toTnzfaniIc5mWSRfw0Q"
\`\`\`

### Para deshabilitar completamente la IA:
\`\`\`bash
# Edita backend/.env y cambia:
GEMINI_API_KEY="sk-placeholder"
\`\`\`

Esto hará que el sistema use **solo fallbacks** sin intentar llamar a la API.

## 📈 Monitoreo de Uso

Puedes ver tu uso actual en:
https://ai.dev/usage?tab=rate-limit

## 💡 Recomendación

Para un sistema de producción como AutoQA Pro, te recomiendo **habilitar billing**. El costo es mínimo (~$2-5/mes para uso moderado) y obtendrás:
- Límites mucho más altos
- Modelos más estables
- Mejor rendimiento

## 🎯 Próximos Pasos

1. **Corto plazo**: El sistema funciona sin IA (ya configurado)
2. **Mediano plazo**: Habilita billing para usar todas las funciones
3. **Largo plazo**: Considera usar modelos locales (Ollama) para evitar costos
