# ⚔️ Level Up — Gym RPG

App privada de seguimiento de gym para **Jhunar** y **Riaku**. Tu entrenamiento como un RPG:
entrenas, ganas XP, subes de nivel, mejoras tus atributos y desbloqueas logros.

## Qué hace

- 🏋️ **Entrenos**: registra peso × series × reps, con temporizador de descanso y detección automática de récords personales.
- 📋 **Rutinas**: plantillas (Push/Pull/Pierna...) editables; cualquier sesión se puede modificar sobre la marcha.
- ⚖️ **Cuerpo**: peso corporal, medidas, fotos de progreso y objetivos ("misiones") con gráficas de evolución.
- 🎮 **RPG**: nivel y XP, 6 atributos (Fuerza, Resistencia, Constancia, Disciplina, Vitalidad, Poder) calculados con tus datos reales, y 22 logros desbloqueables.
- 🔮 **Oráculo**: prepara un resumen de tus datos + tu duda y lo copia para pegarlo en Claude, que actúa como tu entrenador personal.

## Desarrollo local

```bash
npm install
npm run dev
```

## Publicación

Cada push a `main` despliega automáticamente a GitHub Pages mediante
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).
En el repositorio: **Settings → Pages → Source: GitHub Actions** (solo la primera vez).

## Instalar en el móvil

Abre la URL de GitHub Pages en el móvil y:
- **iPhone (Safari)**: Compartir → "Añadir a pantalla de inicio".
- **Android (Chrome)**: Menú ⋮ → "Añadir a pantalla de inicio" / "Instalar app".

## Datos

Los datos se guardan **en cada dispositivo** (IndexedDB). La estructura está preparada
para añadir sincronización con Supabase más adelante (todas las filas llevan `id` + `updatedAt`).
