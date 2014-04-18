/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class Enemy extends cgdice.DomDisplayObject {
    public name: string = 'てき';
    public HP: number = 40;
    public ATK: number = 15;

    private update() {
      var e = this.element;
      $('.enemy_name', e).text(this.name);
      $('.enemy_hp', e).text(this.HP);
    }

    public hit(damage: number): void {
      this.HP = Math.max(this.HP - damage, 0);
      this.update();
      this.dispatchEvent('hpChange');
    }

    public enemyAttack(): void {
      var power: number = Math.floor(Math.random() * 10) + 5;
      this.dispatchEvent('enemyAttack');
    }

    constructor() {
      super('enemy');
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
      this.dispatchEvent('initialized');
      this.shuffleOnboardDice();
      this.element.show();
    }

    public updateEnemy() {
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
      alert(all_pips.join(' & ') + ', ' + all_power);
      this.enemy.hit(all_power);

      if (this.enemy.HP <= 0) {
        alert('Win!');
        this.element.hide();
        this.dispatchEvent('battleFinish');
      }

      this.shuffleOnboardDice();
      this.dispatchEvent('diceProcess');
    }

    public enemyAttacked(damage: number) {
      game.getDamage(damage);
    }

    constructor() {
      super($('#battle'));
    }

  }
}