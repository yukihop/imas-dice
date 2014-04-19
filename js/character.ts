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
      for (var p = 1; p <= 6; p++) {
        var multiplier_count = this.dices.filter((n) => n == p).length;
        var checked_count = checked.filter((n) => n == p).length;
        if (multiplier_count > checked_count) ok = false;
      }
      return ok;
    }
  }

  export class Character extends cgdice.DomDisplayObject {
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
      return this._multipliers;
    }

    public availableSkills(): Skill[] {
      return [];
    }

    public redraw() {
      this.element.find('.name').text(this.name);
      console.log(this);
      var muls = this.element.find('.multipliers');
      muls.empty();
      $.each(this._multipliers, (i, mul) => {
        var m = $('<div>').addClass('multiplier');
        m.text(mul.dices.join('/')).appendTo(muls);
      });
    }

    constructor() {
      super('character');
      // random multiplier
      var m = new Multiplier;
      m.dices = [Math.floor(Math.random() * 6 + 1)];
      this._multipliers = [m];
      this.redraw();
    }
  }

}