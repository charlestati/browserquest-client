import Npc from './npc';
import Types from './gametypes';

const NPCs = {

  Guard: class Guard extends Npc {
    constructor(id) {
      super(id, Types.Entities.GUARD, 1);
    }
  },

  King: class King extends Npc {
    constructor(id) {
      super(id, Types.Entities.KING, 1);
    }
  },

  Agent: class Agent extends Npc {
    constructor(id) {
      super(id, Types.Entities.AGENT, 1);
    }
  },

  Rick: class Rick extends Npc {
    constructor(id) {
      super(id, Types.Entities.RICK, 1);
    }
  },

  VillageGirl: class VillageGirl extends Npc {
    constructor(id) {
      super(id, Types.Entities.VILLAGEGIRL, 1);
    }
  },

  Villager: class Villager extends Npc {
    constructor(id) {
      super(id, Types.Entities.VILLAGER, 1);
    }
  },

  Coder: class Coder extends Npc {
    constructor(id) {
      super(id, Types.Entities.CODER, 1);
    }
  },

  Scientist: class Scientist extends Npc {
    constructor(id) {
      super(id, Types.Entities.SCIENTIST, 1);
    }
  },

  Nyan: class Nyan extends Npc {
    constructor(id) {
      super(id, Types.Entities.NYAN, 1);
      this.idleSpeed = 50;
    }
  },

  Sorcerer: class Sorcerer extends Npc {
    constructor(id) {
      super(id, Types.Entities.SORCERER, 1);
      this.idleSpeed = 150;
    }
  },

  Priest: class Priest extends Npc {
    constructor(id) {
      super(id, Types.Entities.PRIEST, 1);
    }
  },

  BeachNpc: class BeachNpc extends Npc {
    constructor(id) {
      super(id, Types.Entities.BEACHNPC, 1);
    }
  },

  ForestNpc: class ForestNpc extends Npc {
    constructor(id) {
      super(id, Types.Entities.FORESTNPC, 1);
    }
  },

  DesertNpc: class DesertNpc extends Npc {
    constructor(id) {
      super(id, Types.Entities.DESERTNPC, 1);
    }
  },

  LavaNpc: class LavaNpc extends Npc {
    constructor(id) {
      super(id, Types.Entities.LAVANPC, 1);
    }
  },

  Octocat: class Octocat extends Npc {
    constructor(id) {
      super(id, Types.Entities.OCTOCAT, 1);
    }
  },
};

export default NPCs
