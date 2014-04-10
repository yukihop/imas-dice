/// <reference path="game.ts" />

module cgdice.battles {
  export class Enemy extends createjs.EventDispatcher {
    public HP: number = 30;
    public ATK: number = 15;
  }

  export class Battle extends createjs.EventDispatcher {
    public enemy: Enemy;

    public start() {
      this.enemy = new Enemy();
      this.dispatchEvent('initialized');

    }

  }
}