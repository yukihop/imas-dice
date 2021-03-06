module cgdice.skills {
  export interface SkillInfo {
    class: string;
    name: string;
    id: string;
    requires: string;
    cost: number;
    desc: string;

    pips?: number;
    ratio?: number;
    scale?: number;
    proceed?: number;
    count?: number;
    removeType?: string;
    stun?: number;
    multipliers?: string[];
    attribute?: string;
    turns?: number;
    target?: string;
    costHPRatio: number;
    extendDices: number;
  }

  export class Skill {
    public className: string;
    public unlocked: boolean = false;
    public id: string;
    public name: string;
    public requires: string;
    public desc: string;
    public owner: characters.Character;
    public cost: number;
    public param: SkillInfo;

    static create(param: SkillInfo, owner: characters.Character): Skill {
      var className: string = param.class;
      if (className in cgdice.skills) {
        var result = new cgdice.skills[className](param, owner);
        result.className = className;
        return result;
      }
      throw 'Unimplemented skill class';
    }

    constructor(param: SkillInfo, owner: characters.Character) {
      this.owner = owner;
      this.name = param.name;
      this.id = param.id;
      this.cost = param.cost;
      this.desc = param.desc;
      this.requires = param.requires;
      this.param = param;
    }
  }

  export class CommandSkill extends Skill {
    public skillInvokable(): boolean {
      return (
        game.phase == GamePhase.InField ||
        game.phase == GamePhase.InBattle
        );
    }

    public invoke(callback: () => void) {
      // abstract class
      alert('This skill is not implemented!');
      callback();
    }
  }

  export class PassiveSkill extends Skill {
  }

  export class MultiplierSkill extends PassiveSkill {
  }

  export class WeakAttributeSkill extends PassiveSkill {
  }

  export class BringMoreDicesSkill extends PassiveSkill {
  }

  export class RedrawSkill extends CommandSkill {
    public invoke(callback: () => void) {
      game.stack.shuffleExistingDices();
      game.battle.diceChanged();
      callback();
    }
  }

  export class AdditionalOnboardSkill extends CommandSkill {
    public skillInvokable() {
      return game.phase == GamePhase.InBattle && game.battle.onboard.length <= 2;
    }

    public invoke(callback: () => void) {
      game.battle.addOnboardDice(1);
      game.battle.diceChanged();
      callback();
    }
  }

  export class AttackMultiplySkill extends CommandSkill {
    public skillInvokable() {
      return game.phase == GamePhase.InBattle;
    }

    public invoke(callback: () => void) {
      var status = new Status(
        cgdice.StatusType.AttackMultiply,
        this.param.turns > 0 ? this.param.turns : 1,
        true,
        { scale: this.param.scale });

      var target = this.owner;
      if (typeof this.param.target == 'string') {
        if (this.param.target == 'random') {
          target = game.players[Math.floor(Math.random() * game.players.length)];
        } else {
          game.players.some(p => {
            if (p.name == this.param.target) {
              target = p;
              return true;
            }
          });
        }
      }

      target.registerStatus(status);
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

  export class DamageMultiplySkill extends CommandSkill {
    public skillInvokable() {
      return (game.phase == GamePhase.InBattle && !game.battle.hasStatus(StatusType.DamageMultiply));
    }

    public invoke(callback: () => void) {
      var status = new Status(
        cgdice.StatusType.DamageMultiply,
        this.param.turns,
        true,
        { scale: this.param.scale });
      game.battle.registerStatus(status);
      callback();
    }
  }

  export class SpecifyNextDiceSkill extends CommandSkill {
    public invoke(callback: () => void) {
      game.stack.specifyNext(this.param.pips);
      callback();
    }
  }

  export class HealSkill extends CommandSkill {
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

  export class ProceedSkill extends CommandSkill {
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

  export class FreeTradeSkill extends CommandSkill {
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
      this.selectedOnboard = null;
      this.selectedStack = null;
      game.stack.element
        .on('click.freetrade', '.dice', $.proxy(this.stackDiceClick, this));
      game.battle.element.find('#onboard')
        .on('click.freetrade', '.dice', $.proxy(this.onboardDiceClick, this));
    }
  }

  export class RemoveStatusFromPlayersSkill extends CommandSkill {
    public skillInvokable() {
      var remove_type: StatusType = StatusType[<string>this.param.removeType];
      return game.players.some(player => player.hasStatus(remove_type));
    }

    public invoke(callback: () => void) {
      var remove_type: StatusType = StatusType[<string>this.param.removeType];
      game.players.forEach(player => {
        player.removeStatusType(remove_type);
      });
      callback();
    }
  }

  export class ForceDrawDiceSkill extends CommandSkill {
    public skillInvokable() {
      var result = super.skillInvokable();
      return result && game.stack.stock > 0 && game.stack.length < 5;
    }

    public invoke(callback: () => void) {
      game.stack.draw();
      callback();
    }
  }

  export class ReduceHpAndExtendDiceSkill extends CommandSkill {
    private costHP() {
      return Math.floor(game.hp.maxHP * this.param.costHPRatio / 100);
    }

    public skillInvokable(): boolean {
      return game.hp.HP > this.costHP();
    }

    public invoke(callback: () => void) {
      game.stack.stock += this.param.extendDices;
      game.hp.HP -= this.costHP();
      callback();
    }
  }
}