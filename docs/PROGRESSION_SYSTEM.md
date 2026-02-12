# La Torre - Sistema de Progresion (Estado Funcional Actual)

Este documento describe el comportamiento actual de progresion visual y logica de avance que quedo funcionando correctamente.

## 1. Objetivo del sistema

- Mantener el piso actual del jugador centrado en pantalla.
- Avanzar de forma fluida piso por piso.
- Soportar muchos pisos (`TOTAL_FLOORS` alto) sin renderizar toda la torre.
- Evitar saltos visuales al volver desde la vista de desafio.

## 2. Modelo visual aplicado

- El fondo de escena se mantiene fijo.
- La torre se posiciona en coordenadas absolutas.
- Cada piso renderizado tiene posicion absoluta en `world-space`.
- Solo la torre se traslada verticalmente.

## 3. Formula de posicion absoluta

En `Tower.tsx`:

- `worldY` de cada piso:
  - `worldY = (totalFloors - floorNumber + 1) * floorHeight`
- `currentFloorWorldY`:
  - `currentFloorWorldY = (totalFloors - currentFloor + 1) * floorHeight`
- Traslacion de la torre:
  - `towerTranslateY = (viewportHeight / 2) - currentFloorWorldY`

Con esto, el piso actual queda centrado en el viewport.

## 4. Virtualizacion activa

- Se usa `WINDOW_SIZE = 15`.
- Se calcula una ventana alrededor de `currentFloor`.
- Solo se renderizan esos pisos visibles.
- Aunque la lista es parcial, cada piso conserva su `worldY` absoluto.

Esto evita acoplar la posicion al indice local del array y elimina drift acumulado.

## 5. Calibracion de altura por dispositivo

En `TowerView.tsx`:

- Desktop: `floorHeight = 116`
- Mobile: `floorHeight = 88`

Esta diferencia evita separaciones excesivas en mobile y mantiene proporciones visuales.

## 6. Retorno desde desafio sin "recarga visual"

Problema resuelto:

- Al salir del desafio, la torre hacia una animacion larga no deseada.

Solucion aplicada en `Tower.tsx`:

- La torre inicia con `transition: none` en el primer frame de montaje.
- Luego se habilita la transicion normal.

Resultado:

- No hay salto largo al volver.
- El movimiento vuelve a ser suave para avances posteriores.

## 7. Flujo de juego actual

1. Usuario entra al desafio del piso actual.
2. Al validar correcto, se ejecuta `onCorrectAnswer`.
3. `currentFloor` incrementa.
4. Se vuelve a la vista de torre.
5. La torre se reposiciona por formula absoluta y el nuevo piso queda centrado.

## 8. Archivos clave

- `src/views/TowerView.tsx`
  - mide `viewportHeight`
  - define `floorHeight` segun viewport
  - pasa props a `Tower`
- `src/components/tower/Tower.tsx`
  - calcula ventana virtual
  - calcula `worldY` absoluto por piso
  - calcula `translateY` absoluto de torre
- `src/components/tower/Floor.tsx`
  - aplica `top` absoluto con `worldY`
- `src/styles/layout.css`
  - viewport/escena fija y contenedor principal
- `src/styles/tower.css`
  - estructura visual de torre/pisos/anclas puerta

## 9. Nota operativa

Si se cambian sprites o escala visual, recalibrar solo:

- `floorHeight` desktop/mobile en `TowerView.tsx`

No cambiar la formula absoluta ni volver al modelo basado en indice relativo.
