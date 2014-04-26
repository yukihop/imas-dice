module cgdice.characters {
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
    private _image: string;
    public attribute: string;
    private _exp: number = 0;
    private _multipliers: Multiplier[];
    private _baseHP: number = 10;
    private _skills: skills.AbstractSkill[];

    public gainExp(value: number): void {
      this._exp += value;
      this.redraw();
    }

    public setExp(value: number): void {
      this._exp = value;
      this.redraw();
    }

    public level(): number {
      var lv = Math.floor(Math.sqrt(this._exp / 10)) + 1;
      return Math.min(50, lv);
    }

    public maxHP(): number {
      var lv = this.level();
      return lv * this._baseHP;
    }

    get image(): string {
      return this._image;
    }

    public resetHighlight() {
      this.element.find('.multiplier').removeClass('invoked invokable');
      this.element.find('.current_attack').text('');
    }

    public highlightMultipliers(pips: number[], selectable: number[]) {
      var elem = this.element.find('.multiplier').removeClass('invoked invokable');
      this._multipliers.forEach((mul, mul_idx) => {
        if (mul.check(pips)) {
          // invoked
          elem.eq(mul_idx)
            .addClass('invoked')
            .css({ scale: 2 })
            .transition({ scale: 1 }, 700);
        } else {
          selectable.forEach((choice) => {
            var tmp = pips.slice();
            tmp.push(choice);
            if (mul.check(tmp)) {
              // invokable
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

    public availableSkills(): skills.AbstractSkill[] {
      return this._skills;
    }

    private updateSkillInvokableStatus(event) {
      this.element.find('.skill').each((i, elem) => {
        var e = $(elem);
        var skill: cgdice.skills.AbstractSkill = e.data('skill');
        var invokable = skill.skillInvokable();
        e.toggleClass('enabled', invokable);
      });
    }

    public redraw() {
      this.element.find('.name').text(this.name);
      this.element.find('.hp_max').text(this.maxHP());
      this.element.find('.lv').text(this.level());
      this.element.find('.attribute').attr('class', 'attribute ' + this.attribute);
      var muls = this.element.find('.multipliers');
      muls.empty();
      this._multipliers.forEach(mul => {
        var m = $('<div>').addClass('multiplier');
        mul.dices.forEach(pips => {
          $('<div>').addClass('dice').addClass('dice' + pips).appendTo(m);
        });
        m.append(' x' + mul.scale).appendTo(muls);
      });
      var list = $('.skills', this.element);
      list.empty();
      this._skills.forEach(skill => {
        var m = $('<li>').addClass('skill').data('skill', skill);
        m.text(skill.name);
        list.append(m);
      });
    }

    constructor(id: string) {
      super('character');
      var character_data = <Array<any>>application.loader.getResult('characters');
      for (var i = 0; i < character_data.length; i++) {
        var c = character_data[i];
        if (c.name == id) {
          this.name = c.name;
          this.attribute = c.attribute;
          this._baseHP = c.base_hp;
          this._image = c.image;
          this.element.css('background-image', 'url(images/' + c.image + ')');
          this._multipliers = $.map(c.multipliers, (v) => { return new Multiplier(v); });
          this._skills = [];
          c.skills.forEach(skill => {
            this._skills.push(skills.AbstractSkill.create(skill));
          });
        }
      }

      this.element.on('mouseenter', $.proxy(this.updateSkillInvokableStatus, this));
      game.on('phaseChange', this.updateSkillInvokableStatus, this);

      this.element.on('click', '.skill', (event) => {
        var skill = <cgdice.skills.AbstractSkill>$(event.currentTarget).data('skill');
        if (!skill.skillInvokable()) return; // final check for availability
        this.element.trigger('skillTrigger', skill);
      });
    }
  }

}