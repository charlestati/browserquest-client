import Character from './character';

class Mob extends Character {
  constructor(id, kind) {
    super(id, kind);

    this.aggroRange = 1;
    this.isAggressive = true;
  }
}

export default Mob;
