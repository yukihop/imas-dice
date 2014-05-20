module cgdice {
  export class SkillSelector extends DomDisplayObject {

    private _currentCharacter: characters.Character;

    private resetToCharacter(character: characters.Character, prevAnimation: boolean = false) {
      this._currentCharacter = character;
      var src = 'images/characters/' + character.image.replace('.png', '_large.png');
      $('.name', this.element).text(character.name);
      $('.character_desc', this.element).text(character.desc);
      $('#skill_selector_bg', this.element)
        .attr('src', src)
        .stop(true, true)
        .css({ x: prevAnimation ? -50 : 50, opacity: 0 })
        .transition({ x: 0, opacity: 1, duration: 500 });
      this.updateSkillTree();
    }

    private updateSkillTree() {
      var list = $('.skill_list', this.element).empty();
      this._currentCharacter.allSkills().forEach(skill => {
        var li = $('<li>').data('skill', skill).toggleClass('unlocked', skill.unlocked);
        var cls = (skill instanceof skills.CommandSkill) ? 'command_skill' : 'passive_skill';
        if (skill instanceof skills.MultiplierSkill) {
          cls = 'dice_skill';
        }
        var desc = skill.desc.replace(/\[(\d+)\>(\d+)\]/g, (str, pips, mul) => {
          var dices = pips.split('').map((c) => '<span class="dice small dice' + c + '"></span>').join('');
          return '<span class="multiplier">' + dices + 'x' + mul + '</span>';
        });

        var blocking = this._currentCharacter.blockingSkill(skill);
        li.toggleClass('locked', blocking != null);

        $('<div>').addClass('skill_icon')
          .toggleClass('locked', blocking != null).addClass(cls).appendTo(li);

        var skillName = $('<div>').addClass('skill_name').text(skill.name).appendTo(li);
        if (skill.cost > 0) {
          $('<span>').addClass('cost').text('消費: ' + skill.cost).appendTo(skillName);
        }
        if (blocking) {
          $('<span>')
            .addClass('blocking')
            .text(' [' + blocking.name + 'の解放が必要]')
            .appendTo(skillName);
        }

        $('<div>').addClass('skill_desc').html(desc).appendTo(li);
        li.appendTo(list);
      });
    }

    public start() {
      this.resetToCharacter(application.unlockedCharacters()[0]);
      this.element.show();
    }

    private prevCharacter() {
      var characters = application.unlockedCharacters();
      var idx = characters.indexOf(this._currentCharacter);
      idx--;
      if (idx < 0) idx = characters.length - 1;
      this.resetToCharacter(characters[idx], true);
    }

    private nextCharacter() {
      var characters = application.unlockedCharacters();
      var idx = characters.indexOf(this._currentCharacter);
      idx++;
      if (idx > characters.length - 1) idx = 0;
      this.resetToCharacter(characters[idx]);
    }

    private skillClicked(event: JQueryMouseEventObject) {
      var li = $(event.currentTarget);
      var skill = <skills.Skill>li.data('skill');
      if (this._currentCharacter.blockingSkill(skill) || skill.unlocked) {
        return;
      }
      Dialog.confirm(skill.name + 'を解放しますか?', (ok) => {
        if (ok) {
          this._currentCharacter.unlockSkill(skill.id);
          this.updateSkillTree();
        }
      });
    }

    constructor() {
      super($('#skill_selector'));

      $('#skill_selector_close', this.element).on('click', () => {
        application.save();
        this.element.hide();
        this.dispatchEvent('skillSelectorClose');
      });

      $('.skill_list', this.element).on('click', 'li', (e) => this.skillClicked(e));

      $('.prev_character', this.element).on('click', () => this.prevCharacter());
      $('.next_character', this.element).on('click', () => this.nextCharacter());
    }
  }
}