import _ from 'lodash';

const Types = {
  Messages: {
    HELLO: 0,
    WELCOME: 1,
    SPAWN: 2,
    DESPAWN: 3,
    MOVE: 4,
    LOOTMOVE: 5,
    AGGRO: 6,
    ATTACK: 7,
    HIT: 8,
    HURT: 9,
    HEALTH: 10,
    CHAT: 11,
    LOOT: 12,
    EQUIP: 13,
    DROP: 14,
    TELEPORT: 15,
    DAMAGE: 16,
    POPULATION: 17,
    KILL: 18,
    LIST: 19,
    WHO: 20,
    ZONE: 21,
    DESTROY: 22,
    HP: 23,
    BLINK: 24,
    OPEN: 25,
    CHECK: 26,
  },

  Entities: {
    WARRIOR: 1,

    // Mobs
    RAT: 2,
    SKELETON: 3,
    GOBLIN: 4,
    OGRE: 5,
    SPECTRE: 6,
    CRAB: 7,
    BAT: 8,
    WIZARD: 9,
    EYE: 10,
    SNAKE: 11,
    SKELETON2: 12,
    BOSS: 13,
    DEATHKNIGHT: 14,

    // Armors
    FIREFOX: 20,
    CLOTHARMOR: 21,
    LEATHERARMOR: 22,
    MAILARMOR: 23,
    PLATEARMOR: 24,
    REDARMOR: 25,
    GOLDENARMOR: 26,

    // Objects
    FLASK: 35,
    BURGER: 36,
    CHEST: 37,
    FIREPOTION: 38,
    CAKE: 39,

    // NPCs
    GUARD: 40,
    KING: 41,
    OCTOCAT: 42,
    VILLAGEGIRL: 43,
    VILLAGER: 44,
    PRIEST: 45,
    SCIENTIST: 46,
    AGENT: 47,
    RICK: 48,
    NYAN: 49,
    SORCERER: 50,
    BEACHNPC: 51,
    FORESTNPC: 52,
    DESERTNPC: 53,
    LAVANPC: 54,
    CODER: 55,

    // Weapons
    SWORD1: 60,
    SWORD2: 61,
    REDSWORD: 62,
    GOLDENSWORD: 63,
    MORNINGSTAR: 64,
    AXE: 65,
    BLUESWORD: 66,
  },

  Orientations: {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
  },
};

const kinds = {
  warrior: [Types.Entities.WARRIOR, 'player'],

  rat: [Types.Entities.RAT, 'mob'],
  skeleton: [Types.Entities.SKELETON, 'mob'],
  goblin: [Types.Entities.GOBLIN, 'mob'],
  ogre: [Types.Entities.OGRE, 'mob'],
  spectre: [Types.Entities.SPECTRE, 'mob'],
  deathknight: [Types.Entities.DEATHKNIGHT, 'mob'],
  crab: [Types.Entities.CRAB, 'mob'],
  snake: [Types.Entities.SNAKE, 'mob'],
  bat: [Types.Entities.BAT, 'mob'],
  wizard: [Types.Entities.WIZARD, 'mob'],
  eye: [Types.Entities.EYE, 'mob'],
  skeleton2: [Types.Entities.SKELETON2, 'mob'],
  boss: [Types.Entities.BOSS, 'mob'],

  sword1: [Types.Entities.SWORD1, 'weapon'],
  sword2: [Types.Entities.SWORD2, 'weapon'],
  axe: [Types.Entities.AXE, 'weapon'],
  redsword: [Types.Entities.REDSWORD, 'weapon'],
  bluesword: [Types.Entities.BLUESWORD, 'weapon'],
  goldensword: [Types.Entities.GOLDENSWORD, 'weapon'],
  morningstar: [Types.Entities.MORNINGSTAR, 'weapon'],

  firefox: [Types.Entities.FIREFOX, 'armor'],
  clotharmor: [Types.Entities.CLOTHARMOR, 'armor'],
  leatherarmor: [Types.Entities.LEATHERARMOR, 'armor'],
  mailarmor: [Types.Entities.MAILARMOR, 'armor'],
  platearmor: [Types.Entities.PLATEARMOR, 'armor'],
  redarmor: [Types.Entities.REDARMOR, 'armor'],
  goldenarmor: [Types.Entities.GOLDENARMOR, 'armor'],

  flask: [Types.Entities.FLASK, 'object'],
  cake: [Types.Entities.CAKE, 'object'],
  burger: [Types.Entities.BURGER, 'object'],
  chest: [Types.Entities.CHEST, 'object'],
  firepotion: [Types.Entities.FIREPOTION, 'object'],

  guard: [Types.Entities.GUARD, 'npc'],
  villagegirl: [Types.Entities.VILLAGEGIRL, 'npc'],
  villager: [Types.Entities.VILLAGER, 'npc'],
  coder: [Types.Entities.CODER, 'npc'],
  scientist: [Types.Entities.SCIENTIST, 'npc'],
  priest: [Types.Entities.PRIEST, 'npc'],
  king: [Types.Entities.KING, 'npc'],
  rick: [Types.Entities.RICK, 'npc'],
  nyan: [Types.Entities.NYAN, 'npc'],
  sorcerer: [Types.Entities.SORCERER, 'npc'],
  agent: [Types.Entities.AGENT, 'npc'],
  octocat: [Types.Entities.OCTOCAT, 'npc'],
  beachnpc: [Types.Entities.BEACHNPC, 'npc'],
  forestnpc: [Types.Entities.FORESTNPC, 'npc'],
  desertnpc: [Types.Entities.DESERTNPC, 'npc'],
  lavanpc: [Types.Entities.LAVANPC, 'npc'],

  getType: kind => kinds[Types.getKindAsString(kind)][1],
};

Types.rankedWeapons = [
  Types.Entities.SWORD1,
  Types.Entities.SWORD2,
  Types.Entities.AXE,
  Types.Entities.MORNINGSTAR,
  Types.Entities.BLUESWORD,
  Types.Entities.REDSWORD,
  Types.Entities.GOLDENSWORD,
];

Types.rankedArmors = [
  Types.Entities.CLOTHARMOR,
  Types.Entities.LEATHERARMOR,
  Types.Entities.MAILARMOR,
  Types.Entities.PLATEARMOR,
  Types.Entities.REDARMOR,
  Types.Entities.GOLDENARMOR,
];

Types.getWeaponRank = weaponKind => _.indexOf(Types.rankedWeapons, weaponKind);

Types.getArmorRank = armorKind => _.indexOf(Types.rankedArmors, armorKind);

Types.isPlayer = kind => kinds.getType(kind) === 'player';

Types.isMob = kind => kinds.getType(kind) === 'mob';

Types.isNpc = kind => kinds.getType(kind) === 'npc';

Types.isCharacter = kind => Types.isMob(kind) || Types.isNpc(kind) || Types.isPlayer(kind);

Types.isArmor = kind => kinds.getType(kind) === 'armor';

Types.isWeapon = kind => kinds.getType(kind) === 'weapon';

Types.isObject = kind => kinds.getType(kind) === 'object';

Types.isChest = kind => kind === Types.Entities.CHEST;

Types.isItem = kind => Types.isWeapon(kind)
|| Types.isArmor(kind)
|| (Types.isObject(kind) && !Types.isChest(kind));

Types.isHealingItem = kind => kind === Types.Entities.FLASK
|| kind === Types.Entities.BURGER;

Types.isExpendableItem = kind => Types.isHealingItem(kind)
|| kind === Types.Entities.FIREPOTION
|| kind === Types.Entities.CAKE;

Types.getKindFromString = kind => {
  if (kind in kinds) {
    return kinds[kind][0];
  }
  throw new Error('Unknown kind');
};

Types.getKindAsString = kind => {
  for (const key in kinds) {
    if (kinds[key][0] === kind) {
      return key;
    }
  }
  throw new Error('Unknown kind');
};

// todo Check if this works
Types.forEachKind = callback => {
  for (const k in kinds) {
    if ({}.hasOwnProperty.call(kinds, kinds[k][0], k)) {
      callback(kinds[k][0], k);
    }
  }
};

Types.forEachArmor = callback => {
  Types.forEachKind((kind, kindName) => {
    if (Types.isArmor(kind)) {
      callback(kind, kindName);
    }
  });
};

Types.forEachMobOrNpcKind = callback => {
  Types.forEachKind((kind, kindName) => {
    if (Types.isMob(kind) || Types.isNpc(kind)) {
      callback(kind, kindName);
    }
  });
};

Types.forEachArmorKind = callback => {
  Types.forEachKind((kind, kindName) => {
    if (Types.isArmor(kind)) {
      callback(kind, kindName);
    }
  });
};

Types.getOrientationAsString = orientation => {
  switch (orientation) {
    case Types.Orientations.LEFT:
      return 'left';
    case Types.Orientations.RIGHT:
      return 'right';
    case Types.Orientations.UP:
      return 'up';
    default:
      return 'down';
  }
};

Types.getRandomItemKind = function () {
  const all = _.union(this.rankedWeapons, this.rankedArmors);
  const forbidden = [Types.Entities.SWORD1, Types.Entities.CLOTHARMOR];
  const itemKinds = _.difference(all, forbidden);
  const i = Math.floor(Math.random() * _.size(itemKinds));

  return itemKinds[i];
};

Types.getMessageTypeAsString = type => {
  let typeName;
  _.each(Types.Messages, (value, name) => {
    if (value === type) {
      typeName = name;
    }
  });
  if (!typeName) {
    typeName = 'UNKNOWN';
  }
  return typeName;
};

export default Types;
