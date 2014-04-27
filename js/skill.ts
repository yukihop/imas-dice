module cgdice.skills {
  export interface SkillInfo {
    class: string;
    name: string;
    cost: number;
    pips?: number;
  }

  export class Skill {
    public className: string;
    public name: string;
    public cost: number;
    public owner: cgdice.characters.Character;

    public invoke() {
      // abstract class
      alert('This skill is not implemented!');
    }

    static create(param: SkillInfo, owner: cgdice.characters.Character): Skill {
      var className: string = param.class;
      if (className in cgdice.skills) {
        var result = new cgdice.skills[className](param, owner);
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

    constructor(public param: SkillInfo, owner: cgdice.characters.Character) {
      this.owner = owner;
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
      var skill = new cgdice.Status(cgdice.StatusType.AttackMultiply, { scale: 2 });
      skill.remainingTurns = 1;
      this.owner.registerStatus(skill);
    }
  }

  export class SpecifyNextDiceSkill extends Skill {
    public invoke() {
      cgdice.game.stack.specifyNext(this.param.pips);
    }
  }
}