import log from 'log';
import raf from 'raf';
import InfoManager from './infomanager';
import BubbleManager from './bubblemanager';
import Renderer from './renderer';
import Map from './map';
import Animation from './animation';
import Sprite from './sprite';
import AnimatedTile from './animatedtile';
import Warrior from './warrior';
import GameClient from './gameclient';
import AudioManager from './audiomanager';
import Updater from './updater';
import Transition from './transition';
import Pathfinder from './pathfinder';
import Item from './item';
import Mob from './mob';
import Npc from './npc';
import Player from './player';
import Character from './character';
import Chest from './chest';
import Mobs from './mobs';
import Exceptions from './exceptions';
import config from './config';
import Types from './gametypes';
import _ from 'lodash';

class Game {
  constructor(app) {
    this.app = app;
    this.app.config = config;
    this.ready = false;
    this.started = false;
    this.hasNeverStarted = true;

    this.renderer = null;
    this.updater = null;
    this.pathfinder = null;
    this.chatinput = null;
    this.bubbleManager = null;
    this.audioManager = null;

    // Player
    this.player = new Warrior('player', '');

    // Game state
    this.entities = {};
    this.deathpositions = {};
    this.entityGrid = null;
    this.pathingGrid = null;
    this.renderingGrid = null;
    this.itemGrid = null;
    this.currentCursor = null;
    this.mouse = { x: 0, y: 0 };
    this.zoningQueue = [];
    this.previousClickPosition = {};

    this.selectedX = 0;
    this.selectedY = 0;
    this.selectedCellVisible = false;
    this.targetColor = 'rgba(255, 255, 255, 0.5)';
    this.targetCellVisible = true;
    this.hoveringTarget = false;
    this.hoveringMob = false;
    this.hoveringItem = false;
    this.hoveringCollidingTile = false;

    // combat
    this.infoManager = new InfoManager(this);

    // zoning
    this.currentZoning = null;

    this.cursors = {};

    this.sprites = {};

    // tile animation
    this.animatedTiles = null;

    // debug
    this.debugPathing = false;

    // sprites
    this.spriteNames = [
      'hand',
      'sword',
      'loot',
      'target',
      'talk',
      'sparks',
      'shadow16',
      'rat',
      'skeleton',
      'skeleton2',
      'spectre',
      'boss',
      'deathknight',
      'ogre',
      'crab',
      'snake',
      'eye',
      'bat',
      'goblin',
      'wizard',
      'guard',
      'king',
      'villagegirl',
      'villager',
      'coder',
      'agent',
      'rick',
      'scientist',
      'nyan',
      'priest',
      'sorcerer',
      'octocat',
      'beachnpc',
      'forestnpc',
      'desertnpc',
      'lavanpc',
      'clotharmor',
      'leatherarmor',
      'mailarmor',
      'platearmor',
      'redarmor',
      'goldenarmor',
      'firefox',
      'death',
      'sword1',
      'axe',
      'chest',
      'sword2',
      'redsword',
      'bluesword',
      'goldensword',
      'item-sword2',
      'item-axe',
      'item-redsword',
      'item-bluesword',
      'item-goldensword',
      'item-leatherarmor',
      'item-mailarmor',
      'item-platearmor',
      'item-redarmor',
      'item-goldenarmor',
      'item-flask',
      'item-cake',
      'item-burger',
      'morningstar',
      'item-morningstar',
      'item-firepotion',
    ];
  }

  setup($bubbleContainer, canvas, background, foreground, input) {
    this.setBubbleManager(new BubbleManager($bubbleContainer));
    this.setRenderer(new Renderer(this, canvas, background, foreground));
    this.setChatInput(input);
  }

  setStorage(storage) {
    this.storage = storage;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setUpdater(updater) {
    this.updater = updater;
  }

  setPathfinder(pathfinder) {
    this.pathfinder = pathfinder;
  }

  setChatInput(element) {
    this.chatinput = element;
  }

  setBubbleManager(bubbleManager) {
    this.bubbleManager = bubbleManager;
  }

  loadMap() {
    const self = this;

    this.map = new Map(!this.renderer.upscaledRendering, this);

    this.map.ready(() => {
      log.info('Map loaded.');
      const tilesetIndex = self.renderer.upscaledRendering ? 0 : self.renderer.scale - 1;
      self.renderer.setTileset(self.map.tilesets[tilesetIndex]);
    });
  }

  initPlayer() {
    // todo Check localStorage
    if (this.storage.hasAlreadyPlayed() && false) {
      this.player.setSpriteName(this.storage.data.player.armor);
      this.player.setWeaponName(this.storage.data.player.weapon);
    }

    this.player.setSprite(this.sprites[this.player.getSpriteName()]);
    this.player.idle();

    log.debug('Finished initPlayer');
  }

  initShadows() {
    this.shadows = {};
    this.shadows.small = this.sprites.shadow16;
  }

  initCursors() {
    this.cursors.hand = this.sprites.hand;
    this.cursors.sword = this.sprites.sword;
    this.cursors.loot = this.sprites.loot;
    this.cursors.target = this.sprites.target;
    this.cursors.arrow = this.sprites.arrow;
    this.cursors.talk = this.sprites.talk;
  }

  initAnimations() {
    this.targetAnimation = new Animation('idle_down', 4, 0, 16, 16);
    this.targetAnimation.setSpeed(50);

    this.sparksAnimation = new Animation('idle_down', 6, 0, 16, 16);
    this.sparksAnimation.setSpeed(120);
  }

  initHurtSprites() {
    const self = this;

    Types.forEachArmorKind((kind, kindName) => {
      self.sprites[kindName].createHurtSprite();
    });
  }

  initSilhouettes() {
    const self = this;

    Types.forEachMobOrNpcKind((kind, kindName) => {
      self.sprites[kindName].createSilhouette();
    });
    self.sprites.chest.createSilhouette();
    self.sprites['item-cake'].createSilhouette();
  }

  initAchievements() {
    const self = this;

    this.achievements = {
      A_TRUE_WARRIOR: {
        id: 1,
        name: 'A True Warrior',
        desc: 'Find a new weapon',
      },
      INTO_THE_WILD: {
        id: 2,
        name: 'Into the Wild',
        desc: 'Venture outside the village',
      },
      ANGRY_RATS: {
        id: 3,
        name: 'Angry Rats',
        desc: 'Kill 10 rats',
        isCompleted() {
          return self.storage.getRatCount() >= 10;
        },
      },
      SMALL_TALK: {
        id: 4,
        name: 'Small Talk',
        desc: 'Talk to a non-player character',
      },
      FAT_LOOT: {
        id: 5,
        name: 'Fat Loot',
        desc: 'Get a new armor set',
      },
      UNDERGROUND: {
        id: 6,
        name: 'Underground',
        desc: 'Explore at least one cave',
      },
      AT_WORLDS_END: {
        id: 7,
        name: 'At World\'s End',
        desc: 'Reach the south shore',
      },
      COWARD: {
        id: 8,
        name: 'Coward',
        desc: 'Successfully escape an enemy',
      },
      TOMB_RAIDER: {
        id: 9,
        name: 'Tomb Raider',
        desc: 'Find the graveyard',
      },
      SKULL_COLLECTOR: {
        id: 10,
        name: 'Skull Collector',
        desc: 'Kill 10 skeletons',
        isCompleted() {
          return self.storage.getSkeletonCount() >= 10;
        },
      },
      NINJA_LOOT: {
        id: 11,
        name: 'Ninja Loot',
        desc: 'Get hold of an item you didn\'t fight for',
      },
      NO_MANS_LAND: {
        id: 12,
        name: 'No Man\'s Land',
        desc: 'Travel through the desert',
      },
      HUNTER: {
        id: 13,
        name: 'Hunter',
        desc: 'Kill 50 enemies',
        isCompleted() {
          return self.storage.getTotalKills() >= 50;
        },
      },
      STILL_ALIVE: {
        id: 14,
        name: 'Still Alive',
        desc: 'Revive your character five times',
        isCompleted() {
          return self.storage.getTotalRevives() >= 5;
        },
      },
      MEATSHIELD: {
        id: 15,
        name: 'Meatshield',
        desc: 'Take 5,000 points of damage',
        isCompleted() {
          return self.storage.getTotalDamageTaken() >= 5000;
        },
      },
      HOT_SPOT: {
        id: 16,
        name: 'Hot Spot',
        desc: 'Enter the volcanic mountains',
      },
      HERO: {
        id: 17,
        name: 'Hero',
        desc: 'Defeat the final boss',
      },
      FOXY: {
        id: 18,
        name: 'Foxy',
        desc: 'Find the Firefox costume',
        hidden: true,
      },
      FOR_SCIENCE: {
        id: 19,
        name: 'For Science',
        desc: 'Enter into a portal',
        hidden: true,
      },
      RICKROLLD: {
        id: 20,
        name: 'Rickroll\'d',
        desc: 'Take some singing lessons',
        hidden: true,
      },
    };

    _.each(this.achievements, _obj => {
      const obj = _obj;
      if (!obj.isCompleted) {
        obj.isCompleted = () => true;
      }
      if (!obj.hidden) {
        obj.hidden = false;
      }
    });

    this.app.initAchievementList(this.achievements);

    if (this.storage.hasAlreadyPlayed()) {
      this.app.initUnlockedAchievements(this.storage.data.achievements.unlocked);
    }
  }

  getAchievementById(id) {
    let found = null;
    _.each(this.achievements, (achievement) => {
      if (achievement.id === parseInt(id, 10)) {
        found = achievement;
      }
    });
    return found;
  }

  loadSprite(name) {
    if (this.renderer.upscaledRendering) {
      this.spritesets[0][name] = new Sprite(name, 1);
    } else {
      this.spritesets[1][name] = new Sprite(name, 2);
      if (!this.renderer.mobile && !this.renderer.tablet) {
        this.spritesets[2][name] = new Sprite(name, 3);
      }
    }
  }

  setSpriteScale(scale) {
    const self = this;

    if (this.renderer.upscaledRendering) {
      this.sprites = this.spritesets[0];
    } else {
      this.sprites = this.spritesets[scale - 1];

      _.each(this.entities, _entity => {
        const entity = _entity;
        entity.sprite = null;
        entity.setSprite(self.sprites[entity.getSpriteName()]);
      });
      this.initHurtSprites();
      this.initShadows();
      this.initCursors();
    }
  }

  loadSprites() {
    log.info('Loading sprites...');
    this.spritesets = [];
    this.spritesets[0] = {};
    this.spritesets[1] = {};
    this.spritesets[2] = {};
    _.map(this.spriteNames, this.loadSprite.bind(this));
  }

  spritesLoaded() {
    return !_.some(this.sprites, sprite => !sprite.isLoaded);
  }

  setCursor(name, orientation) {
    if (name in this.cursors) {
      this.currentCursor = this.cursors[name];
      this.currentCursorOrientation = orientation;
    } else {
      log.error(`Unknown cursor name :${name}`);
    }
  }

  updateCursorLogic() {
    if (this.hoveringCollidingTile && this.started) {
      this.targetColor = 'rgba(255, 50, 50, 0.5)';
    } else {
      this.targetColor = 'rgba(255, 255, 255, 0.5)';
    }

    if (this.hoveringMob && this.started) {
      this.setCursor('sword');
      this.hoveringTarget = false;
      this.targetCellVisible = false;
    } else if (this.hoveringNpc && this.started) {
      this.setCursor('talk');
      this.hoveringTarget = false;
      this.targetCellVisible = false;
    } else if ((this.hoveringItem || this.hoveringChest) && this.started) {
      this.setCursor('loot');
      this.hoveringTarget = false;
      this.targetCellVisible = true;
    } else {
      this.setCursor('hand');
      this.hoveringTarget = false;
      this.targetCellVisible = true;
    }
  }

  focusPlayer() {
    this.renderer.camera.lookAt(this.player);
  }

  addEntity(entity) {
    const self = this;

    if (this.entities[entity.id] === undefined) {
      this.entities[entity.id] = entity;
      this.registerEntityPosition(entity);

      if (!(entity instanceof Item && entity.wasDropped)
        && !(this.renderer.mobile || this.renderer.tablet)) {
        entity.fadeIn(this.currentTime);
      }

      if (this.renderer.mobile || this.renderer.tablet) {
        entity.onDirty(_e => {
          const e = _e;
          if (self.camera.isVisible(e)) {
            e.dirtyRect = self.renderer.getEntityBoundingRect(e);
            self.checkOtherDirtyRects(e.dirtyRect, e, e.gridX, e.gridY);
          }
        });
      }
    } else {
      log.error(`This entity already exists : ${entity.id} (${entity.kind})`);
    }
  }

  removeEntity(entity) {
    if (entity.id in this.entities) {
      this.unregisterEntityPosition(entity);
      delete this.entities[entity.id];
    } else {
      log.error(`Cannot remove entity. Unknown ID : ${entity.id}`);
    }
  }

  addItem(item, x, y) {
    item.setSprite(this.sprites[item.getSpriteName()]);
    item.setGridPosition(x, y);
    item.setAnimation('idle', 150);
    this.addEntity(item);
  }

  removeItem(item) {
    if (item) {
      this.removeFromItemGrid(item, item.gridX, item.gridY);
      this.removeFromRenderingGrid(item, item.gridX, item.gridY);
      delete this.entities[item.id];
    } else {
      log.error(`Cannot remove item. Unknown ID : ${item.id}`);
    }
  }

  initPathingGrid() {
    this.pathingGrid = [];
    for (let i = 0; i < this.map.height; i += 1) {
      this.pathingGrid[i] = [];
      for (let j = 0; j < this.map.width; j += 1) {
        this.pathingGrid[i][j] = this.map.grid[i][j];
      }
    }
    log.info('Initialized the pathing grid with static colliding cells.');
  }

  initEntityGrid() {
    this.entityGrid = [];
    for (let i = 0; i < this.map.height; i += 1) {
      this.entityGrid[i] = [];
      for (let j = 0; j < this.map.width; j += 1) {
        this.entityGrid[i][j] = {};
      }
    }
    log.info('Initialized the entity grid.');
  }

  initRenderingGrid() {
    this.renderingGrid = [];
    for (let i = 0; i < this.map.height; i += 1) {
      this.renderingGrid[i] = [];
      for (let j = 0; j < this.map.width; j += 1) {
        this.renderingGrid[i][j] = {};
      }
    }
    log.info('Initialized the rendering grid.');
  }

  initItemGrid() {
    this.itemGrid = [];
    for (let i = 0; i < this.map.height; i += 1) {
      this.itemGrid[i] = [];
      for (let j = 0; j < this.map.width; j += 1) {
        this.itemGrid[i][j] = {};
      }
    }
    log.info('Initialized the item grid.');
  }

  /**
   *
   */
  initAnimatedTiles() {
    const self = this;
    const m = this.map;

    this.animatedTiles = [];
    this.forEachVisibleTile((id, index) => {
      if (m.isAnimatedTile(id)) {
        const tile = new AnimatedTile(id, m.getTileAnimationLength(id),
          m.getTileAnimationDelay(id), index);
        const pos = self.map.tileIndexToGridPosition(tile.index);

        tile.x = pos.x;
        tile.y = pos.y;
        self.animatedTiles.push(tile);
      }
    }, 1);
    // log.info('Initialized animated tiles.');
  }

  addToRenderingGrid(entity, x, y) {
    if (!this.map.isOutOfBounds(x, y)) {
      this.renderingGrid[y][x][entity.id] = entity;
    }
  }

  removeFromRenderingGrid(entity, x, y) {
    if (entity && this.renderingGrid[y][x] && entity.id in this.renderingGrid[y][x]) {
      delete this.renderingGrid[y][x][entity.id];
    }
  }

  removeFromEntityGrid(entity, x, y) {
    if (this.entityGrid[y][x][entity.id]) {
      delete this.entityGrid[y][x][entity.id];
    }
  }

  removeFromItemGrid(item, x, y) {
    if (item && this.itemGrid[y][x][item.id]) {
      delete this.itemGrid[y][x][item.id];
    }
  }

  removeFromPathingGrid(x, y) {
    this.pathingGrid[y][x] = 0;
  }

  /**
   * Registers the entity at two adjacent positions on the grid at the same time.
   * This situation is temporary and should only occur when the entity is moving.
   * This is useful for the hit testing algorithm used when hovering entities with the mouse cursor.
   *
   * @param {Entity} entity The moving entity
   */
  registerEntityDualPosition(entity) {
    if (entity) {
      this.entityGrid[entity.gridY][entity.gridX][entity.id] = entity;

      this.addToRenderingGrid(entity, entity.gridX, entity.gridY);

      if (entity.nextGridX >= 0 && entity.nextGridY >= 0) {
        this.entityGrid[entity.nextGridY][entity.nextGridX][entity.id] = entity;
        if (!(entity instanceof Player)) {
          this.pathingGrid[entity.nextGridY][entity.nextGridX] = 1;
        }
      }
    }
  }

  /**
   * Clears the position(s) of this entity in the entity grid.
   *
   * @param {Entity} entity The moving entity
   */
  unregisterEntityPosition(entity) {
    if (entity) {
      this.removeFromEntityGrid(entity, entity.gridX, entity.gridY);
      this.removeFromPathingGrid(entity.gridX, entity.gridY);

      this.removeFromRenderingGrid(entity, entity.gridX, entity.gridY);

      if (entity.nextGridX >= 0 && entity.nextGridY >= 0) {
        this.removeFromEntityGrid(entity, entity.nextGridX, entity.nextGridY);
        this.removeFromPathingGrid(entity.nextGridX, entity.nextGridY);
      }
    }
  }

  registerEntityPosition(entity) {
    const x = entity.gridX;
    const y = entity.gridY;

    if (entity) {
      if (entity instanceof Character || entity instanceof Chest) {
        this.entityGrid[y][x][entity.id] = entity;
        if (!(entity instanceof Player)) {
          this.pathingGrid[y][x] = 1;
        }
      }
      if (entity instanceof Item) {
        this.itemGrid[y][x][entity.id] = entity;
      }

      this.addToRenderingGrid(entity, x, y);
    }
  }

  setServerOptions(host, port, username) {
    this.host = host;
    this.port = port;
    this.username = username;
  }

  loadAudio() {
    this.audioManager = new AudioManager(this);
  }

  initMusicAreas() {
    const self = this;
    _.each(this.map.musicAreas, area => {
      self.audioManager.addArea(area.x, area.y, area.w, area.h, area.id);
    });
  }

  run(startedCallback) {
    const self = this;

    this.loadSprites();
    this.setUpdater(new Updater(this));
    this.camera = this.renderer.camera;

    this.setSpriteScale(this.renderer.scale);

    const wait = setInterval(() => {
      if (self.map.isLoaded && self.spritesLoaded()) {
        self.ready = true;
        log.debug('All sprites loaded.');

        self.loadAudio();

        self.initMusicAreas();
        self.initAchievements();
        self.initCursors();
        self.initAnimations();
        self.initShadows();
        self.initHurtSprites();

        if (!self.renderer.mobile
          && !self.renderer.tablet
          && self.renderer.upscaledRendering) {
          self.initSilhouettes();
        }

        self.initEntityGrid();
        self.initItemGrid();
        self.initPathingGrid();
        self.initRenderingGrid();

        self.setPathfinder(new Pathfinder(self.map.width, self.map.height));

        self.initPlayer();
        self.setCursor('hand');

        self.connect(startedCallback);

        clearInterval(wait);
      }
    }, 100);
  }

  tick() {
    this.currentTime = new Date().getTime();

    if (this.started) {
      this.updateCursorLogic();
      this.updater.update();
      this.renderer.renderFrame();
    }

    if (!this.isStopped) {
      raf(this.tick.bind(this));
    }
  }

  start() {
    this.tick();
    this.hasNeverStarted = false;
    log.info('Game loop started.');
  }

  stop() {
    log.info('Game stopped.');
    this.isStopped = true;
  }

  entityIdExists(id) {
    return id in this.entities;
  }

  getEntityById(id) {
    if (id in this.entities) {
      return this.entities[id];
    }
    throw new Error(`Unknown entity id : ${id}`);
  }

  connect(startedCallback) {
    const self = this;
    let connecting = false;

    this.client = new GameClient(this.host, this.port);

    // todo Find a better way to use a config file
    const config = this.app.config.local || this.app.config.dev;
    if (config) {
      // false if the client connects directly to a game server
      this.client.connect(config.dispatcher);
      connecting = true;
    }

    if (!connecting) {
      this.client.connect(true); // always use the dispatcher in production
    }

    this.client.onDispatched((host, port) => {
      log.debug(`Dispatched to game server ${host}:${port}`);

      self.client.host = host;
      self.client.port = port;
      self.client.connect(); // connect to actual game server
    });

    this.client.onConnected(() => {
      log.info('Starting client/server handshake');

      self.player.name = self.username;
      self.started = true;

      self.sendHello(self.player);
    });

    this.client.onEntityList(list => {
      const entityIds = _.map(self.entities, 'id');
      const knownIds = _.intersection(entityIds, list);
      const newIds = _.difference(list, knownIds);

      self.obsoleteEntities = _.reject(self.entities, entity => _.includes(knownIds, entity.id)
      || entity.id === self.player.id);

      // Destroy entities outside of the player's zone group
      self.removeObsoleteEntities();

      // Ask the server for spawn information about unknown entities
      if (_.size(newIds) > 0) {
        self.client.sendWho(newIds);
      }
    });

    this.client.onWelcome((id, name, x, y, hp) => {
      log.info(`Received player ID from server : ${id}`);
      self.player.id = id;
      self.playerId = id;
      // Always accept name received from the server which will
      // sanitize and shorten names exceeding the allowed length.
      self.player.name = name;
      self.player.setGridPosition(x, y);
      self.player.setMaxHitPoints(hp);

      self.updateBars();
      self.resetCamera();
      self.updatePlateauMode();
      self.audioManager.updateMusic();

      self.addEntity(self.player);
      self.player.dirtyRect = self.renderer.getEntityBoundingRect(self.player);

      setTimeout(() => {
        self.tryUnlockingAchievement('STILL_ALIVE');
      }, 1500);

      if (!self.storage.hasAlreadyPlayed()) {
        self.storage.initPlayer(self.player.name);
        self.storage.savePlayer(self.renderer.getPlayerImage(),
          self.player.getSpriteName(),
          self.player.getWeaponName());
        self.showNotification('Welcome to BrowserQuest!');
      } else {
        self.showNotification('Welcome back to BrowserQuest!');
        self.storage.setPlayerName(name);
      }

      self.player.onStartPathing(path => {
        const i = path.length - 1;
        const x = path[i][0];
        const y = path[i][1];

        if (self.player.isMovingToLoot()) {
          self.player.isLootMoving = false;
        } else if (!self.player.isAttacking()) {
          self.client.sendMove(x, y);
        }

        // Target cursor position
        self.selectedX = x;
        self.selectedY = y;
        self.selectedCellVisible = true;

        if (self.renderer.mobile || self.renderer.tablet) {
          self.drawTarget = true;
          self.clearTarget = true;
          self.renderer.targetRect = self.renderer.getTargetBoundingRect();
          self.checkOtherDirtyRects(self.renderer.targetRect, null, self.selectedX, self.selectedY);
        }
      });

      self.player.onCheckAggro(() => {
        self.forEachMob(mob => {
          if (mob.isAggressive && !mob.isAttacking() && self.player.isNear(mob, mob.aggroRange)) {
            self.player.aggro(mob);
          }
        });
      });

      self.player.onAggro(mob => {
        if (!mob.isWaitingToAttack(self.player) && !self.player.isAttackedBy(mob)) {
          self.player.logInfo(`Aggroed by ${mob.id} at (${self.player.gridX}
          , ${self.player.gridY})`);
          self.client.sendAggro(mob);
          mob.waitToAttack(self.player);
        }
      });

      self.player.onBeforeStep(() => {
        const blockingEntity = self.getEntityAt(self.player.nextGridX, self.player.nextGridY);
        if (blockingEntity && blockingEntity.id !== self.playerId) {
          log.debug(`Blocked by ${blockingEntity.id}`);
        }
        self.unregisterEntityPosition(self.player);
      });

      self.player.onStep(() => {
        if (self.player.hasNextStep()) {
          self.registerEntityDualPosition(self.player);
        }

        if (self.isZoningTile(self.player.gridX, self.player.gridY)) {
          self.enqueueZoningFrom(self.player.gridX, self.player.gridY);
        }

        self.player.forEachAttacker(attacker => {
          if (attacker.isAdjacent(attacker.target)) {
            attacker.lookAtTarget();
          } else {
            attacker.follow(self.player);
          }
        });

        if ((self.player.gridX <= 85 && self.player.gridY <= 179 && self.player.gridY > 178)
          || (self.player.gridX <= 85 && self.player.gridY <= 266 && self.player.gridY > 265)) {
          self.tryUnlockingAchievement('INTO_THE_WILD');
        }

        if (self.player.gridX <= 85 && self.player.gridY <= 293 && self.player.gridY > 292) {
          self.tryUnlockingAchievement('AT_WORLDS_END');
        }

        if (self.player.gridX <= 85 && self.player.gridY <= 100 && self.player.gridY > 99) {
          self.tryUnlockingAchievement('NO_MANS_LAND');
        }

        if (self.player.gridX <= 85 && self.player.gridY <= 51 && self.player.gridY > 50) {
          self.tryUnlockingAchievement('HOT_SPOT');
        }

        if (self.player.gridX <= 27 && self.player.gridY <= 123 && self.player.gridY > 112) {
          self.tryUnlockingAchievement('TOMB_RAIDER');
        }

        self.updatePlayerCheckpoint();

        if (!self.player.isDead) {
          self.audioManager.updateMusic();
        }
      });

      self.player.onStopPathing((x, y) => {
        if (self.player.hasTarget()) {
          self.player.lookAtTarget();
        }

        self.selectedCellVisible = false;

        if (self.isItemAt(x, y)) {
          const item = self.getItemAt(x, y);

          try {
            self.player.loot(item);
            self.client.sendLoot(item); // Notify the server that this item has been looted
            self.removeItem(item);
            self.showNotification(item.getLootMessage());

            if (item.type === 'armor') {
              self.tryUnlockingAchievement('FAT_LOOT');
            }

            if (item.type === 'weapon') {
              self.tryUnlockingAchievement('A_TRUE_WARRIOR');
            }

            if (item.kind === Types.Entities.CAKE) {
              self.tryUnlockingAchievement('FOR_SCIENCE');
            }

            if (item.kind === Types.Entities.FIREPOTION) {
              self.tryUnlockingAchievement('FOXY');
              self.audioManager.playSound('firefox');
            }

            if (Types.isHealingItem(item.kind)) {
              self.audioManager.playSound('heal');
            } else {
              self.audioManager.playSound('loot');
            }

            if (item.wasDropped && !_.includes(item.playersInvolved, self.playerId)) {
              self.tryUnlockingAchievement('NINJA_LOOT');
            }
          } catch (e) {
            if (e instanceof Exceptions.LootException) {
              self.showNotification(e.message);
              self.audioManager.playSound('noloot');
            } else {
              throw e;
            }
          }
        }

        if (!self.player.hasTarget() && self.map.isDoor(x, y)) {
          const dest = self.map.getDoorDestination(x, y);

          self.player.setGridPosition(dest.x, dest.y);
          self.player.nextGridX = dest.x;
          self.player.nextGridY = dest.y;
          self.player.turnTo(dest.orientation);
          self.client.sendTeleport(dest.x, dest.y);

          if (self.renderer.mobile && dest.cameraX && dest.cameraY) {
            self.camera.setGridPosition(dest.cameraX, dest.cameraY);
            self.resetZone();
          } else {
            if (dest.portal) {
              self.assignBubbleTo(self.player);
            } else {
              self.camera.focusEntity(self.player);
              self.resetZone();
            }
          }

          if (_.size(self.player.attackers) > 0) {
            setTimeout(() => {
              self.tryUnlockingAchievement('COWARD');
            }, 500);
          }
          self.player.forEachAttacker(attacker => {
            attacker.disengage();
            attacker.idle();
          });

          self.updatePlateauMode();

          self.checkUndergroundAchievement();

          if (self.renderer.mobile || self.renderer.tablet) {
            // When rendering with dirty rects, clear the whole screen when entering a door.
            self.renderer.clearScreen(self.renderer.context);
          }

          if (dest.portal) {
            self.audioManager.playSound('teleport');
          }

          if (!self.player.isDead) {
            self.audioManager.updateMusic();
          }
        }

        if (self.player.target instanceof Npc) {
          self.makeNpcTalk(self.player.target);
        } else if (self.player.target instanceof Chest) {
          self.client.sendOpen(self.player.target);
          self.audioManager.playSound('chest');
        }

        self.player.forEachAttacker(attacker => {
          if (!attacker.isAdjacentNonDiagonal(self.player)) {
            attacker.follow(self.player);
          }
        });

        self.unregisterEntityPosition(self.player);
        self.registerEntityPosition(self.player);
      });

      self.player.onRequestPath((x, y) => {
        const ignored = [self.player]; // Always ignore self

        if (self.player.hasTarget()) {
          ignored.push(self.player.target);
        }
        return self.findPath(self.player, x, y, ignored);
      });

      self.player.onDeath(() => {
        log.info(`${self.playerId} is dead`);

        self.player.stopBlinking();
        self.player.setSprite(self.sprites.death);
        self.player.animate('death', 120, 1, () => {
          log.info(`${self.playerId} was removed`);

          self.removeEntity(self.player);
          self.removeFromRenderingGrid(self.player, self.player.gridX, self.player.gridY);

          self.player = null;
          self.client.disable();

          setTimeout(() => {
            self.playerdeath_callback();
          }, 1000);
        });

        self.player.forEachAttacker(attacker => {
          attacker.disengage();
          attacker.idle();
        });

        self.audioManager.fadeOutCurrentMusic();
        self.audioManager.playSound('death');
      });

      self.player.onHasMoved(player => {
        self.assignBubbleTo(player);
      });

      self.player.onArmorLoot(armorName => {
        self.player.switchArmor(self.sprites[armorName]);
      });

      self.player.onSwitchItem(() => {
        self.storage.savePlayer(self.renderer.getPlayerImage(),
          self.player.getArmorName(),
          self.player.getWeaponName());
        if (self.equipment_callback) {
          self.equipment_callback();
        }
      });

      self.player.onInvincible(() => {
        self.invincible_callback();
        self.player.switchArmor(self.sprites.firefox);
      });

      self.client.onSpawnItem((item, x, y) => {
        log.info(`Spawned ${Types.getKindAsString(item.kind)} (${item.id}) at ${x}
        , ${y}`);
        self.addItem(item, x, y);
      });

      self.client.onSpawnChest((chest, x, y) => {
        log.info(`Spawned chest (${chest.id}) at ${x}, ${y}`);
        chest.setSprite(self.sprites[chest.getSpriteName()]);
        chest.setGridPosition(x, y);
        chest.setAnimation('idle_down', 150);
        self.addEntity(chest, x, y);

        chest.onOpen(() => {
          chest.stopBlinking();
          chest.setSprite(self.sprites.death);
          chest.setAnimation('death', 120, 1, () => {
            log.info(`${chest.id} was removed`);
            self.removeEntity(chest);
            self.removeFromRenderingGrid(chest, chest.gridX, chest.gridY);
            self.previousClickPosition = {};
          });
        });
      });

      self.client.onSpawnCharacter((entity, x, y, orientation, targetId) => {
        if (!self.entityIdExists(entity.id)) {
          try {
            if (entity.id !== self.playerId) {
              entity.setSprite(self.sprites[entity.getSpriteName()]);
              entity.setGridPosition(x, y);
              entity.setOrientation(orientation);
              entity.idle();

              self.addEntity(entity);

              log.debug(`Spawned ${Types.getKindAsString(entity.kind)} (${entity.id}) at ${entity.gridX}
              , ${entity.gridY}`);

              if (entity instanceof Character) {
                entity.onBeforeStep(() => {
                  self.unregisterEntityPosition(entity);
                });

                entity.onStep(() => {
                  if (!entity.isDying) {
                    self.registerEntityDualPosition(entity);

                    entity.forEachAttacker(attacker => {
                      if (attacker.isAdjacent(attacker.target)) {
                        attacker.lookAtTarget();
                      } else {
                        attacker.follow(entity);
                      }
                    });
                  }
                });

                entity.onStopPathing((x, y) => {
                  if (!entity.isDying) {
                    if (entity.hasTarget() && entity.isAdjacent(entity.target)) {
                      entity.lookAtTarget();
                    }

                    if (entity instanceof Player) {
                      const gridX = entity.destination.gridX;
                      const gridY = entity.destination.gridY;

                      if (self.map.isDoor(gridX, gridY)) {
                        const dest = self.map.getDoorDestination(gridX, gridY);
                        entity.setGridPosition(dest.x, dest.y);
                      }
                    }

                    entity.forEachAttacker(attacker => {
                      if (!attacker.isAdjacentNonDiagonal(entity)
                        && attacker.id !== self.playerId) {
                        attacker.follow(entity);
                      }
                    });

                    self.unregisterEntityPosition(entity);
                    self.registerEntityPosition(entity);
                  }
                });

                entity.onRequestPath((x, y) => {
                  const // Always ignore self
                    ignored = [entity],
                    ignoreTarget = target => {
                      ignored.push(target);

                      // also ignore other attackers of the target entity
                      target.forEachAttacker(attacker => {
                        ignored.push(attacker);
                      });
                    };

                  if (entity.hasTarget()) {
                    ignoreTarget(entity.target);
                  } else if (entity.previousTarget) {
                    // If repositioning before attacking again, ignore previous target
                    // See: tryMovingToADifferentTile()
                    ignoreTarget(entity.previousTarget);
                  }

                  return self.findPath(entity, x, y, ignored);
                });

                entity.onDeath(() => {
                  log.info(`${entity.id} is dead`);

                  if (entity instanceof Mob) {
                    // Keep track of where mobs die in order to spawn their dropped items
                    // at the right position later.
                    self.deathpositions[entity.id] = { x: entity.gridx, y: entity.gridY };
                  }

                  entity.isDying = true;
                  entity.setSprite(self.sprites[entity instanceof Mobs.Rat ? 'rat' : 'death']);
                  entity.animate('death', 120, 1, () => {
                    log.info(`${entity.id} was removed`);

                    self.removeEntity(entity);
                    self.removeFromRenderingGrid(entity, entity.gridX, entity.gridY);
                  });

                  entity.forEachAttacker(attacker => {
                    attacker.disengage();
                  });

                  if (self.player.target && self.player.target.id === entity.id) {
                    self.player.disengage();
                  }

                  // Upon death, this entity is removed from both grids, allowing the player
                  // to click very fast in order to loot the dropped item and not be blocked.
                  // The entity is completely removed only after the death animation has ended.
                  self.removeFromEntityGrid(entity, entity.gridX, entity.gridY);
                  self.removeFromPathingGrid(entity.gridX, entity.gridY);

                  if (self.camera.isVisible(entity)) {
                    self.audioManager.playSound(`kill${Math.floor(Math.random() * 2 + 1)}`);
                  }

                  self.updateCursor();
                });

                entity.onHasMoved(entity => {
                  self.assignBubbleTo(entity); // Make chat bubbles follow moving entities
                });

                if (entity instanceof Mob) {
                  if (targetId) {
                    const player = self.getEntityById(targetId);
                    if (player) {
                      self.createAttackLink(entity, player);
                    }
                  }
                }
              }
            }
          }
          catch (e) {
            log.error(e);
          }
        } else {
          log.debug(`Character ${entity.id} already exists. Don't respawn.`);
        }
      });

      self.client.onDespawnEntity(entityId => {
        const entity = self.getEntityById(entityId);

        if (entity) {
          log.info(`Despawning ${Types.getKindAsString(entity.kind)} (${entity.id})`);

          if (entity.gridX === self.previousClickPosition.x
            && entity.gridY === self.previousClickPosition.y) {
            self.previousClickPosition = {};
          }

          if (entity instanceof Item) {
            self.removeItem(entity);
          } else if (entity instanceof Character) {
            entity.forEachAttacker(attacker => {
              if (attacker.canReachTarget()) {
                attacker.hit();
              }
            });
            entity.die();
          } else if (entity instanceof Chest) {
            entity.open();
          }

          entity.clean();
        }
      });

      self.client.onItemBlink(id => {
        const item = self.getEntityById(id);

        if (item) {
          item.blink(150);
        }
      });

      self.client.onEntityMove((id, x, y) => {
        let entity = null;

        if (id !== self.playerId) {
          entity = self.getEntityById(id);

          if (entity) {
            if (self.player.isAttackedBy(entity)) {
              self.tryUnlockingAchievement('COWARD');
            }
            entity.disengage();
            entity.idle();
            self.makeCharacterGoTo(entity, x, y);
          }
        }
      });

      self.client.onEntityDestroy(id => {
        const entity = self.getEntityById(id);
        if (entity) {
          if (entity instanceof Item) {
            self.removeItem(entity);
          } else {
            self.removeEntity(entity);
          }
          log.debug(`Entity was destroyed: ${entity.id}`);
        }
      });

      self.client.onPlayerMoveToItem((playerId, itemId) => {
        let player, item;

        if (playerId !== self.playerId) {
          player = self.getEntityById(playerId);
          item = self.getEntityById(itemId);

          if (player && item) {
            self.makeCharacterGoTo(player, item.gridX, item.gridY);
          }
        }
      });

      self.client.onEntityAttack((attackerId, targetId) => {
        const attacker = self.getEntityById(attackerId);
        const target = self.getEntityById(targetId);

        if (attacker && target && attacker.id !== self.playerId) {
          log.debug(`${attacker.id} attacks ${target.id}`);

          if (attacker && target instanceof Player && target.id !== self.playerId
            && target.target && target.target.id === attacker.id
            && attacker.getDistanceToEntity(target) < 3) {
            /*
             delay to prevent other players attacking mobs from
             ending up on the same tile as they walk towards each other.
             */
            setTimeout(() => {
              self.createAttackLink(attacker, target);
            }, 200);
          } else {
            self.createAttackLink(attacker, target);
          }
        }
      });

      self.client.onPlayerDamageMob((mobId, points) => {
        const mob = self.getEntityById(mobId);
        if (mob && points) {
          self.infoManager.addDamageInfo(points, mob.x, mob.y - 15, 'inflicted');
        }
      });

      self.client.onPlayerKillMob(kind => {
        let mobName = Types.getKindAsString(kind);

        if (mobName === 'skeleton2') {
          mobName = 'greater skeleton';
        }

        if (mobName === 'eye') {
          mobName = 'evil eye';
        }

        if (mobName === 'deathknight') {
          mobName = 'death knight';
        }

        if (mobName === 'boss') {
          self.showNotification('You killed the skeleton king');
        } else {
          if (_.includes(['a', 'e', 'i', 'o', 'u'], mobName[0])) {
            self.showNotification(`You killed an ${mobName}`);
          } else {
            self.showNotification(`You killed a ${mobName}`);
          }
        }

        self.storage.incrementTotalKills();
        self.tryUnlockingAchievement('HUNTER');

        if (kind === Types.Entities.RAT) {
          self.storage.incrementRatCount();
          self.tryUnlockingAchievement('ANGRY_RATS');
        }

        if (kind === Types.Entities.SKELETON || kind === Types.Entities.SKELETON2) {
          self.storage.incrementSkeletonCount();
          self.tryUnlockingAchievement('SKULL_COLLECTOR');
        }

        if (kind === Types.Entities.BOSS) {
          self.tryUnlockingAchievement('HERO');
        }
      });

      self.client.onPlayerChangeHealth((points, isRegen) => {
        const player = self.player;
        let diff;
        let isHurt;

        if (player && !player.isDead && !player.invincible) {
          isHurt = points <= player.hitPoints;
          diff = points - player.hitPoints;
          player.hitPoints = points;

          if (player.hitPoints <= 0) {
            player.die();
          }
          if (isHurt) {
            player.hurt();
            self.infoManager.addDamageInfo(diff, player.x, player.y - 15, 'received');
            self.audioManager.playSound('hurt');
            self.storage.addDamage(-diff);
            self.tryUnlockingAchievement('MEATSHIELD');
            if (self.playerhurt_callback) {
              self.playerhurt_callback();
            }
          } else if (!isRegen) {
            self.infoManager.addDamageInfo(`+${diff}`, player.x, player.y - 15, 'healed');
          }
          self.updateBars();
        }
      });

      self.client.onPlayerChangeMaxHitPoints(hp => {
        self.player.maxHitPoints = hp;
        self.player.hitPoints = hp;
        self.updateBars();
      });

      self.client.onPlayerEquipItem((playerId, itemKind) => {
        const player = self.getEntityById(playerId);
        const itemName = Types.getKindAsString(itemKind);

        if (player) {
          if (Types.isArmor(itemKind)) {
            player.setSprite(self.sprites[itemName]);
          } else if (Types.isWeapon(itemKind)) {
            player.setWeaponName(itemName);
          }
        }
      });

      self.client.onPlayerTeleport((id, x, y) => {
        let entity = null;
        let currentOrientation;

        if (id !== self.playerId) {
          entity = self.getEntityById(id);

          if (entity) {
            currentOrientation = entity.orientation;

            self.makeCharacterTeleportTo(entity, x, y);
            entity.setOrientation(currentOrientation);

            entity.forEachAttacker(attacker => {
              attacker.disengage();
              attacker.idle();
              attacker.stop();
            });
          }
        }
      });

      self.client.onDropItem((item, mobId) => {
        const pos = self.getDeadMobPosition(mobId);

        if (pos) {
          self.addItem(item, pos.x, pos.y);
          self.updateCursor();
        }
      });

      self.client.onChatMessage((entityId, message) => {
        const entity = self.getEntityById(entityId);
        self.createBubble(entityId, message);
        self.assignBubbleTo(entity);
        self.audioManager.playSound('chat');
      });

      self.client.onPopulationChange((worldPlayers, totalPlayers) => {
        if (self.nbplayers_callback) {
          self.nbplayers_callback(worldPlayers, totalPlayers);
        }
      });

      self.client.onDisconnected(message => {
        if (self.player) {
          self.player.die();
        }
        if (self.disconnect_callback) {
          self.disconnect_callback(message);
        }
      });

      self.gamestart_callback();

      if (self.hasNeverStarted) {
        self.start();
        startedCallback();
      }
    });
  }

  /**
   * Links two entities in an attacker<-->target relationship.
   * This is just a utility method to wrap a set of instructions.
   *
   * @param {Entity} attacker The attacker entity
   * @param {Entity} target The target entity
   */
  createAttackLink(attacker, target) {
    if (attacker.hasTarget()) {
      attacker.removeTarget();
    }
    attacker.engage(target);

    if (attacker.id !== this.playerId) {
      target.addAttacker(attacker);
    }
  }

  /**
   * Sends a 'hello' message to the server, as a way of initiating the player connection handshake.
   * @see GameClient.sendHello
   */
  sendHello() {
    this.client.sendHello(this.player);
  }

  /**
   * Converts the current mouse position on the screen to world grid coordinates.
   * @returns {Object} An object containing x and y properties.
   */
  getMouseGridPosition() {
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const c = this.renderer.camera;
    const s = this.renderer.scale;
    const ts = this.renderer.tilesize;
    const offsetX = mx % (ts * s);
    const offsetY = my % (ts * s);
    const x = ((mx - offsetX) / (ts * s)) + c.gridX;
    const y = ((my - offsetY) / (ts * s)) + c.gridY;

    return { x, y };
  }

  /**
   * Moves a character to a given location on the world grid.
   *
   * @param {Number} x The x coordinate of the target location.
   * @param {Number} y The y coordinate of the target location.
   */
  makeCharacterGoTo(character, x, y) {
    if (!this.map.isOutOfBounds(x, y)) {
      character.go(x, y);
    }
  }

  /**
   *
   */
  makeCharacterTeleportTo(character, x, y) {
    if (!this.map.isOutOfBounds(x, y)) {
      this.unregisterEntityPosition(character);

      character.setGridPosition(x, y);

      this.registerEntityPosition(character);
      this.assignBubbleTo(character);
    } else {
      log.debug(`Teleport out of bounds: ${x}, ${y}`);
    }
  }

  /**
   * Moves the current player to a given target location.
   * @see makeCharacterGoTo
   */
  makePlayerGoTo(x, y) {
    this.makeCharacterGoTo(this.player, x, y);
  }

  /**
   * Moves the current player towards a specific item.
   * @see makeCharacterGoTo
   */
  makePlayerGoToItem(item) {
    if (item) {
      this.player.isLootMoving = true;
      this.makePlayerGoTo(item.gridX, item.gridY);
      this.client.sendLootMove(item, item.gridX, item.gridY);
    }
  }

  /**
   *
   */
  makePlayerTalkTo(npc) {
    if (npc) {
      this.player.setTarget(npc);
      this.player.follow(npc);
    }
  }

  makePlayerOpenChest(chest) {
    if (chest) {
      this.player.setTarget(chest);
      this.player.follow(chest);
    }
  }

  /**
   *
   */
  makePlayerAttack(mob) {
    this.createAttackLink(this.player, mob);
    this.client.sendAttack(mob);
  }

  /**
   *
   */
  makeNpcTalk(npc) {
    let msg;

    if (npc) {
      msg = npc.talk();
      this.previousClickPosition = {};
      if (msg) {
        this.createBubble(npc.id, msg);
        this.assignBubbleTo(npc);
        this.audioManager.playSound('npc');
      } else {
        this.destroyBubble(npc.id);
        this.audioManager.playSound('npc-end');
      }
      this.tryUnlockingAchievement('SMALL_TALK');

      if (npc.kind === Types.Entities.RICK) {
        this.tryUnlockingAchievement('RICKROLLD');
      }
    }
  }

  /**
   * Loops through all the entities currently present in the game.
   * @param {Function} callback The function to call back (must accept one entity argument).
   */
  forEachEntity(callback) {
    _.each(this.entities, entity => {
      callback(entity);
    });
  }

  /**
   * Same as forEachEntity but only for instances of the Mob subclass.
   * @see forEachEntity
   */
  forEachMob(callback) {
    _.each(this.entities, entity => {
      if (entity instanceof Mob) {
        callback(entity);
      }
    });
  }

  /**
   * Loops through all entities visible by the camera and sorted by depth :
   * Lower 'y' value means higher depth.
   * Note: This is used by the Renderer to know in which order to render entities.
   */
  forEachVisibleEntityByDepth(callback) {
    const self = this;
    const m = this.map;

    this.camera.forEachVisiblePosition((x, y) => {
      if (!m.isOutOfBounds(x, y)) {
        if (self.renderingGrid[y][x]) {
          _.each(self.renderingGrid[y][x], entity => {
            callback(entity);
          });
        }
      }
    }, this.renderer.mobile ? 0 : 2);
  }

  /**
   *
   */
  forEachVisibleTileIndex(callback, extra) {
    const m = this.map;

    this.camera.forEachVisiblePosition((x, y) => {
      if (!m.isOutOfBounds(x, y)) {
        callback(m.gridPositionToTileIndex(x, y) - 1);
      }
    }, extra);
  }

  /**
   *
   */
  forEachVisibleTile(callback, extra) {
    const m = this.map;

    if (m.isLoaded) {
      this.forEachVisibleTileIndex(tileIndex => {
        if (_.isArray(m.data[tileIndex])) {
          _.each(m.data[tileIndex], id => {
            callback(id - 1, tileIndex);
          });
        } else {
          if (_.isNaN(m.data[tileIndex] - 1)) {
            // throw Error('Tile number for index:'+tileIndex+' is NaN');
          } else {
            callback(m.data[tileIndex] - 1, tileIndex);
          }
        }
      }, extra);
    }
  }

  /**
   *
   */
  forEachAnimatedTile(callback) {
    if (this.animatedTiles) {
      _.each(this.animatedTiles, tile => {
        callback(tile);
      });
    }
  }

  /**
   * Returns the entity located at the given position on the world grid.
   * @returns {Entity} the entity located at (x, y) or null if there is none.
   */
  getEntityAt(x, y) {
    if (this.map.isOutOfBounds(x, y) || !this.entityGrid) {
      return null;
    }

    const entities = this.entityGrid[y][x];
    let entity = null;
    if (_.size(entities) > 0) {
      entity = entities[_.keys(entities)[0]];
    } else {
      entity = this.getItemAt(x, y);
    }
    return entity;
  }

  getMobAt(x, y) {
    const entity = this.getEntityAt(x, y);
    if (entity && (entity instanceof Mob)) {
      return entity;
    }
    return null;
  }

  getNpcAt(x, y) {
    const entity = this.getEntityAt(x, y);
    if (entity && (entity instanceof Npc)) {
      return entity;
    }
    return null;
  }

  getChestAt(x, y) {
    const entity = this.getEntityAt(x, y);
    if (entity && (entity instanceof Chest)) {
      return entity;
    }
    return null;
  }

  getItemAt(x, y) {
    if (this.map.isOutOfBounds(x, y) || !this.itemGrid) {
      return null;
    }
    const items = this.itemGrid[y][x];
    let item = null;

    if (_.size(items) > 0) {
      // If there are potions/burgers stacked with equipment items
      // on the same tile, always get expendable items first.
      _.each(items, i => {
        if (Types.isExpendableItem(i.kind)) {
          item = i;
        }
      });

      // Else, get the first item of the stack
      if (!item) {
        item = items[_.keys(items)[0]];
      }
    }
    return item;
  }

  /**
   * Returns true if an entity is located at the given position on the world grid.
   * @returns {Boolean} Whether an entity is at (x, y).
   */
  isEntityAt(x, y) {
    return !_.isNull(this.getEntityAt(x, y));
  }

  isMobAt(x, y) {
    return !_.isNull(this.getMobAt(x, y));
  }

  isItemAt(x, y) {
    return !_.isNull(this.getItemAt(x, y));
  }

  isNpcAt(x, y) {
    return !_.isNull(this.getNpcAt(x, y));
  }

  isChestAt(x, y) {
    return !_.isNull(this.getChestAt(x, y));
  }

  /**
   * Finds a path to a grid position for the specified character.
   * The path will pass through any entity present in the ignore list.
   */
  findPath(character, x, y, ignoreList) {
    const self = this;
    const grid = this.pathingGrid;
    let path = [];

    if (this.map.isColliding(x, y)) {
      return path;
    }

    if (this.pathfinder && character) {
      if (ignoreList) {
        _.each(ignoreList, entity => {
          self.pathfinder.ignoreEntity(entity);
        });
      }

      path = this.pathfinder.findPath(grid, character, x, y, false);

      if (ignoreList) {
        this.pathfinder.clearIgnoreList();
      }
    } else {
      log.error(`Error while finding the path to ${x}, ${y} for ${character.id}`);
    }
    return path;
  }

  /**
   * Toggles the visibility of the pathing grid for debugging purposes.
   */
  togglePathingGrid() {
    this.debugPathing = !this.debugPathing;
  }

  /**
   * Toggles the visibility of the FPS counter and other debugging info.
   */
  toggleDebugInfo() {
    this.renderer.isDebugInfoVisible = !(this.renderer && this.renderer.isDebugInfoVisible);
  }

  /**
   *
   */
  movecursor() {
    const mouse = this.getMouseGridPosition();
    const x = mouse.x;
    const y = mouse.y;

    if (this.player && !this.renderer.mobile && !this.renderer.tablet) {
      this.hoveringCollidingTile = this.map.isColliding(x, y);
      this.hoveringPlateauTile = this.player.isOnPlateau ?
        !this.map.isPlateau(x, y) : this.map.isPlateau(x, y);
      this.hoveringMob = this.isMobAt(x, y);
      this.hoveringItem = this.isItemAt(x, y);
      this.hoveringNpc = this.isNpcAt(x, y);
      this.hoveringChest = this.isChestAt(x, y);

      if (this.hoveringMob || this.hoveringNpc || this.hoveringChest) {
        const entity = this.getEntityAt(x, y);

        if (!entity.isHighlighted && this.renderer.supportsSilhouettes) {
          if (this.lastHovered) {
            this.lastHovered.setHighlight(false);
          }
          this.lastHovered = entity;
          entity.setHighlight(true);
        }
      } else if (this.lastHovered) {
        this.lastHovered.setHighlight(false);
        this.lastHovered = null;
      }
    }
  }

  /**
   * Processes game logic when the user triggers a click/touch event during the game.
   */
  click() {
    const pos = this.getMouseGridPosition();
    let entity;

    if (pos.x === this.previousClickPosition.x
      && pos.y === this.previousClickPosition.y) {
      return;
    }

    this.previousClickPosition = pos;

    if (this.started
      && this.player
      && !this.isZoning()
      && !this.isZoningTile(this.player.nextGridX, this.player.nextGridY)
      && !this.player.isDead
      && !this.hoveringCollidingTile
      && !this.hoveringPlateauTile) {
      entity = this.getEntityAt(pos.x, pos.y);

      if (entity instanceof Mob) {
        this.makePlayerAttack(entity);
      } else if (entity instanceof Item) {
        this.makePlayerGoToItem(entity);
      } else if (entity instanceof Npc) {
        if (this.player.isAdjacentNonDiagonal(entity) === false) {
          this.makePlayerTalkTo(entity);
        } else {
          this.makeNpcTalk(entity);
        }
      } else if (entity instanceof Chest) {
        this.makePlayerOpenChest(entity);
      } else {
        this.makePlayerGoTo(pos.x, pos.y);
      }
    }
  }

  isMobOnSameTile(mob, x, y) {
    const X = x || mob.gridX;
    const Y = y || mob.gridY;
    const list = this.entityGrid[Y][X];
    let result = false;

    _.each(list, entity => {
      if (entity instanceof Mob && entity.id !== mob.id) {
        result = true;
      }
    });
    return result;
  }

  getFreeAdjacentNonDiagonalPosition(entity) {
    const self = this;
    let result = null;

    entity.forEachAdjacentNonDiagonalPosition((x, y, orientation) => {
      if (!result && !self.map.isColliding(x, y) && !self.isMobAt(x, y)) {
        result = { x, y, o: orientation };
      }
    });
    return result;
  }

  tryMovingToADifferentTile(character) {
    const attacker = character;
    const target = character.target;

    if (attacker && target && target instanceof Player) {
      if (!target.isMoving() && attacker.getDistanceToEntity(target) === 0) {
        let pos;

        switch (target.orientation) {
          case Types.Orientations.UP:
            pos = { x: target.gridX, y: target.gridY - 1, o: target.orientation };
            break;
          case Types.Orientations.LEFT:
            pos = { x: target.gridX - 1, y: target.gridY, o: target.orientation };
            break;
          case Types.Orientations.RIGHT:
            pos = { x: target.gridX + 1, y: target.gridY, o: target.orientation };
            break;
          default:
            pos = { x: target.gridX, y: target.gridY + 1, o: target.orientation };
            break;
        }

        if (pos) {
          attacker.previousTarget = target;
          attacker.disengage();
          attacker.idle();
          this.makeCharacterGoTo(attacker, pos.x, pos.y);
          target.adjacentTiles[pos.o] = true;

          return true;
        }
      }

      if (!target.isMoving()
        && attacker.isAdjacentNonDiagonal(target)
        && this.isMobOnSameTile(attacker)) {
        const pos = this.getFreeAdjacentNonDiagonalPosition(target);

        // avoid stacking mobs on the same tile next to a player
        // by making them go to adjacent tiles if they are available
        if (pos && !target.adjacentTiles[pos.o]) {
          if (this.player.target && attacker.id === this.player.target.id) {
            return false; // never unstack the player's target
          }

          attacker.previousTarget = target;
          attacker.disengage();
          attacker.idle();
          this.makeCharacterGoTo(attacker, pos.x, pos.y);
          target.adjacentTiles[pos.o] = true;

          return true;
        }
      }
    }
    return false;
  }

  /**
   *
   */
  onCharacterUpdate(_character) {
    const character = _character;
    const time = this.currentTime;

    // If mob has finished moving to a different tile
    // in order to avoid stacking, attack again from the new position.
    if (character.previousTarget && !character.isMoving()
      && character instanceof Mob) {
      const t = character.previousTarget;

      if (this.getEntityById(t.id)) { // does it still exist?
        character.previousTarget = null;
        this.createAttackLink(character, t);
        return;
      }
    }

    if (character.isAttacking() && !character.previousTarget) {
      // Don't let multiple mobs stack on the same tile when attacking a player.
      const isMoving = this.tryMovingToADifferentTile(character);

      if (character.canAttack(time)) {
        if (!isMoving) { // don't hit target if moving to a different tile.
          if (character.hasTarget()
            && character.getOrientationTo(character.target) !== character.orientation) {
            character.lookAtTarget();
          }

          character.hit();

          if (character.id === this.playerId) {
            this.client.sendHit(character.target);
          }

          if (character instanceof Player && this.camera.isVisible(character)) {
            this.audioManager.playSound(`hit${Math.floor(Math.random() * 2 + 1)}`);
          }

          if (character.hasTarget()
            && character.target.id === this.playerId
            && this.player
            && !this.player.invincible) {
            this.client.sendHurt(character);
          }
        }
      } else {
        if (character.hasTarget()
          && character.isDiagonallyAdjacent(character.target)
          && character.target instanceof Player
          && !character.target.isMoving()) {
          character.follow(character.target);
        }
      }
    }
  }

  /**
   *
   */
  isZoningTile(x, y) {
    const c = this.camera;

    x = x - c.gridX;
    y = y - c.gridY;

    return !!(x === 0 || y === 0 || x === c.gridW - 1 || y === c.gridH - 1);
  }

  /**
   *
   */
  getZoningOrientation(x, y) {
    let orientation = '';
    const c = this.camera;

    x = x - c.gridX;
    y = y - c.gridY;

    if (x === 0) {
      orientation = Types.Orientations.LEFT;
    } else if (y === 0) {
      orientation = Types.Orientations.UP;
    } else if (x === c.gridW - 1) {
      orientation = Types.Orientations.RIGHT;
    } else if (y === c.gridH - 1) {
      orientation = Types.Orientations.DOWN;
    }

    return orientation;
  }

  startZoningFrom(x, y) {
    this.zoningOrientation = this.getZoningOrientation(x, y);

    if (this.renderer.mobile || this.renderer.tablet) {
      const z = this.zoningOrientation;
      const c = this.camera;
      const ts = this.renderer.tilesize;
      const xoffset = (c.gridW - 2) * ts;
      const yoffset = (c.gridH - 2) * ts;
      let x = c.x;
      let y = c.y;

      if (z === Types.Orientations.LEFT || z === Types.Orientations.RIGHT) {
        x = (z === Types.Orientations.LEFT) ? c.x - xoffset : c.x + xoffset;
      } else if (z === Types.Orientations.UP || z === Types.Orientations.DOWN) {
        y = (z === Types.Orientations.UP) ? c.y - yoffset : c.y + yoffset;
      }
      c.setPosition(x, y);

      this.renderer.clearScreen(this.renderer.context);
      this.endZoning();

      // Force immediate drawing of all visible entities in the new zone
      this.forEachVisibleEntityByDepth(entity => {
        entity.setDirty();
      });
    } else {
      this.currentZoning = new Transition();
    }
    this.bubbleManager.clean();
    this.client.sendZone();
  }

  enqueueZoningFrom(x, y) {
    this.zoningQueue.push({ x, y });

    if (this.zoningQueue.length === 1) {
      this.startZoningFrom(x, y);
    }
  }

  endZoning() {
    this.currentZoning = null;
    this.resetZone();
    this.zoningQueue.shift();

    if (this.zoningQueue.length > 0) {
      const pos = this.zoningQueue[0];
      this.startZoningFrom(pos.x, pos.y);
    }
  }

  isZoning() {
    return !_.isNull(this.currentZoning);
  }

  resetZone() {
    this.bubbleManager.clean();
    this.initAnimatedTiles();
    this.renderer.renderStaticCanvases();
  }

  resetCamera() {
    this.camera.focusEntity(this.player);
    this.resetZone();
  }

  say(message) {
    this.client.sendChat(message);
  }

  createBubble(id, message) {
    this.bubbleManager.create(id, message, this.currentTime);
  }

  destroyBubble(id) {
    this.bubbleManager.destroyBubble(id);
  }

  assignBubbleTo(character) {
    const bubble = this.bubbleManager.getBubbleById(character.id);

    if (bubble) {
      const s = this.renderer.scale;

      const // tile size
        t = 16 * s;

      const x = ((character.x - this.camera.x) * s);
      const w = parseInt(bubble.element.css('width'), 10) + 24;
      const offset = (w / 2) - (t / 2);
      let offsetY;
      let y;

      if (character instanceof Npc) {
        offsetY = 0;
      } else {
        if (s === 2) {
          if (this.renderer.mobile) {
            offsetY = 0;
          } else {
            offsetY = 15;
          }
        } else {
          offsetY = 12;
        }
      }

      y = ((character.y - this.camera.y) * s) - (t * 2) - offsetY;

      bubble.element.css('left', `${x - offset}px`);
      bubble.element.css('top', `${y}px`);
    }
  }

  restart() {
    log.debug('Beginning restart');

    this.entities = {};
    this.initEntityGrid();
    this.initPathingGrid();
    this.initRenderingGrid();

    this.player = new Warrior('player', this.username);
    this.initPlayer();

    this.started = true;
    this.client.enable();
    this.sendHello(this.player);

    this.storage.incrementRevives();

    if (this.renderer.mobile || this.renderer.tablet) {
      this.renderer.clearScreen(this.renderer.context);
    }

    log.debug('Finished restart');
  }

  onGameStart(callback) {
    this.gamestart_callback = callback;
  }

  onDisconnect(callback) {
    this.disconnect_callback = callback;
  }

  onPlayerDeath(callback) {
    this.playerdeath_callback = callback;
  }

  onPlayerHealthChange(callback) {
    this.playerhp_callback = callback;
  }

  onPlayerHurt(callback) {
    this.playerhurt_callback = callback;
  }

  onPlayerEquipmentChange(callback) {
    this.equipment_callback = callback;
  }

  onNbPlayersChange(callback) {
    this.nbplayers_callback = callback;
  }

  onNotification(callback) {
    this.notification_callback = callback;
  }

  onPlayerInvincible(callback) {
    this.invincible_callback = callback;
  }

  resize() {
    const x = this.camera.x;
    const y = this.camera.y;
    const newScale = this.renderer.getScaleFactor();

    this.renderer.rescale(newScale);
    this.camera = this.renderer.camera;
    this.camera.setPosition(x, y);

    this.renderer.renderStaticCanvases();
  }

  updateBars() {
    if (this.player && this.playerhp_callback) {
      this.playerhp_callback(this.player.hitPoints, this.player.maxHitPoints);
    }
  }

  getDeadMobPosition(mobId) {
    let position;

    if (mobId in this.deathpositions) {
      position = this.deathpositions[mobId];
      delete this.deathpositions[mobId];
    }

    return position;
  }

  onAchievementUnlock(callback) {
    this.unlock_callback = callback;
  }

  tryUnlockingAchievement(name) {
    let achievement = null;
    if (name in this.achievements) {
      achievement = this.achievements[name];

      if (achievement.isCompleted() && this.storage.unlockAchievement(achievement.id)) {
        if (this.unlock_callback) {
          this.unlock_callback(achievement.id, achievement.name, achievement.desc);
          this.audioManager.playSound('achievement');
        }
      }
    }
  }

  showNotification(message) {
    if (this.notification_callback) {
      this.notification_callback(message);
    }
  }

  removeObsoleteEntities() {
    const nb = _.size(this.obsoleteEntities);
    const self = this;

    if (nb > 0) {
      _.each(this.obsoleteEntities, entity => {
        if (entity.id !== self.player.id) { // never remove yourself
          self.removeEntity(entity);
        }
      });
      log.debug(`Removed ${nb} entities: ${_.map(_.reject(this.obsoleteEntities, function (id) {
        return id === self.player.id
      }), 'id')}`);
      this.obsoleteEntities = null;
    }
  }

  /**
   * Fake a mouse move event in order to update the cursor.
   *
   * For instance, to get rid of the sword cursor in case the mouse
   * is still hovering over a dying mob.
   * Also useful when the mouse is hovering a tile where an item is appearing.
   */
  updateCursor() {
    this.movecursor();
    this.updateCursorLogic();
  }

  /**
   * Change player plateau mode when necessary
   */
  updatePlateauMode() {
    if (this.map.isPlateau(this.player.gridX, this.player.gridY)) {
      this.player.isOnPlateau = true;
    } else {
      this.player.isOnPlateau = false;
    }
  }

  updatePlayerCheckpoint() {
    const checkpoint = this.map.getCurrentCheckpoint(this.player);

    if (checkpoint) {
      const lastCheckpoint = this.player.lastCheckpoint;
      if (!lastCheckpoint || (lastCheckpoint && lastCheckpoint.id !== checkpoint.id)) {
        this.player.lastCheckpoint = checkpoint;
        this.client.sendCheck(checkpoint.id);
      }
    }
  }

  checkUndergroundAchievement() {
    const music = this.audioManager.getSurroundingMusic(this.player);

    if (music) {
      if (music.name === 'cave') {
        this.tryUnlockingAchievement('UNDERGROUND');
      }
    }
  }

  forEachEntityAround(x, y, r, callback) {
    for (let i = x - r, maxI = x + r; i <= maxI; i += 1) {
      for (let j = y - r, maxJ = y + r; j <= maxJ; j += 1) {
        if (!this.map.isOutOfBounds(i, j)) {
          _.each(this.renderingGrid[j][i], entity => {
            callback(entity);
          });
        }
      }
    }
  }

  checkOtherDirtyRects(r1, source, x, y) {
    const r = this.renderer;

    this.forEachEntityAround(x, y, 2, e2 => {
      if (source && source.id && e2.id === source.id) {
        return;
      }
      if (!e2.isDirty) {
        const r2 = r.getEntityBoundingRect(e2);
        if (r.isIntersecting(r1, r2)) {
          e2.setDirty();
        }
      }
    });

    if (source && !(source.hasOwnProperty('index'))) {
      this.forEachAnimatedTile(tile => {
        if (!tile.isDirty) {
          const r2 = r.getTileBoundingRect(tile);
          if (r.isIntersecting(r1, r2)) {
            tile.isDirty = true;
          }
        }
      });
    }

    if (!this.drawTarget && this.selectedCellVisible) {
      const targetRect = r.getTargetBoundingRect();
      if (r.isIntersecting(r1, targetRect)) {
        this.drawTarget = true;
        this.renderer.targetRect = targetRect;
      }
    }
  }
}

export default Game;
