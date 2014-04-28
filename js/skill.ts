module cgdice.skills {
  export interface SkillInfo {
    class: string;
    name: string;
    cost: number;
    desc: string;
    pips?: number;
    ratio?: number;
    proceed?: number;
  }

  export class Skill {
    public className: string;
    public name: string;
    public cost: number;
    public desc: string;
    public owner: cgdice.characters.Character;
    public param: any;

    public invoke(callback: () => void) {
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

    constructor(param: SkillInfo, owner: cgdice.characters.Character) {
      this.owner = owner;
      this.name = param.name;
      this.cost = param.cost;
      this.desc = param.desc;
      this.param = param;
    }
  }

  export class RedrawSkill extends Skill {
    public invoke(callback: () => void) {
      cgdice.game.stack.shuffleExistingDices();
      callback();
    }
  }

  export class AdditionalOnboardSkill extends Skill {
    public skillInvokable() {
      return cgdice.game.phase == cgdice.GamePhase.InBattle;
    }

    public invoke(callback: () => void) {
      cgdice.game.battle.addOnboardDice(1);
      callback();
    }
  }

  export class AttackMultiplySkill extends Skill {
    public skillInvokable() {
      return cgdice.game.phase == cgdice.GamePhase.InBattle;
    }

    public invoke(callback: () => void) {
      var status = new cgdice.Status(cgdice.StatusType.AttackMultiply, 1, true, { scale: this.param.scale });
      this.owner.registerStatus(status);
      if (this.param.stun) {
        var stun = new cgdice.Status(
          cgdice.StatusType.Countdown,
          1,
          true,
          { next: new cgdice.Status(cgdice.StatusType.Stun, 1, true) });
        this.owner.registerStatus(stun);
      }
      callback();
    }
  }

  export class SpecifyNextDiceSkill extends Skill {
    public invoke(callback: () => void) {
      cgdice.game.stack.specifyNext(this.param.pips);
      callback();
    }
  }

  export class HealSkill extends Skill {
    public skillInvokable() {
      // not invokable when full recovered
      if (cgdice.game.hp.HP == cgdice.game.hp.maxHP && this.param.ratio > 0) {
        return false;
      }
      return true;
    }

    public invoke(callback: () => void) {
      var value = this.param.ratio * cgdice.game.hp.maxHP;
      cgdice.game.getDamage(-value);
      setTimeout(callback, 1000);
    }
  }

  export class ProceedSkill extends Skill {
    public skillInvokable() {
      if (cgdice.game.phase != cgdice.GamePhase.InField) {
        return false;
      }
      if (this.param.proceed < 0 && cgdice.game.field.position == 0) {
        return false;
      }
      return true;
    }

    public invoke(callback: () => void) {
      cgdice.game.field.proceed(this.param.proceed, false, () => {
        callback();
      });
    }
  }
}