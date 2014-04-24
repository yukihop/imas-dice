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

    public resetHighlight() {
      this.element.find('.multiplier').removeClass('invoked invokable');
      this.element.find('.current_attack').text('');
    }

    public highlightMultipliers(pips: number[], selectable: number[]) {
      var elem = this.element.find('.multiplier');
      this.resetHighlight();
      this._multipliers.forEach((mul, mul_idx) => {
        if (mul.check(pips)) {
          // invoked
          elem.eq(mul_idx).addClass('invoked');
        } else {
          // invokable
          selectable.forEach((choice) => {
            var tmp = pips.slice();
            tmp.push(choice);
            if (mul.check(tmp)) {
              elem.eq(mul_idx).addClass('invokable');
            }
          });
        }
      });
    }

    public showCurrentAttackPower(pips: number[]) {
      var atk = this.attackPower(pips);
      this.element.find('.current_attack').text(atk);
    }

    public attackPower(pips: number[]): number {
      var result: number = 0;
      var scale: number = 1;
      pips.forEach(v => { result += v; });
      this._multipliers.forEach((mul) => {
        if (mul.check(pips)) scale *= mul.scale;
      });
      result *= scale;
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
      this.element.find('.hp_max').text(this.maxHP());
      this.element.find('.lv').text(this.level());
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