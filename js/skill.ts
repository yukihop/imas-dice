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
    public owner: characters.Character;
    public param: any;

    public invoke(callback: () => void) {
      // abstract class
      alert('This skill is not implemented!');
    }

    static create(param: SkillInfo, owner: characters.Character): Skill {
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
        game.phase == GamePhase.InField ||
        game.phase == GamePhase.InBattle
        );
    }

    constructor(param: SkillInfo, owner: characters.Character) {
      this.owner = owner;
      this.name = param.name;
      this.cost = param.cost;
      this.desc = param.desc;
      this.param = param;
    }
  }

  export class RedrawSkill extends Skill {
    public invoke(callback: () => void) {
      game.stack.shuffleExistingDices();
      game.battle.diceChanged();
      callback();
    }
  }

  export class AdditionalOnboardSkill extends Skill {
    public skillInvokable() {
      return game.phase == GamePhase.InBattle;
    }

    public invoke(callback: () => void) {
      game.battle.addOnboardDice(1);
      game.battle.diceChanged();
      callback();
    }
  }

  export class AttackMultiplySkill extends Skill {
    public skillInvokable() {
      return game.phase == GamePhase.InBattle;
    }

    public invoke(callback: () => void) {
      var status = new Status(cgdice.StatusType.AttackMultiply, 1, true, { scale: this.param.scale });
      this.owner.registerStatus(status);
      if (this.param.stun) {
        var stun = new Status(
          StatusType.Countdown,
          1,
          true,
          { next: new Status(StatusType.Stun, 1, true) });
        this.owner.registerStatus(stun);
      }
      callback();
    }
  }

  export class SpecifyNextDiceSkill extends Skill {
    public invoke(callback: () => void) {
      game.stack.specifyNext(this.param.pips);
      callback();
    }
  }

  export class HealSkill extends Skill {
    public skillInvokable() {
      // not invokable when full recovered
      if (game.hp.HP == game.hp.maxHP && this.param.ratio > 0) {
        return false;
      }
      return true;
    }

    public invoke(callback: () => void) {
      var value = Math.floor(this.param.ratio * game.hp.maxHP);
      game.getDamage(-value);
      setTimeout(callback, 1000);
    }
  }

  export class ProceedSkill extends Skill {
    public skillInvokable() {
      if (game.phase != GamePhase.InField) {
        return false;
      }
      if (this.param.proceed < 0 && game.field.position == 0) {
        return false;
      }
      return true;
    }

    public invoke(callback: () => void) {
      game.field.proceed(this.param.proceed, false, () => {
        callback();
      });
    }
  }

  export class FreeTradeSkill extends Skill {
    private selectedOnboard: Dice;
    private selectedStack: Dice;
    private _callback: () => void;

    public skillInvokable() {
      return game.phase == GamePhase.InBattle;
    }

    private bothDetermined() {
      game.stack.element.off('.freetrade');
      game.battle.element.find('#onboard').off('.freetrade');

      this.selectedOnboard.element.css('outline', 'none');
      this.selectedStack.element.css('outline', 'none');

      var stack_pips = this.selectedStack.pips;
      var onboard_pips = this.selectedOnboard.pips;
      this.selectedStack.roll();
      this.selectedStack.pips = onboard_pips;
      this.selectedOnboard.roll();
      this.selectedOnboard.pips = stack_pips;
      game.battle.diceChanged();
      this._callback();
    }

    private onboardDiceClick(event) {
      this.selectedOnboard = <Dice>$(event.target).data('self');
      game.battle.element.find('#onboard .dice').css('outline', 'none');
      this.selectedOnboard.element.css('outline', '2px solid red');
      if (this.selectedOnboard && this.selectedStack) this.bothDetermined();
    }

    private stackDiceClick(event) {
      this.selectedStack = <Dice>$(event.target).data('self');
      game.stack.element.find('.dice').css('outline', 'none');
      this.selectedStack.element.css('outline', '2px solid red');
      if (this.selectedOnboard && this.selectedStack) this.bothDetermined();
    }

    public invoke(callback: () => void) {
      this._callback = callback;
      game.stack.element
        .on('click.freetrade', '.dice', $.proxy(this.stackDiceClick, this));
      game.battle.element.find('#onboard')
        .on('click.freetrade', '.dice', $.proxy(this.onboardDiceClick, this));
    }
  }
}