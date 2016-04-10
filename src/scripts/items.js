import Item from './item';
import Types from './gametypes';

const Items = {
  Sword2: class Sword2 extends Item {
    constructor(id) {
      super(id, Types.Entities.SWORD2, 'weapon');
      this.lootMessage = 'You pick up a steel sword';
    }
  },

  Axe: class Axe extends Item {
    constructor(id) {
      super(id, Types.Entities.AXE, 'weapon');
      this.lootMessage = 'You pick up an axe';
    }
  },

  RedSword: class RedSword extends Item {
    constructor(id) {
      super(id, Types.Entities.REDSWORD, 'weapon');
      this.lootMessage = 'You pick up a blazing sword';
    }
  },

  BlueSword: class BlueSword extends Item {
    constructor(id) {
      super(id, Types.Entities.BLUESWORD, 'weapon');
      this.lootMessage = 'You pick up a magic sword';
    }
  },

  GoldenSword: class GoldenSword extends Item {
    constructor(id) {
      super(id, Types.Entities.GOLDENSWORD, 'weapon');
      this.lootMessage = 'You pick up the ultimate sword';
    }
  },

  MorningStar: class MorningStar extends Item {
    constructor(id) {
      super(id, Types.Entities.MORNINGSTAR, 'weapon');
      this.lootMessage = 'You pick up a morning star';
    }
  },


  LeatherArmor: class LeatherArmor extends Item {
    constructor(id) {
      super(id, Types.Entities.LEATHERARMOR, 'armor');
      this.lootMessage = 'You equip a leather armor';
    }
  },

  MailArmor: class MailArmor extends Item {
    constructor(id) {
      super(id, Types.Entities.MAILARMOR, 'armor');
      this.lootMessage = 'You equip a mail armor';
    }
  },

  PlateArmor: class PlateArmor extends Item {
    constructor(id) {
      super(id, Types.Entities.PLATEARMOR, 'armor');
      this.lootMessage = 'You equip a plate armor';
    }
  },

  RedArmor: class RedArmor extends Item {
    constructor(id) {
      super(id, Types.Entities.REDARMOR, 'armor');
      this.lootMessage = 'You equip a ruby armor';
    }
  },

  GoldenArmor: class GoldenArmor extends Item {
    constructor(id) {
      super(id, Types.Entities.GOLDENARMOR, 'armor');
      this.lootMessage = 'You equip a golden armor';
    }
  },

  Flask: class Flask extends Item {
    constructor(id) {
      super(id, Types.Entities.FLASK, 'object');
      this.lootMessage = 'You drink a health potion';
    }
  },

  Cake: class Cake extends Item {
    constructor(id) {
      super(id, Types.Entities.CAKE, 'object');
      this.lootMessage = 'You eat a cake';
    }
  },

  Burger: class Burger extends Item {
    constructor(id) {
      super(id, Types.Entities.BURGER, 'object');
      this.lootMessage = 'You can haz rat burger';
    }
  },

  FirePotion: class FirePotion extends Item {
    constructor(id) {
      super(id, Types.Entities.FIREPOTION, 'object');
      this.lootMessage = 'You feel the power of Firefox!';
    }

    onLoot(player) {
      player.startInvincibility();
    }
  },
};

export default Items;
