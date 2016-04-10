import Character from './character';
import Exceptions from './exceptions';
import Types from './gametypes';
import log from 'log';

class Player extends Character {

  constructor(id, name, kind) {
    super(id, kind);

    this.name = name;

    // Renderer
    this.nameOffsetY = -10;

    // sprites
    this.spriteName = 'clotharmor';
    this.weaponName = 'sword1';

    // modes
    this.isLootMoving = false;
    this.isSwitchingWeapon = true;
    this.MAX_LEVEL = 10;
  }

  loot(item) {
    if (item) {
      let rank;
      let currentRank;
      let msg;
      let currentArmorName;

      if (this.currentArmorSprite) {
        currentArmorName = this.currentArmorSprite.name;
      } else {
        currentArmorName = this.spriteName;
      }

      if (item.type === 'armor') {
        rank = Types.getArmorRank(item.kind);
        currentRank = Types.getArmorRank(Types.getKindFromString(currentArmorName));
        msg = 'You are wearing a better armor';
      } else if (item.type === 'weapon') {
        rank = Types.getWeaponRank(item.kind);
        currentRank = Types.getWeaponRank(Types.getKindFromString(this.weaponName));
        msg = 'You are wielding a better weapon';
      }

      if (rank && currentRank) {
        if (rank === currentRank) {
          throw new Exceptions.LootException(`You already have this ${item.type}`);
        } else if (rank <= currentRank) {
          throw new Exceptions.LootException(msg);
        }
      }

      log.info(`Player ${this.id} has looted ${item.id}`);
      if (Types.isArmor(item.kind) && this.invincible) {
        this.stopInvincibility();
      }
      item.onLoot(this);
    }
  }

  /**
   * Returns true if the character is currently walking towards an item in order to loot it.
   */
  isMovingToLoot() {
    return this.isLootMoving;
  }

  getSpriteName() {
    return this.spriteName;
  }

  setSpriteName(name) {
    this.spriteName = name;
  }

  getArmorName() {
    const sprite = this.getArmorSprite();
    return sprite.id;
  }

  getArmorSprite() {
    if (this.invincible) {
      return this.currentArmorSprite;
    }
    return this.sprite;
  }

  getWeaponName() {
    return this.weaponName;
  }

  setWeaponName(name) {
    this.weaponName = name;
  }

  hasWeapon() {
    return this.weaponName !== null;
  }

  switchWeapon(newWeaponName) {
    let count = 14;
    let value = false;
    const self = this;

    const toggle = () => {
      value = !value;
      return value;
    };

    if (newWeaponName !== this.getWeaponName()) {
      const blanking = setInterval(() => {
        if (toggle()) {
          self.setWeaponName(newWeaponName);
        } else {
          self.setWeaponName(null);
        }

        count -= 1;
        if (count === 1) {
          clearInterval(blanking);
          self.switchingWeapon = false;

          if (self.switch_callback) {
            self.switch_callback();
          }
        }
      }, 90);

      if (this.isSwitchingWeapon) {
        clearInterval(blanking);
      }

      this.switchingWeapon = true;
    }
  }

  switchArmor(newArmorSprite) {
    let count = 14;
    let value = false;
    const self = this;

    const toggle = () => {
      value = !value;
      return value;
    };

    const blanking = setInterval(() => {
      self.setVisible(toggle());

      count -= 1;
      if (count === 1) {
        clearInterval(blanking);
        self.isSwitchingArmor = false;

        if (self.switch_callback) {
          self.switch_callback();
        }
      }
    }, 90);

    if (newArmorSprite && newArmorSprite.id !== this.getSpriteName()) {
      if (this.isSwitchingArmor) {
        clearInterval(blanking);
      }

      this.isSwitchingArmor = true;
      self.setSprite(newArmorSprite);
      self.setSpriteName(newArmorSprite.id);
    }
  }

  onArmorLoot(callback) {
    this.armorloot_callback = callback;
  }

  onSwitchItem(callback) {
    this.switch_callback = callback;
  }

  onInvincible(callback) {
    this.invincible_callback = callback;
  }

  startInvincibility() {
    const self = this;

    if (!this.invincible) {
      this.currentArmorSprite = this.getSprite();
      this.invincible = true;
      this.invincible_callback();
    } else {
      // If the player already has invincibility, just reset its duration.
      if (this.invincibleTimeout) {
        clearTimeout(this.invincibleTimeout);
      }
    }

    this.invincibleTimeout = setTimeout(() => {
      self.stopInvincibility();
      self.idle();
    }, 15000);
  }

  stopInvincibility() {
    this.invincible_callback();
    this.invincible = false;

    if (this.currentArmorSprite) {
      this.setSprite(this.currentArmorSprite);
      this.setSpriteName(this.currentArmorSprite.id);
      this.currentArmorSprite = null;
    }
    if (this.invincibleTimeout) {
      clearTimeout(this.invincibleTimeout);
    }
  }
}

export default Player;
