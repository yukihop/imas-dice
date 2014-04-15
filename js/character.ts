module cgdice.characters {
  export class Skill extends createjs.EventDispatcher {
    public name: string;
    public use(): void {
    }
  }

  export class Multiplier {
    public dices: number[];

    public check(checked: number[]) {
      var ok: boolean = true;
      return ok;
    }
  }

  export class Character extends createjs.EventDispatcher {
    public name: string;
    private _exp: number = 0;
    private _multipliers: Multiplier[];

    public gainExp(value: number): void {
      this._exp += value;
    }

    public setExp(value: number): void {
      this._exp = value;
    }

    public level(): number {
      var lv = Math.floor(Math.sqrt(this._exp)) + 1;
      return Math.min(50, lv);
    }

    public maxHP(): number {
      var lv = this.level();
      return lv * 10 + 100;
    }

    public attackPower(pips: number[]): number {
      var result: number = 0;
      pips.forEach(v => { result += v; });
      return result;
    }

    public availableMultipliers(): Multiplier[] {
      return [];
    }

    public availableSkills(): Skill[] {
      return [];
    }
  }

}