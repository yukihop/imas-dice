module cgdice {
  export class SkillSelector extends DomDisplayObject {

    private resetToCharacter(character: characters.Character) {
      var src = 'images/characters/' + character.image.replace('.png', '_large.png');
      $('#skill_selector_bg', this.element).attr('src', src);
      var list = $('.skill_list', this.element).empty();
      character.allSkills().forEach(skill => {
        var li = $('<li>').data('skill', skill).toggleClass('unlocked', skill.unlocked);
        var cls = (skill instanceof skills.CommandSkill) ? 'command_skill' : 'passive_skill';
        if (skill instanceof skills.MultiplierSkill) {
          cls = 'dice_skill';
        }
        var desc = skill.desc.replace(/\[(\d+)\>(\d+)\]/g, (str, pips, mul) => {
          var dices = pips.split('').map((c) => '<span class="dice small dice' + c + '"></span>').join('');
          return '<span class="multiplier">' + dices + 'x' + mul + '</span>';
        });
        $('<div>').addClass('skill_icon').addClass(cls).appendTo(li);
        $('<div>').addClass('skill_name').text(skill.name).appendTo(li);
        $('<div>').addClass('skill_desc').html(desc).appendTo(li);
        li.appendTo(list);
      });
    }

    public start() {
      this.resetToCharacter(application.unlockedCharacters()[0]);
      this.element.show();
    }

    private skillClicked(event: JQueryMouseEventObject) {
      var li = $(event.currentTarget);
      var skill = <skills.Skill>li.data('skill');
      Dialog.confirm(skill.name + 'を解放しますか?', (ok) => {
        if (ok) {
          skill.unlocked = true;
          li.addClass('unlocked');
        }
      });
    }

    constructor() {
      super($('#skill_selector'));

      $('#skill_selector_close', this.element).on('click', () => {
        this.element.hide();
        this.dispatchEvent('skillSelectorClose');
      });

      $('.skill_list', this.element).on('click', 'li', (e) => this.skillClicked(e));
    }
  }
}