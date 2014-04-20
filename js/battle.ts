/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class BattleEffectEvent extends createjs.Event {
    kind: string;
    magnitude: number;
    reflected: boolean; // not in use currently
  }

  export class Enemy extends cgdice.DomDisplayObject {
    public name: string;
    public HP: number;
    public ATK: number;

    private update() {
      var e = this.element;
      $('.enemy_name', e).text(this.name);
      $('.enemy_hp', e).text(this.HP);
    }

    public hit(damage: number): void {
      createjs.Tween.get(this.element[0])
        .to({top: 15}, 150)
        .to({top: 0}, 150)
        .call(() => {
          this.hitEffectEnd(damage);
        });
    }

    private hitEffectEnd(damage: number) {
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

    constructor(id: string) {
      super('enemy');
      var data = application.loader.getResult('enemies');
      if (!(id in data)) { alert('Runtime Error: no such enemy ID'); }
      var e = data[id];
      console.log(e);
      this.element.find('.enemy_image').attr('src', 'images/' + e.image);
      this.name = e.name;
      this.HP = e.HP;
      this.ATK = e.ATK;
      this.update();
    }
  }

  export class Battle extends cgdice.DomDisplayObject {
    public enemy: Enemy;
    public onboard: number[];

    public start() {
      this.enemy = new Enemy('chibichihi1');
      $('#enemies', this.element).empty();
      this.enemy.element.appendTo('#enemies');
      this.enemy.on('enemyAttack', this.enemyAttacked, this);
      this.enemy.on('turnEnd', this.enemyTurnEnd, this);
      this.dispatchEvent('initialized');
      this.shuffleOnboardDice();
      this.element.show();
    }

    public shuffleOnboardDice() {
      var i = 0;
      this.onboard = [];
      var elem = this.element.find('#onboard');
      elem.empty();
      for (i = 0; i <= 1; i++) {
        var pips = Math.floor(Math.random() * 6 + 1);
        this.onboard.push(pips);
        var dice = new cgdice.Dice();
        dice.pips = pips;
        dice.element.appendTo(elem);
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
      if (this.enemy.HP <= 0) {
        game.console.log('勝利!');
        this.element.hide();
        this.dispatchEvent('battleFinish');
      } else {
        this.shuffleOnboardDice();
      }
      this.dispatchEvent('diceProcess');
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