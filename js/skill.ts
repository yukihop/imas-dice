module cgdice.skills {
  export interface SkillInfo {
    class: string;
    name: string;
    cost: number;
    pips?: number;
  }

  export class SkillEffect {
    public owner: SkillEffectClient;
    constructor(public skill: Skill, public turns: number = 1,
      public clearAfterBattle: boolean = false) {
    }

    public remove() {
      if (this.owner) {
        return this.owner.removeSkillEffect(this);
      }
      return null;
    }
  }

  export class Skill {
    public className: string;
    public name: string;
    public cost: number;

    public invoke() {
      // abstract class
      alert('This skill is not implemented!');
    }

    static create(param: SkillInfo): Skill {
      var className: string = param.class;
      if (className in cgdice.skills) {
        var result = new cgdice.skills[className](param);
        result.className = className;
        return result;
      }
      throw 'Unimplemented skill class';
    }

    public skillInvokable(): boolean {
      return (
        cgdice.game.phase == cgdice.GamePhase.InField ||
        cgdice.game.phase == cgdice.GamePhase.InBattle
        );
    }

    constructor(public param: SkillInfo) {
      this.name = param.name;
      this.cost = param.cost;
    }
  }

  export class RedrawSkill extends Skill {
    public invoke() {
      cgdice.game.stack.shuffleExistingDices();
    }
  }

  export class AdditionalOnboardSkill extends Skill {
    public skillInvokable() {
      return cgdice.game.phase == cgdice.GamePhase.InBattle;
    }

    public invoke() {
      cgdice.game.battle.addOnboardDice(1);
    }
  }

  export class AttackMultiplySkill extends Skill {
    public skillInvokable() {
      return cgdice.game.phase == cgdice.GamePhase.InBattle;
    }

    public invoke() {
    }
  }

  export class SpecifyNextDiceSkill extends Skill {
    public invoke() {
      cgdice.game.stack.specifyNext(this.param.pips);
    }
  }
}