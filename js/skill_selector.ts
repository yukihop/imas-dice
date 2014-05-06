module cgdice {
  export class SkillSelector extends DomDisplayObject {

    private resetToCharacter(character: characters.Character) {
      var src = 'images/characters/' + character.image.replace('.png', '_large.png');
      $('#skill_selector_bg', this.element).attr('src', src);
    }

    public start() {
      this.resetToCharacter(application.unlockedCharacters()[0]);
      this.element.show();
    }

    constructor() {
      super($('#skill_selector'));

      $('#skill_selector_close', this.element).on('click', () => {
        this.element.hide();
        this.dispatchEvent('skillSelectorClose');
      });
    }
  }
}