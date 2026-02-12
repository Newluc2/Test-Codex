# Mini .io game + leaderboard

Prototype web (HTML/CSS/JS pur) d'un jeu type **.io** :
- un joueur humain,
- des bots automatiques,
- un leaderboard temps réel,
- une base d'état (`window.gameState`) pour brancher plus tard un bot externe.

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

## Contrôles

- `ZQSD` ou `WASD` : déplacement
- `Shift` : boost (consomme légèrement le score)
- Bouton `Recommencer` : reset de la partie

## Vision "bots automatiques"

Le projet inclut déjà des bots internes avec stratégie simple :
1. Fuir les plus gros proches.
2. Chasser les plus petits.
3. Sinon collecter les orbes.

Pour créer un bot externe ensuite :
- Lire `window.gameState` à chaque tick.
- Calculer une direction cible.
- Envoyer des commandes via une couche d'input (à ajouter : WebSocket/API locale selon ton architecture serveur).
