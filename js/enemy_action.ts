module cgdice.battles {
  export class EnemyAction {
    public owner: Enemy;
    public options: any;

    public invoke(callback: () => void) {
      callback();
    }

    constructor(owner: Enemy, options: any) {
      this.owner = owner;
      this.options = options;
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

  export class AddStatusAction extends EnemyAction {
    public invoke(callback: () => void) {
      var st = <StatusType>StatusType[<string>this.options.status];
      if (typeof st == 'undefined') {
        alert('Internal error: wrong status type');
      } else {
        game.players.forEach(p => {
          if (Math.random() < this.options.probability) {
            var status = new Status(st, 2, true);
            p.registerStatus(status);
          }
        });
      }
      callback();
    }
  }

  /**
   * Does nothing
   */
  export class NullAction extends EnemyAction {
    public invoke(callback: () => void) {
      setTimeout(callback, 1500); // just wait
    }
  }

}