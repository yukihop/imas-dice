/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class BattleEffectEvent extends createjs.Event {
    kind: string;
    magnitude: number;
    reflected: boolean; // not in use currently
  }

  export class Enemy extends cgdice.DomDisplayObject {
    public name: string = 'てき';
    public HP: number;
    public ATK: number;

    private update() {
      var e = this.element;
      $('.enemy_name', e).text(this.name);
      $('.enemy_hp', e).text(this.HP);
    }

    public hit(damage: number): void {
      this.HP = Math.max(this.HP - damage, 0);
      this.update();
      this.dispatchEvent('hpChange');
      if (this.HP <= 0) {
        this.die();
      } else {
        this.myTurn();
      }
    }

    private myTurn(): void {
      this.enemyAttack();
      this.dispatchEvent('turnEnd');
    }

    private die(): void {
      game.console.log(this.name + 'は倒れた');
      this.dispatchEvent('turnEnd');
    }

    public enemyAttack(): void {
      var power: number = Math.floor(Math.random() * this.ATK);
      game.console.log(this.name + 'から' + power + 'の攻撃!');
      var event = new BattleEffectEvent('enemyAttack', false, false);
      event.kind = 'physicalAttack';
      event.magnitude = power;
      this.dispatchEvent(event);
    }

    constructor() {
      super('enemy');
      this.HP = Math.floor(Math.random() * 40 + 40);
      this.ATK = 15;
      this.update();
    }
  }

  export class Battle extends cgdice.DomDisplayObject {
    public enemy: Enemy;
    public onboard: number[];

    public start() {
      this.enemy = new Enemy();
      $('#enemies', this.element).empty();
      this.enemy.element.appendTo('#enemies');
      this.enemy.on('enemyAttack', this.enemyAttacked);
      this.enemy.on('turnEnd', this.enemyTurnEnd);
      this.dispatchEvent('initialized');
      this.shuffleOnboardDice();
      this.element.show();
    }

    public shuffleOnboardDice() {
      var i = 0;
      this.onboard = [];
      for (i = 0; i <= 1; i++) {
        var d = Math.floor(Math.random() * 6 + 1);
        this.onboard.push(d);
        this.element.find('#onboard').text(this.onboard.join(', '));
      }
    }

    public diceDetermined(pips: number) {
      var all_power: number = 0;
      var all_pips: number[] = this.onboard.slice();
      all_pips.push(pips);
      game.players.forEach((p: cgdice.characters.Character) => {
        all_power += p.attackPower(all_pips);
      });
      game.console.log(all_power + 'の攻撃!');
      this.enemy.hit(all_power);
    }

    private enemyTurnEnd() {
      this.dispatchEvent('diceProcess');
      if (this.enemy.HP <= 0) {
        game.console.log('勝利!');
        this.element.hide();
        this.dispatchEvent('battleFinish');
      } else {
        this.shuffleOnboardDice();
      }
    }

    public enemyAttacked(event: BattleEffectEvent) {
      game.console.log(event.magnitude + 'の攻撃を受けた');
      game.getDamage(event.magnitude);
    }

    constructor() {
      super($('#battle'));
    }

  }
}