import Character from './character';
import Timer from './timer';
import Types from './gametypes';

class Updater {
  constructor(game) {
    this.game = game;
    this.playerAggroTimer = new Timer(1000);
  }

  update() {
    this.updateZoning();
    this.updateCharacters();
    this.updatePlayerAggro();
    this.updateTransitions();
    this.updateAnimations();
    this.updateAnimatedTiles();
    this.updateChatBubbles();
    this.updateInfos();
  }

  updateCharacters() {
    const self = this;

    this.game.forEachEntity(entity => {
      const isCharacter = entity instanceof Character;

      if (entity.isLoaded) {
        if (isCharacter) {
          self.updateCharacter(entity);
          self.game.onCharacterUpdate(entity);
        }
        self.updateEntityFading(entity);
      }
    });
  }

  updatePlayerAggro() {
    const t = this.game.currentTime;
    const player = this.game.player;

    // Check player aggro every 1s when not moving nor attacking
    if (player && !player.isMoving() && !player.isAttacking() && this.playerAggroTimer.isOver(t)) {
      player.checkAggro();
    }
  }

  updateEntityFading(entity) {
    if (entity && entity.isFading) {
      const duration = 1000;
      const t = this.game.currentTime;
      const dt = t - entity.startFadingTime;

      if (dt > duration) {
        this.isFading = false;
        entity.fadingAlpha = 1;
      } else {
        entity.fadingAlpha = dt / duration;
      }
    }
  }

  updateTransitions() {
    const self = this;
    let m = null;
    const z = this.game.currentZoning;

    this.game.forEachEntity(entity => {
      m = entity.movement;
      if (m) {
        if (m.inProgress) {
          m.step(self.game.currentTime);
        }
      }
    });

    if (z) {
      if (z.inProgress) {
        z.step(this.game.currentTime);
      }
    }
  }

  updateZoning() {
    const g = this.game;
    const c = g.camera;
    const z = g.currentZoning;
    const ts = 16;
    const speed = 500;

    if (z && z.inProgress === false) {
      const orientation = this.game.zoningOrientation;
      let startValue = 0;
      let endValue = 0;
      let offset = 0;
      let updateFunc = null;
      let endFunc = null;

      if (orientation === Types.Orientations.LEFT || orientation === Types.Orientations.RIGHT) {
        offset = (c.gridW - 2) * ts;
        startValue = (orientation === Types.Orientations.LEFT) ? c.x - ts : c.x + ts;
        endValue = (orientation === Types.Orientations.LEFT) ? c.x - offset : c.x + offset;
        updateFunc = x => {
          c.setPosition(x, c.y);
          g.initAnimatedTiles();
          g.renderer.renderStaticCanvases();
        };
        endFunc = () => {
          c.setPosition(z.endValue, c.y);
          g.endZoning();
        };
      } else if (orientation === Types.Orientations.UP || orientation === Types.Orientations.DOWN) {
        offset = (c.gridH - 2) * ts;
        startValue = (orientation === Types.Orientations.UP) ? c.y - ts : c.y + ts;
        endValue = (orientation === Types.Orientations.UP) ? c.y - offset : c.y + offset;
        updateFunc = y => {
          c.setPosition(c.x, y);
          g.initAnimatedTiles();
          g.renderer.renderStaticCanvases();
        };
        endFunc = () => {
          c.setPosition(c.x, z.endValue);
          g.endZoning();
        };
      }

      z.start(this.game.currentTime, updateFunc, endFunc, startValue, endValue, speed);
    }
  }

  updateCharacter(c) {
    // Estimate of the movement distance for one update
    const tick = Math.round(16 / Math.round((c.moveSpeed / (1000 / this.game.renderer.FPS))));

    if (c.isMoving() && c.movement.inProgress === false) {
      if (c.orientation === Types.Orientations.LEFT) {
        c.movement.start(this.game.currentTime, x => {
          c.x = x;
          c.hasMoved();
        }, () => {
          c.x = c.movement.endValue;
          c.hasMoved();
          c.nextStep();
        }, c.x - tick, c.x - 16, c.moveSpeed);
      } else if (c.orientation === Types.Orientations.RIGHT) {
        c.movement.start(this.game.currentTime, x => {
          c.x = x;
          c.hasMoved();
        }, () => {
          c.x = c.movement.endValue;
          c.hasMoved();
          c.nextStep();
        }, c.x + tick, c.x + 16, c.moveSpeed);
      } else if (c.orientation === Types.Orientations.UP) {
        c.movement.start(this.game.currentTime, y => {
          c.y = y;
          c.hasMoved();
        }, () => {
          c.y = c.movement.endValue;
          c.hasMoved();
          c.nextStep();
        }, c.y - tick, c.y - 16, c.moveSpeed);
      } else if (c.orientation === Types.Orientations.DOWN) {
        c.movement.start(this.game.currentTime, y => {
          c.y = y;
          c.hasMoved();
        }, () => {
          c.y = c.movement.endValue;
          c.hasMoved();
          c.nextStep();
        }, c.y + tick, c.y + 16, c.moveSpeed);
      }
    }
  }

  updateAnimations() {
    const t = this.game.currentTime;

    this.game.forEachEntity(entity => {
      const anim = entity.currentAnimation;

      if (anim) {
        if (anim.update(t)) {
          entity.setDirty();
        }
      }
    });

    const sparks = this.game.sparksAnimation;
    if (sparks) {
      sparks.update(t);
    }

    const target = this.game.targetAnimation;
    if (target) {
      target.update(t);
    }
  }

  updateAnimatedTiles() {
    const self = this;
    const t = this.game.currentTime;

    this.game.forEachAnimatedTile(tile => {
      if (tile.animate(t)) {
        tile.isDirty = true;
        tile.dirtyRect = self.game.renderer.getTileBoundingRect(tile);

        if (self.game.renderer.mobile || self.game.renderer.tablet) {
          self.game.checkOtherDirtyRects(tile.dirtyRect, tile, tile.x, tile.y);
        }
      }
    });
  }

  updateChatBubbles() {
    const t = this.game.currentTime;

    this.game.bubbleManager.update(t);
  }

  updateInfos() {
    const t = this.game.currentTime;

    this.game.infoManager.update(t);
  }
}

export default Updater;
