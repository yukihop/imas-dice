module cgdice {
  /**
   * Show and manages hit point of allies.
   */
  export class HPIndicator extends DomDisplayObject {
    private _maxHP: number = 100;
    private _HP: number = 100;
    private _hp_bar: JQuery;
    private _hp_healbar: JQuery;
    private _hp_damagebar: JQuery;

    get maxHP(): number { return this._maxHP; }
    set maxHP(value: number) {
      this._maxHP = value;
      this.refresh();
    }

    get HP(): number { return this._HP; }
    set HP(value: number) {
      this.setHP(value, true);
    }

    public setHP(value: number, animation: boolean = false) {
      if (value < 0) value = 0;
      if (value > this._maxHP) value = this._maxHP;

      if (!animation) {
        this._hp_bar.stop(true).css('width', this.barWidth(value));
      } else if (this._HP > value) { // damage!
        var top = this.element.position().top;
        // bounce
        this.element.addClass('damaging').animate(
          { top: top + 10 }, 400, 'easeInOutBounce', () => {
            this.element.animate(
              { top: top }, 100
              );
          }
          );
        this._hp_damagebar
          .show()
          .css('width', this.barWidth(this._HP))
          .transition({
            width: this.barWidth(value),
            duration: 1000,
            easing: 'easeOutQuad'
          }, () => {
            this._hp_damagebar.hide();
            this.element.removeClass('damaging healing');
          });
        this._hp_bar.css('width', this.barWidth(value));
      }
      if (this._HP < value) { // heal!
        this.element.addClass('healing');
        this._hp_healbar.show().css('width', this.barWidth(value));
        this._hp_bar
          .transition({
            width: this.barWidth(value),
            duration: 1000,
            easing: 'easeOutQuad'
          }, () => {
            this._hp_healbar.hide();
            this.element.removeClass('damaging healing');
          });
      }
      this._HP = value;
      var txt = this._HP + '/' + this._maxHP;
      $('.hp_value', this.element).text(txt);
    }

    private barWidth(hp: number) {
      return Math.min(1, Math.max(hp / this._maxHP, 0)) * 100 + '%';
    }

    private refresh(): void {
      var txt = this._HP + '/' + this._maxHP;
      $('.hp_value', this.element).text(txt);
      $('.hp_bar', this.element).css('width', this.barWidth(this._HP));
      this.element.removeClass('healing damaging');
    }

    constructor() {
      super($('#hp_indicator'));
      this._hp_bar = this.element.find('.hp_bar');
      this._hp_damagebar = this.element.find('.hp_damagebar');
      this._hp_healbar = this.element.find('.hp_healbar');
      this.refresh();
    }
  }

  /**
   * Encapsulates message texts such as "Game Start" etc.
   */
  export class GamePhaseMessage extends DomDisplayObject {
    constructor(type: string, duration: number = 1500, callback?: () => void) {
      super('phase_message_frame');
      this.element.children().addClass(type).show();
      this.element.appendTo('#gamemode');
      setTimeout(() => {
        this.element.transition({ opacity: 0, duration: 200 }, () => {
          this.element.remove();
        });
        callback && callback();
      }, duration);
    }
  }

  export class GameLog extends DomDisplayObject {
    public log(message: any) {
      if (typeof message == 'object') {
        message = message.toString();
      }
      var elem = $('<div>').text(message);
      this.element.append(elem);
    }

    public clear() {
      this.element.empty();
    }

    constructor() {
      super($('#gamelog'));
    }
  }

  export enum GamePhase {
    Inactive, // Game is not in progress
    InField,
    InBattle,
    InResults // showing results
  }

  /**
   * DiceGame is a general manager of one instance of dice game
   * (from start block to boss).
   */
  export class DiceGame extends DomDisplayObject {
    private _phase: GamePhase = GamePhase.Inactive;
    private _fieldData: StageInfo;
    public players: characters.Character[] = [];
    public field: fields.Field;
    public battle: battles.Battle;
    public gameResult: GameResult;
    public hp: HPIndicator;
    public stack: DiceStack;
    public console: GameLog;
    public gainExp: number = 0;
    private _ready: boolean = false;

    get ready(): boolean { return this._ready; }

    get phase(): GamePhase { return this._phase; }

    private setPhase(value: GamePhase) {
      if (this._phase != value) {
        this._phase = value;
        this.dispatchEvent('phaseChange');
      }
    }

    public setReady(isReady: boolean) {
      if (this._ready == isReady) {
        return;
      }
      this._ready = isReady;
      this.element.toggleClass('ready', isReady);
      if (isReady) this.dispatchEvent('ready');
    }

    public init(): void {
      this.hp = new HPIndicator();

      this.battle = new battles.Battle();
      this.battle.on('diceProcess', this.diceProcessed, this);
      this.battle.on('battleFinish', () => {
        this.setPhase(GamePhase.InField);
        if (this.field.position == this.field.maxPosition) {
          $('#stage_clear').show();
          this.stageCleared();
        }
      });
      this.battle.on('initialized', () => { this.setPhase(GamePhase.InBattle); });

      this.stack = new DiceStack();
      this.stack.on('diceDetermine', $.proxy(this.handleDiceEvent, this));
      this.stack.on('diceHover', $.proxy(this.handleDiceEvent, this));
      this.stack.on('diceUnhover', $.proxy(this.handleDiceEvent, this));

      this.gameResult = new GameResult();
      this.gameResult.on('gameFinish', () => {
        this.phase = GamePhase.Inactive;
        this.dispatchEvent('gameFinish');
      });

      this.field = new fields.Field();
      this.field.on('diceProcess', this.diceProcessed, this);

      this.console = new GameLog();

      this.element.find('#players')
        .on('skillTrigger', '.character', (event: JQueryEventObject, skill: skills.Skill) => {
          this.setReady(false);
          skill.owner.MP -= skill.cost;
          setTimeout(() => {
            skill.invoke(() => {
              this.setReady(true);
            });
          }, 300);
        });
    }

    public reset(fieldData: StageInfo, players: characters.Character[]) {
      this._fieldData = fieldData;
      var maxHP = 0;
      this.players = players;
      this.players.forEach(p => {
        p.element.appendTo($('#players', this.element));
        p.redraw();
        p.MP = p.maxMP();
      });

      this.players.forEach((p) => { maxHP += p.maxHP() });
      this.hp.maxHP = maxHP;
      this.hp.setHP(maxHP);

      this.gainExp = 0;

      this.field.reset(fieldData);
      this.stack.reset(10);
      this.battle.element.hide();
      $('#stage_failed, #stage_failed_dice, #stage_clear').hide();
      this.console.clear();
      this.setPhase(GamePhase.InField);

      if (this.field.blocks[0].talk) {
        Talk.show(this.field.blocks[0].talk, () => {
          new GamePhaseMessage('stage_start');
        });
      } else {
        new GamePhaseMessage('stage_start');
      }
      this.setReady(true);
    }

    private handleDiceEvent(event: DiceEvent) {
      if (this._phase == GamePhase.InBattle) {
        this.battle.dispatchEvent(event);
      } else if (this._phase == GamePhase.InField) {
        this.field.dispatchEvent(event);
      }
    }

    private talkOrCall(talk: string, call: () => void) {
      if (talk !== null && talk !== undefined) {
        Talk.show(talk, call);
      } else {
        call();
      }
    }

    private stageCleared() {
      this.setPhase(GamePhase.InResults);
      application.unlockNextStage();
      var unlockPlayer = application.currentStage.unlockPlayerOnClear;
      if (unlockPlayer) {
        if (typeof unlockPlayer == 'string') {
          unlockPlayer = [unlockPlayer];
        }
        unlockPlayer.forEach(p => application.unlockCharacter(p));
      }
      this.talkOrCall(this._fieldData.talkOnClear, () => this.gameResult.start());
    }

    private stageFailed() {
      this.setPhase(GamePhase.InResults);
      $('#stage_failed, #stage_failed_dice').filter(':visible')
        .css({ y: 0 })
        .transition({
          y: 30,
          duration: 3000,
          complete: () => this.talkOrCall(this._fieldData.talkOnFailed, () => {
            this.phase = GamePhase.Inactive;
            this.dispatchEvent('gameFinish');
          })
        });
    }

    private diceProcessed() {
      if (this.hp.HP == 0) {
        $('#stage_failed').show();
        this.stageFailed();
        return;
      }
      if (this.stack.stock > 0) {
        this.stack.stock--;
        this.stack.draw();
      }
      if (this.stack.length == 0) {
        $('#stage_failed_dice').show();
        this.stageFailed();
      } else if (this._phase != GamePhase.InResults) {
        this.setReady(true);
      }
    }

    public getDamage(power: number) {
      this.hp.HP -= power;
    }

    constructor() {
      super($('#dicegame'));
    }

  }

}