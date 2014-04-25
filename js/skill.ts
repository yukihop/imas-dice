module cgdice.skills {
  export interface SkillInfo {
    class: string;
    name: string;
    cost: number;
  }

  export class AbstractSkill {
    public name: string;
    public cost: number;

    public invoke() {
      // abstract class
      alert('This skill is not implemented!');
    }

    static create(param: SkillInfo): AbstractSkill {
      var className: string = param.class;
      if (className in cgdice.skills) {
        return new cgdice.skills[className](param);
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

  export class RedrawSkill extends AbstractSkill {
    public invoke() {
      cgdice.game.stack.reset(3);
    }
  }

  export class AdditionalOnboardSkill extends AbstractSkill {
    public skillInvokable() {
      return cgdice.game.phase == cgdice.GamePhase.InBattle;
    }

    public invoke() {
      cgdice.game.battle.addOnboardDice(1);
    }
  }
}