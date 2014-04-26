module cgdice {
  /**
   * Wraps HTML element as jQuery object
   */
  export class DomDisplayObject extends createjs.EventDispatcher {
    public element: JQuery;

    constructor(template: string);
    constructor(element: JQuery);
    constructor(element: any) {
      super();
      if (typeof element == 'string') {
        this.element = $('.' + element, $('#templates')).clone();
      } else {
        this.element = element;
      }
    }
  }

  export class SkillEffectClient extends DomDisplayObject {
    public skillEffects: skills.SkillEffect[] = [];

    public skillEffectChanged() {
      // abstract
    }

    public registerSkillEffect(effect: skills.SkillEffect) {
      effect.owner = this;
      this.skillEffects.push(effect);
      this.skillEffectChanged();
    }

    public hasSkillEffect(className: string) {
      return this.skillEffects.some(eff => eff.skill.className == className);
    }

    public removeSkillEffect(effect: cgdice.skills.SkillEffect): skills.SkillEffect {
      var idx = this.skillEffects.indexOf(effect);
      if (idx != -1) {
        this.skillEffects.splice(idx, 1);
        this.skillEffectChanged();
        return effect;
      }
      return null;
    }
  }
}