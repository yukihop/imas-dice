/// <reference path="displayobject.ts" />
/// <reference path="title.ts" />
/// <reference path="skill_selector.ts" />
/// <reference path="dice.ts" />
/// <reference path="field.ts" />
/// <reference path="talkshow.ts" />
/// <reference path="enemy_action.ts" />
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
    characters: CharacterInfo[];
  }

  export interface CharacterInfo {
    name: string;
    image: string;
    attribute: string;
    base_hp: number;
    unlockedFromStart?: boolean;
    desc: string;
    skills: skills.SkillInfo[];
  }

  export interface StageInfo {
    title: string;
    layout: string;
    blocks: any;
    initialization?: string;
    unlocked?: boolean;
    talkOnUnlocked?: string;
    talkOnClear?: string;
    talkOnFailed?: string;
    unlockCharacterOnClear?: any;
  }

  export interface ChapterInfo {
    title: string;
    data: string;
    desc: string;
    stages?: StageInfo[];
    unlocked?: boolean;
  }

  export interface EnemyPattern {
    action: string;
    turn?: string;
    say?: string;
    notify?: string;
  }

  export interface EnemyInfo {
    name: string;
    inherits: string;
    image: string;
    HP: number;
    ATK: number;
    EXP: number;
    patterns?: EnemyPattern[];
    attribute?: string;
    startTalk?: string;
    defeatedTalk?: string;
  }

  export interface CharacterSaveData {
    exp: number;
    unlockedSkills: string[];
  }

  export interface SaveData {
    characters: { [name: string]: CharacterSaveData };
    skillBadges: number;
    lastUnlockedChapter: number;
    lastUnlockedStage: number;
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
      var data: SaveData = {
        characters: {},
        skillBadges: 0,
        lastUnlockedChapter: 0,
        lastUnlockedStage: 0
      };
      this.unlockedCharacters().forEach(c => {
        data.characters[c.name] = c.saveJSON();
      });

      var ci: number = 0, si: number = 0;
      this.settings.chapters.some((chap, ci) => {
        if (chap.unlocked && !chap.title.match(/テスト/)) {
          data.lastUnlockedChapter = ci;
          return false;
        } else {
          return true;
        }
      });
      this.settings.chapters[data.lastUnlockedChapter].stages.some((stage, si) => {
        if (stage.unlocked) {
          data.lastUnlockedStage = si;
          return false;
        } else {
          return true;
        }
      });

      localStorage.setItem('saveData1', JSON.stringify(data));
      // prompt('これを保存', JSON.stringify(data));
    }

    public load() {
      var data_string = <string>localStorage.getItem('saveData1');
      this.wipe();
      try {
        var data = <SaveData>JSON.parse(data_string);
      } catch (e) {
        alert('構文エラーです');
        return;
      }
      if ('characters' in data) {
        return;
      }

      this.allCharacters.forEach(c => {
        if (c.name in data.characters) {
          c.unlocked = true;
          c.loadJSON(data.characters[c.name]);
        } else {
          c.initializeParameters();
        }
        c.redraw();
      });

      this.resetChapterUnlockStatus(data.lastUnlockedChapter, data.lastUnlockedStage);

      this.dispatchEvent('gameLoad');
    }

    public wipe() {
      this.allCharacters.forEach(c => {
        c.initializeParameters();
        c.unlocked = false;
        c.redraw();
      });
      this.settings.characters.forEach(cdata => {
        if (cdata.unlockedFromStart) this.findCharacter(cdata.name).unlocked = true;
      });

      this.resetChapterUnlockStatus(0, 0);
      this.dispatchEvent('gameLoad');
    }

    public gameClear() {
      var dialog = $('#game_clear').dialog({
        dialogClass: 'no_caption',
        modal: true,
        width: 640,
        height: 440
      });
      dialog.on('click', () => {
        setTimeout(() => dialog.dialog('close'), 1000);
      });
    }

    public unlockNextStage() {
      var unlockedStage: StageInfo = null;
      var chapters = this.settings.chapters;
      chapters.some((chap, ci) => {
        chap.stages.some((stage, si) => {
          if (stage == this.currentStage) {
            if (si == chap.stages.length - 1) {
              // Last stage of a chapter cleared.
              if (ci == chapters.length - 1) {
                // All chapters already unlocked.
              } else {
                // Unlock next chapter and its first stage.
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
      if (unlockedStage && !unlockedStage.unlocked) {
        unlockedStage.unlocked = true;
        if ('talkOnUnlocked' in unlockedStage) {
          this._stage_selector.openingTalkID = unlockedStage.talkOnUnlocked;
        }
      }
      if (unlockedStage == null) {
        this.gameClear();
      }
    }

    public unlockCharacter(name: string) {
      this.allCharacters.forEach(c => {
        if (c.name == name) c.unlocked = true;
      });
    }

    public unlockAllSkills() {
      application.allCharacters.filter(p => p.unlocked).forEach(p => {
        p.allSkills().forEach(s => p.unlockSkill(s.id));
      });
    }

    public findCharacter(name: string): characters.Character {
      var result: characters.Character = null;
      this.allCharacters.some(c => {
        if (c.name == name) {
          result = c;
          return true;
        }
      });
      return result;
    }

    private stageDetermined(event) {
      this.currentStage = event.data.stage;
      game.reset(event.data.stage, event.data.players);
    }

    private resetChapterUnlockStatus(lastUnlockedChapter: number, lastUnlockedStage: number) {
      this.settings.chapters.forEach((chap, ci) => {
        if (ci < lastUnlockedChapter || chap.title.match(/テスト/)) {
          chap.unlocked = true;
          chap.stages.forEach(stage => stage.unlocked = true);
        } else if (ci == lastUnlockedChapter) {
          chap.unlocked = true;
          chap.stages.forEach((stage, si) => stage.unlocked = si <= lastUnlockedStage);
        } else {
          chap.unlocked = false;
          chap.stages.forEach(stage => stage.unlocked = false);
        }
      });
    }

    private preloadComplete() {
      game = new DiceGame();
      game.init();
      game.on('gameFinish', () => {
        this.save();
        this._stage_selector.reset();
      });

      this.settings = <Settings>this._loader.getResult('settings');

      this._title = new Title();
      this._title.on('titleClose', () => {
        this._title.element.hide();
        this._stage_selector.reset();
      });

      this._stage_selector = new StageSelector();
      this._stage_selector.addEventListener('stageDetermine', (event) => this.stageDetermined(event));

      this.resetChapterUnlockStatus(0, 0); // unlock only first stage

      // initialize character data from settings file
      this.settings.characters.forEach(cdata => {
        var p = new characters.Character(cdata.name);
        this.allCharacters.push(p);
        if (cdata.unlockedFromStart) {
          p.unlocked = true;
        }
        p.redraw();
      });

      // load save
      this.load();
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
