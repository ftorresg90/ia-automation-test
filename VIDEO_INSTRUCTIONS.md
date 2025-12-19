# Instrucciones para Probar el Video

El sistema de video requiere que Playwright genere el video durante la ejecución.

## 1. Verificar que Prisma esté actualizado

Ejecuta estos comandos en el backend:

```bash
cd backend
npx prisma generate
npx prisma db push
```

## 2. Crear directorio para videos

```bash
mkdir -p execution-temp
```

## 3. Para que funcione el video

El video se generará automáticamente cuando:
1. Ejecutes "Run Visual Validation"
2. Playwright ejecuta los tests
3. El video se guarda en `execution-temp/{executionId}/video.webm`

## 4. Si no ves el video

El botón "View Execution Video" solo aparece si:
- La ejecución ha terminado (status PASSED o FAILED)
- El campo `videoUrl` no es null en la base de datos

Si ejecutas una validación y no ves el botón:
1. Verifica que el backend esté corriendo
2. Revisa los logs del backend para errores
3. Verifica que la carpeta `execution-temp` exista
4. Comprueba que Playwright esté instalado: `npx playwright --version`

## Nota Importante

Por ahora, el sistema genera un mock de ejecución. Para ver videos reales necesitarás:
1. Tener tests reales de Playwright escritos
2. Que esos tests generen videos (configuración de Playwright)
3. Que los videos se guarden en la ubicación correcta
