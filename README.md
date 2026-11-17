# OnePlanning

Prototipo independiente para explorar la planificación de un equipo. Implementación nueva con personas y asignaciones ficticias; no contiene código exportado de Apps Script ni información del equipo original.

[Abrir prototipo](https://randre23.github.io/oneplanning-prototype/)

## Ejecutar

Requiere Node.js 24 o posterior. No hay dependencias de npm que instalar.

```sh
npm start
```

Abrir `http://127.0.0.1:4173`. Para comprobar las reglas de negocio y el almacenamiento:

```sh
npm test
```

## Qué permite

- Cuadrante mensual y anual, navegación entre años, filtros de equipo y búsqueda.
- Asignar un estado y una permanencia online/offline independientes por persona y fecha.
- Indicar horas de recuperación en pasos de 0,25 h, con saldo anual y aviso de saldo negativo.
- Consultar resumen individual y alertas por disponibilidad mínima.
- Crear y editar personas ficticias, equipos y estados, con color y reglas explícitas.
- Guardar cambios en `localStorage` y restablecer los datos de demostración con confirmación.

Los cambios solo existen en este navegador, bajo la clave `oneplanning.prototype.v1`. No hay cuentas, permisos de administrador, servidor, Google Sheets, sincronización entre dispositivos ni copias de seguridad. Las pestañas detectan modificaciones externas y rechazan sobrescrituras; hay que recargar para verlas. No introducir datos reales o confidenciales.

## Reglas del prototipo

- Sin evento, una persona cuenta como presente de lunes a viernes. No se incluyen festivos ni jornadas parciales en el cálculo diario.
- Cada estado define si cuenta como presencia, si representa desplazamiento y si consume horas de recuperación. El nombre o código no modifica esos atributos.
- Las permanencias son independientes del estado. No se restringen combinaciones; no implica que esas combinaciones estén aprobadas para una futura aplicación real.
- Los indicadores siguen los filtros activos. Comparar un subconjunto de personas con el mínimo de un equipo puede mostrar alertas adicionales.
- El saldo resta todas las recuperaciones del año seleccionado, aunque solo se vea un mes. Se conservan los saldos negativos.
- El saldo base configurado se reutiliza para cada año. El prototipo no gestiona devengo, arrastres o cierres anuales.
- Estas reglas son propuestas explícitas de la demo, no una réplica exacta de las fórmulas del aplicativo original.

## Estructura y futura conexión

`src/app.js` gestiona la interfaz, `src/model.js` las reglas, `src/demo-data.js` los datos sintéticos y `src/repository.js` la persistencia. El contrato de almacenamiento es asíncrono: `load()`, `save(data)` y `reset()`. Las ediciones se aplican sobre una copia y solo se muestran como guardadas tras completar la escritura.

Para evolucionar a una aplicación compartida habrá que diseñar un backend autorizado, autenticación, permisos verificados en servidor, validación, operaciones por registro, control de concurrencia y auditoría. Sustituir `LocalRepository` permite mantener la mayor parte de la interfaz, pero no convierte por sí solo esta demo en una aplicación de producción. Nunca incluir secretos ni credenciales de Google en el frontend.

## Publicación

`.github/workflows/pages.yml` ejecuta las pruebas y publica únicamente `index.html` y `src/` con GitHub Pages al recibir cambios en `master`. Seleccionar **GitHub Actions** como origen en **Settings → Pages**.

El repositorio y la web están destinados a ser públicos, con autorización del propietario y únicamente código nuevo y datos ficticios. El prototipo usa Google Fonts para la tipografía, con fuentes del sistema como alternativa; el resto no requiere servicios externos.
