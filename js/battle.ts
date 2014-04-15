/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class Enemy extends createjs.EventDispatcher {
    public name: string = 'てき';
    public HP: number = 30;
    public ATK: number = 15;

    public hit(damage: number): void {
      this.HP -= Math.max(this.HP - damage, 0);
      this.dispatchEvent('hpChange');
    }

    public enemyAttack(): void {
      var power: number = Math.floor(Math.random() * 10) + 5;
      this.dispatchEvent('enemyAttack');
    }
  }

  export class Battle extends cgdice.DomDisplayObject {
    public enemy: Enemy;
    public onboard: number[];

    public start() {
      this.enemy = new Enemy();
      this.enemy.on('enemyAttack', this.enemyAttacked);
      this.dispatchEvent('initialized');
      this.element.find('#enemy_name').text(this.enemy.name);
      this.element.find('#enemy_hp').text(this.enemy.HP);
      this.element.show();
    }

    public diceDetermined(pips: number) {
      var all_power: number = 0;
      var all_pips: number[] = this.onboard.slice();
      all_pips.push(pips);
      game.players.forEach((p: cgdice.characters.Character) => {
        all_power += p.attackPower(all_pips);
      });
      this.enemy.hit(all_power);
    }

    public enemyAttacked(damage: number) {
      game.getDamage(damage);
    }

    constructor() {
      super($('#battle'));
    }

  }
}