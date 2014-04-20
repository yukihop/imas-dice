module cgdice.characters {
  export class Skill extends createjs.EventDispatcher {
    public name: string;
    public use(): void {
    }
  }

  export class Multiplier {
    public dices: number[];
    public scale: number = 2;

    public check(checked: number[]) {
      var ok: boolean = true;
      for (var p = 1; p <= 6; p++) {
        var multiplier_count = this.dices.filter((n) => n == p).length;
        var checked_count = checked.filter((n) => n == p).length;
        if (multiplier_count > checked_count) ok = false;
      }
      return ok;
    }

    constructor(data: string) {
      var m = data.split('>', 2);
      this.dices = m[0].split('').map((v) => parseInt(v));
      this.scale = parseInt(m[1]);
    }
  }

  export class Character extends cgdice.DomDisplayObject {
    public name: string;
    private _exp: number = 0;
    private _multipliers: Multiplier[];
    private _baseHP: number = 10;

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
      return lv * this._baseHP;
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
      var muls = this.element.find('.multipliers');
      muls.empty();
      $.each(this._multipliers, (i, mul) => {
        var m = $('<div>').addClass('multiplier');
        $.each(mul.dices, (idx, pips) => {
          $('<div>').addClass('dice').addClass('dice' + pips).appendTo(m);
        });
        m.append(' x' + mul.scale).appendTo(muls);
      });
    }

    constructor(id: string) {
      super('character');
      var character_data = <Array<any>>application.loader.getResult('characters');
      for (var i = 0; i < character_data.length; i++) {
        var c = character_data[i];
        if (c.name == id) {
          this.name = c.name;
          this._baseHP = c.base_hp;
          this.element.css('background-image', 'url(images/' + c.image + ')');
          this._multipliers = $.map(c.multipliers, (v) => { return new Multiplier(v); });
        }
      }
    }
  }

}