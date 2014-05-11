module cgdice.battles {
  export class EnemyAction {
    public owner: Enemy;

    public invoke(callback: () => void) {
      callback();
    }

    constructor(owner: Enemy) {
      this.owner = owner;
    }
  }

  export class AttackAction extends EnemyAction {
    public invoke(callback: () => void) {
      var owner = this.owner;
      var power_min: number = owner.ATK * 0.8;
      var power_var: number = owner.ATK * 0.4;
      var power: number = Math.floor(Math.random() * power_var + power_min);
      power = Math.max(1, power);
      game.console.log(owner.name + 'から' + power + 'の攻撃!');

      new FlyText({
        text: power.toString(),
        parent: owner.element,
        class: 'enemy_attack'
      });
      owner.element.transition(
        { scale: 1.1 },
        500,
        'ease',
        () => {
          owner.element.transition({ scale: 1 });
          var event = new BattleEffectEvent('enemyAttack', false, false);
          event.kind = 'physicalAttack';
          event.magnitude = power;
          owner.dispatchEvent(event);
          callback();
        }
        );

    }
  }

  /**
   * Does nothing
   */
  export class NullAction extends EnemyAction {
    public invoke(callback: () => void) {
      game.console.log(this.owner.name + 'はボーっとしている');
      setTimeout(callback, 1500);
    }
  }

}