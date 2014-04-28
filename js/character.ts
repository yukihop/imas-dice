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

  export interface AttackModifier {
    caption: string;
    ATK: number;
  }

  export interface AttackPowerInfo {
    ATK: number;
    modifiers: AttackModifier[];
  }

  export class Character extends cgdice.StatusClient {
    public name: string;
    private _image: string;
    public attribute: string;
    private _exp: number = 0;
    private _multipliers: Multiplier[];
    private _baseHP: number = 10;
    private _skills: skills.Skill[];
    private _MP: number = 10;

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
      // +10% per level
      var lv = this.level();
      return Math.floor((9 + lv) * this._baseHP / 10);
    }

    get image(): string {
      return this._image;
    }

    get MP(): number { return this._MP; }

    set MP(value: number) {
      var maxMP = this.maxMP();
      value = Math.max(0, Math.min(maxMP, value));
      this._MP = value;
      var frame_width = this.element.find('.mp_frame').width();
      var newWidth = (value / maxMP) * frame_width;
      this.element.find('.mp_bar').transition({ width: newWidth }, 300);
      this.element.find('.mp').text('MP: ' + this._MP + '/' + this.maxMP());
    }

    public maxMP(): number {
      return 10;
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

    public statusChanged() {
      var list = this.element.find('.status_list');
      list.empty();
      this.status.forEach(st => {
        var txt = StatusType[st.type] + ' ' + st.remainingTurns + 'T';
        var div = $('<div>').text(txt);
        div.appendTo(list);
      });
    }

    public attackPower(pips: number[]): AttackPowerInfo {
      var result: AttackPowerInfo = { ATK: 0, modifiers: [] };
      var current: number = 0;
      var scale: number = 1;

      if (this.hasStatus(StatusType.Stun)) {
        result.modifiers.push({
          caption: 'スタン',
          ATK: 0
        });
        return result;
      }

      // Calculate sum of dice numbers
      pips.forEach(v => { current += v; });
      result.modifiers.push({
        caption: '',
        ATK: current
      });

      // Calculate dice combinations
      this._multipliers.forEach((mul) => {
        if (mul.check(pips)) {
          current *= mul.scale;
          result.modifiers.push({
            caption: mul.scale + '倍',
            ATK: current
          });
        }
      });

      // Attack multiplie status
      this.findStatus(StatusType.AttackMultiply).forEach(st => {
        current *= st.options.scale;
        result.modifiers.push({
          caption: '攻撃力' + st.options.scale + '倍',
          ATK: current
        });
      });

      result.ATK = current;
      return result;
    }

    public availableMultipliers(): Multiplier[] {
      return this._multipliers;
    }

    public availableSkills(): skills.Skill[] {
      return this._skills;
    }

    private updateSkillInvokableStatus(event) {
      this.element.find('.skill').each((i, elem) => {
        var e = $(elem);
        var skill: cgdice.skills.Skill = e.data('skill');
        var invokable = true;
        if (skill.cost > this.MP) {
          invokable = false;
        }
        if (this.hasStatus([StatusType.Curse, StatusType.Stun])) {
          invokable = false;
        }
        invokable = invokable && skill.skillInvokable();
        e.toggleClass('enabled', invokable);
      });
    }

    public redraw() {
      this.element.find('.name').text(this.name);
      this.element.find('.hp_max').text(this.maxHP());
      this.element.find('.mp').text('MP: ' + this._MP + '/' + this.maxMP());

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
            this._skills.push(skills.Skill.create(skill, this));
          });
        }
      }

      game.on('ready', this.updateSkillInvokableStatus, this);

      this.element.on('click', '.skill.enabled', (event) => {
        var skill = <cgdice.skills.Skill>$(event.currentTarget).data('skill');
        if (!game.ready) return;
        // if (!skill.skillInvokable()) return; // final check for availability
        this.element.trigger('skillTrigger', skill);
      });

      this.element.on('mouseenter', '.skill', (event) => {
        var skill = <cgdice.skills.Skill>$(event.currentTarget).data('skill');
        $('#tooltip')
          .text(skill.desc + ' 消費' + skill.cost)
          .show()
          .position({ of: event.currentTarget, my: 'left', at: 'right+5' });
        // $('#tooltip').css({left: '10px', top: '10px'});
      });
      this.element.on('mouseleave', '.skill', (event) => { $('#tooltip').hide(); });
    }
  }

}