import io from 'socket.io';
import $ from 'jquery';
import _ from 'lodash';
import log from 'log';
import Player from './player';
import EntityFactory from './entityfactory';
import Types from './gametypes';

class GameClient {
  constructor(host, port) {
    this.connection = null;
    this.host = host;
    this.port = port;

    this.connected_callback = null;
    this.spawn_callback = null;
    this.movement_callback = null;

    this.handlers = [];
    this.handlers[Types.Messages.WELCOME] = this.receiveWelcome;
    this.handlers[Types.Messages.MOVE] = this.receiveMove;
    this.handlers[Types.Messages.LOOTMOVE] = this.receiveLootMove;
    this.handlers[Types.Messages.ATTACK] = this.receiveAttack;
    this.handlers[Types.Messages.SPAWN] = this.receiveSpawn;
    this.handlers[Types.Messages.DESPAWN] = this.receiveDespawn;
    this.handlers[Types.Messages.SPAWN_BATCH] = this.receiveSpawnBatch;
    this.handlers[Types.Messages.HEALTH] = this.receiveHealth;
    this.handlers[Types.Messages.CHAT] = this.receiveChat;
    this.handlers[Types.Messages.EQUIP] = this.receiveEquipItem;
    this.handlers[Types.Messages.DROP] = this.receiveDrop;
    this.handlers[Types.Messages.TELEPORT] = this.receiveTeleport;
    this.handlers[Types.Messages.DAMAGE] = this.receiveDamage;
    this.handlers[Types.Messages.POPULATION] = this.receivePopulation;
    this.handlers[Types.Messages.LIST] = this.receiveList;
    this.handlers[Types.Messages.DESTROY] = this.receiveDestroy;
    this.handlers[Types.Messages.KILL] = this.receiveKill;
    this.handlers[Types.Messages.HP] = this.receiveHitPoints;
    this.handlers[Types.Messages.BLINK] = this.receiveBlink;

    this.useBison = false;
    this.enable();
  }

  enable() {
    this.isListening = true;
  }

  disable() {
    this.isListening = false;
  }

  connect(dispatcherMode) {
    const url = `http://${this.host}:${this.port}/`;
    const self = this;


    this.connection = io(url, { 'force new connection': true });
    this.connection.on('connection', () => {
      log.info(`Connected to server ${url}`);
    });

    /* *****
     Dispatcher is a system where you could have another server you connect to first
     which then provides an IP and port for the client to connect to the game server
     ***** */
    if (dispatcherMode) {
      this.connection.emit('dispatch', true);

      this.connection.on('dispatched', reply => {
        log.info('Dispatched: ');
        log.info(reply);
        if (reply.status === 'OK') {
          self.dispatched_callback(reply.host, reply.port);
        } else if (reply.status === 'FULL') {
          log.info(
            'BrowserQuest is currently at maximum player population. Please retry later.'
          );
        } else {
          log.info('Unknown error while connecting to BrowserQuest.');
        }
      });
    } else {
      this.connection.on('message', data => {
        if (data === 'go') {
          if (self.connected_callback) {
            self.connected_callback();
          }
          return;
        }
        if (data === 'timeout') {
          self.isTimeout = true;
          return;
        }

        self.receiveMessage(data);
      });

      /* this.connection.onerror = function(e) {
       log.error(e, true);
       }; */

      this.connection.on('disconnect', () => {
        log.debug('Connection closed');
        $('#container').addClass('error');

        if (self.disconnected_callback) {
          if (self.isTimeout) {
            self.disconnected_callback(
              'You have been disconnected for being inactive for too long'
            );
          } else {
            self.disconnected_callback('The connection to BrowserQuest has been lost');
          }
        }
      });
    }
  }

  sendMessage(json) {
    if (this.connection.connected) {
      this.connection.emit('message', json);
    }
  }

  receiveMessage(message) {
    if (this.isListening) {
      log.debug(`data: ${message}`);

      if (message instanceof Array) {
        if (message[0] instanceof Array) {
          // Multiple actions received
          this.receiveActionBatch(message);
        } else {
          // Only one action received
          this.receiveAction(message);
        }
      }
    }
  }

  receiveAction(data) {
    const action = data[0];
    if (this.handlers[action] && _.isFunction(this.handlers[action])) {
      this.handlers[action].call(this, data);
    } else {
      log.error(`Unknown action : ${action}`);
    }
  }

  receiveActionBatch(actions) {
    const self = this;

    _.each(actions, action => {
      self.receiveAction(action);
    });
  }

  receiveWelcome(data) {
    const id = data[1];
    const name = data[2];
    const x = data[3];
    const y = data[4];
    const hp = data[5];

    if (this.welcome_callback) {
      this.welcome_callback(id, name, x, y, hp);
    }
  }

  receiveMove(data) {
    const id = data[1];
    const x = data[2];
    const y = data[3];

    if (this.move_callback) {
      this.move_callback(id, x, y);
    }
  }

  receiveLootMove(data) {
    const id = data[1];
    const item = data[2];

    if (this.lootmove_callback) {
      this.lootmove_callback(id, item);
    }
  }

  receiveAttack(data) {
    const attacker = data[1];
    const target = data[2];

    if (this.attack_callback) {
      this.attack_callback(attacker, target);
    }
  }

  receiveSpawn(data) {
    const id = data[1];
    const kind = data[2];
    const x = data[3];
    const y = data[4];

    if (Types.isItem(kind)) {
      const item = EntityFactory.createEntity(kind, id);

      if (this.spawn_item_callback) {
        this.spawn_item_callback(item, x, y);
      }
    } else if (Types.isChest(kind)) {
      const item = EntityFactory.createEntity(kind, id);

      if (this.spawn_chest_callback) {
        this.spawn_chest_callback(item, x, y);
      }
    } else {
      let name;
      let orientation;
      let target;
      let weapon;
      let armor;

      if (Types.isPlayer(kind)) {
        name = data[5];
        orientation = data[6];
        armor = data[7];
        weapon = data[8];
        if (data.length > 9) {
          target = data[9];
        }
      } else if (Types.isMob(kind)) {
        orientation = data[5];
        if (data.length > 6) {
          target = data[6];
        }
      }

      const character = EntityFactory.createEntity(kind, id, name);

      if (character instanceof Player) {
        character.weaponName = Types.getKindAsString(weapon);
        character.spriteName = Types.getKindAsString(armor);
      }

      if (this.spawn_character_callback) {
        this.spawn_character_callback(character, x, y, orientation, target);
      }
    }
  }

  receiveDespawn(data) {
    const id = data[1];

    if (this.despawn_callback) {
      this.despawn_callback(id);
    }
  }

  receiveHealth(data) {
    const points = data[1];
    let isRegen = false;

    if (data[2]) {
      isRegen = true;
    }

    if (this.health_callback) {
      this.health_callback(points, isRegen);
    }
  }

  receiveChat(data) {
    const id = data[1];
    const text = data[2];

    if (this.chat_callback) {
      this.chat_callback(id, text);
    }
  }

  receiveEquipItem(data) {
    const id = data[1];
    const itemKind = data[2];

    if (this.equip_callback) {
      this.equip_callback(id, itemKind);
    }
  }

  receiveDrop(data) {
    const mobId = data[1];
    const id = data[2];
    const kind = data[3];

    const item = EntityFactory.createEntity(kind, id);
    item.wasDropped = true;
    item.playersInvolved = data[4];

    if (this.drop_callback) {
      this.drop_callback(item, mobId);
    }
  }

  receiveTeleport(data) {
    const id = data[1];
    const x = data[2];
    const y = data[3];

    if (this.teleport_callback) {
      this.teleport_callback(id, x, y);
    }
  }

  receiveDamage(data) {
    const id = data[1];
    const dmg = data[2];

    if (this.dmg_callback) {
      this.dmg_callback(id, dmg);
    }
  }

  receivePopulation(data) {
    const worldPlayers = data[1];
    const totalPlayers = data[2];

    if (this.population_callback) {
      this.population_callback(worldPlayers, totalPlayers);
    }
  }

  receiveKill(data) {
    const mobKind = data[1];

    if (this.kill_callback) {
      this.kill_callback(mobKind);
    }
  }

  receiveList(data) {
    data.shift();

    if (this.list_callback) {
      this.list_callback(data);
    }
  }

  receiveDestroy(data) {
    const id = data[1];

    if (this.destroy_callback) {
      this.destroy_callback(id);
    }
  }

  receiveHitPoints(data) {
    const maxHp = data[1];

    if (this.hp_callback) {
      this.hp_callback(maxHp);
    }
  }

  receiveBlink(data) {
    const id = data[1];

    if (this.blink_callback) {
      this.blink_callback(id);
    }
  }

  onDispatched(callback) {
    this.dispatched_callback = callback;
  }

  onConnected(callback) {
    this.connected_callback = callback;
  }

  onDisconnected(callback) {
    this.disconnected_callback = callback;
  }

  onWelcome(callback) {
    this.welcome_callback = callback;
  }

  onSpawnCharacter(callback) {
    this.spawn_character_callback = callback;
  }

  onSpawnItem(callback) {
    this.spawn_item_callback = callback;
  }

  onSpawnChest(callback) {
    this.spawn_chest_callback = callback;
  }

  onDespawnEntity(callback) {
    this.despawn_callback = callback;
  }

  onEntityMove(callback) {
    this.move_callback = callback;
  }

  onEntityAttack(callback) {
    this.attack_callback = callback;
  }

  onPlayerChangeHealth(callback) {
    this.health_callback = callback;
  }

  onPlayerEquipItem(callback) {
    this.equip_callback = callback;
  }

  onPlayerMoveToItem(callback) {
    this.lootmove_callback = callback;
  }

  onPlayerTeleport(callback) {
    this.teleport_callback = callback;
  }

  onChatMessage(callback) {
    this.chat_callback = callback;
  }

  onDropItem(callback) {
    this.drop_callback = callback;
  }

  onPlayerDamageMob(callback) {
    this.dmg_callback = callback;
  }

  onPlayerKillMob(callback) {
    this.kill_callback = callback;
  }

  onPopulationChange(callback) {
    this.population_callback = callback;
  }

  onEntityList(callback) {
    this.list_callback = callback;
  }

  onEntityDestroy(callback) {
    this.destroy_callback = callback;
  }

  onPlayerChangeMaxHitPoints(callback) {
    this.hp_callback = callback;
  }

  onItemBlink(callback) {
    this.blink_callback = callback;
  }

  sendHello(player) {
    this.sendMessage([Types.Messages.HELLO,
      player.name,
      Types.getKindFromString(player.getSpriteName()),
      Types.getKindFromString(player.getWeaponName())]);
  }

  sendMove(x, y) {
    this.sendMessage([Types.Messages.MOVE,
      x,
      y]);
  }

  sendLootMove(item, x, y) {
    this.sendMessage([Types.Messages.LOOTMOVE,
      x,
      y,
      item.id]);
  }

  sendAggro(mob) {
    this.sendMessage([Types.Messages.AGGRO,
      mob.id]);
  }

  sendAttack(mob) {
    this.sendMessage([Types.Messages.ATTACK,
      mob.id]);
  }

  sendHit(mob) {
    this.sendMessage([Types.Messages.HIT,
      mob.id]);
  }

  sendHurt(mob) {
    this.sendMessage([Types.Messages.HURT,
      mob.id]);
  }

  sendChat(text) {
    this.sendMessage([Types.Messages.CHAT,
      text]);
  }

  sendLoot(item) {
    this.sendMessage([Types.Messages.LOOT,
      item.id]);
  }

  sendTeleport(x, y) {
    this.sendMessage([Types.Messages.TELEPORT,
      x,
      y]);
  }

  sendWho(ids) {
    ids.unshift(Types.Messages.WHO);
    this.sendMessage(ids);
  }

  sendZone() {
    this.sendMessage([Types.Messages.ZONE]);
  }

  sendOpen(chest) {
    this.sendMessage([Types.Messages.OPEN,
      chest.id]);
  }

  sendCheck(id) {
    this.sendMessage([Types.Messages.CHECK,
      id]);
  }
}

export default GameClient;
