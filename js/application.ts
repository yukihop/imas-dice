/// <reference path="displayobject.ts" />
/// <reference path="title.ts" />
/// <reference path="skill_selector.ts" />
/// <reference path="dice.ts" />
/// <reference path="field.ts" />
/// <reference path="talkshow.ts" />
/// <reference path="battle.ts" />
/// <reference path="game_result.ts" />
/// <reference path="skill.ts" />
/// <reference path="character.ts" />

module cgdice {

  export var application: Application;
  export var game: DiceGame;

  export function minMax(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  export interface Settings {
    chapters: ChapterInfo[];
    enemies: { [key: string]: EnemyInfo };
    characters: any[];
  }

  export interface StageInfo {
    title: string;
    layout: string;
    blocks: any;
    unlocked?: boolean;
    talkOnUnlocked?: string;
    unlockPlayer?: any;
  }

  export interface ChapterInfo {
    title: string;
    data: string;
    desc: string;
    stages?: StageInfo[];
    unlocked?: boolean;
  }

  export interface EnemyInfo {
    name: string;
    image: string;
    HP: number;
    ATK: number;
    EXP: number;
    start_talk?: string;
    defeated_talk?: string;
  }

  /**
   * Root-level manager of this game.
   */
  export class Application extends createjs.EventDispatcher {
    public _loader = new createjs.LoadQueue();

    private _title: Title;
    private _stage_selector: StageSelector;

    public settings: Settings;

    public allCharacters: characters.Character[] = [];

    public unlockedCharacters(): characters.Character[] {
      return this.allCharacters.filter(c => c.unlocked);
    }

    public currentStage: StageInfo;

    private compatibilityCheck() {
      if (typeof console !== 'object') return false;
      return true;
    }

    public save() {
      var data: any = {
        characters: {}
      };
      this.allCharacters.forEach(c => {
        data.characters[c.name] = c.saveJSON();
      });
      prompt('これを保存', JSON.stringify(data));
    }

    public load() {
      var data_string = prompt('セーブデータ?');
      var data: any;
      try {
        data = JSON.parse(data_string);
      } catch (e) {
        alert('構文エラーです');
        return;
      }

      this.wipe();
      this.allCharacters.forEach(c => {
        if (c.name in data.characters) {
          c.loadJSON(data.characters[c.name]);
        }
        c.redraw();
      });
    }

    public wipe() {
      this.allCharacters.forEach(c => {
        c.initializeParameters();
        c.redraw();
      });
    }

    public unlockNextStage() {
      var unlockedStage: StageInfo = null;
      var chapters = this.settings.chapters;
      chapters.some((chap, ci) => {
        chap.stages.some((stage, si) => {
          if (stage == this.currentStage) {
            if (si == chap.stages.length - 1) {
              // Last stage of a chapter. Unlock next chapter.
              if (ci == chap.stages.length - 1) {
                // All stages already unlocked.
              } else {
                chapters[ci + 1].unlocked = true;
                unlockedStage = chapters[ci + 1].stages[0];
                return true;
              }
            } else {
              unlockedStage = chap.stages[si + 1];
              return true;
            }
          }
        });
        if (unlockedStage) return true;
      });
      if (unlockedStage) {
        unlockedStage.unlocked = true;
        if ('talkOnUnlocked' in unlockedStage) {
          this._stage_selector.openingTalkID = unlockedStage.talkOnUnlocked;
        }
      }
    }

    public unlockCharacter(name: string) {
      this.allCharacters.forEach(c => {
        if (c.name == name) c.unlocked = true;
      });
    }

    private stageDetermined(event) {
      this.currentStage = event.data.stage;
      game.reset(event.data.stage, event.data.players);
    }

    private preloadComplete() {
      game = new DiceGame();
      game.init();
      game.on('gameFinish', () => {
        this._title.element.show();
      });

      this.settings = <Settings>this._loader.getResult('settings');

      this._title = new Title();
      this._title.on('titleClose', () => {
        this._title.element.hide();
        this._stage_selector.reset();
      });

      this._stage_selector = new StageSelector();
      this._stage_selector.addEventListener('stageDetermine', (event) => this.stageDetermined(event));

      // prepare chapter data
      this.settings.chapters.forEach(chap => {
        // for debug use
        if (chap.title.match(/テスト/)) {
          chap.unlocked = true;
          chap.stages.forEach(stage => stage.unlocked = true);
        }
      });

      // unlock first chapter and first stage
      this.settings.chapters[0].unlocked = true;
      this.settings.chapters[0].stages[0].unlocked = true;

      // initialize character data from settings file
      this.settings.characters.forEach(cdata => {
        var p = new characters.Character(cdata.name);
        this.allCharacters.push(p);
        if (cdata.unlockedFromStart) {
          p.unlocked = true;
        }
        p.redraw();
      });
    }

    public run(): void {
      createjs.Ticker.setFPS(30);
      this._loader.on('complete', this.preloadComplete, this);
      this._loader.loadManifest([
        { id: 'settings', src: 'settings/settings.json' },
      ]);
    }
  }


}
