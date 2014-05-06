module cgdice {

  export class Title extends cgdice.DomDisplayObject {
    private menuClicked() {
      this.dispatchEvent('titleClose');
    }

    constructor() {
      super($('#title'));
      this.element.on('click', '#game_start', () => this.menuClicked());
      this.element.on('click', '#save', () => application.save());
      this.element.on('click', '#load', () => application.load());
      this.element.on('click', '#wipe', () => {
        if (confirm('セーブを初期化しますか?')) {
          application.wipe();
        }
      });
    }
  }

  var previousSelected: characters.Character[] = [];

  export class StageSelector extends cgdice.DomDisplayObject {
    private _chap_index: number;
    public openingTalkID: string;
    private _select_max: number;

    public static MAX_PLAYERS = 5;

    private updateSelectedCount(): number {
      var selected_count = $('.character.selected', this.element).length;
      $('.selected_count', this.element).text(selected_count + '/' + this._select_max);
      return selected_count;
    }

    private scrollChapter(delta: number) {
      var len = $('li.chapter', this.element).length;
      this._chap_index = minMax(this._chap_index + delta, 0, len - 1);
      var w = $('#chapter_list_container', this.element).width();
      $('#chapter_list', this.element).animate({ left: - w * this._chap_index });
    }

    private stageDetermined(stage: StageInfo, players: characters.Character[]) {
      previousSelected = players.slice(0); // duplicate
      $('#character_list .selected', this.element).removeClass('selected');

      var dispatch = new createjs.Event('stageDetermine', false, false);
      dispatch.data = { stage: stage, players: players };
      this.dispatchEvent(dispatch);
      this.element.transition({
        opacity: 0,
        duration: 300,
        complete: () => { this.element.hide(); }
      });
    }

    private stageClicked(event) {
      var stage: StageInfo = $(event.target).data('stage');
      if (!stage.unlocked) {
        return;
      }
      var players: characters.Character[];
      players = $('#character_list .selected', this.element).map((i, elem) => {
        return $(elem).data('self');
      }).get();

      if (players.length < this._select_max) {
        Dialog.confirm('最大参加人数以下で進みますか?', (ok) => {
          if (ok) this.stageDetermined(stage, players);
        });
      } else {
        this.stageDetermined(stage, players);
      }
    }

    constructor() {
      super($('#stage_select'));

      this.element.on('click', 'li.stage', (event) => this.stageClicked(event));

      this.element.on('click', '.character', (event) => {
        var target = $(event.currentTarget);
        var selected_count = $('.character.selected', this.element).length;
        if (target.hasClass('selected')) {
          if (selected_count <= 1) {
            return;
          }
          target.removeClass('selected');
          selected_count--;
        } else {
          if (selected_count >= this._select_max) {
            return;
          }
          target.addClass('selected');
          selected_count++;
        }
        this.updateSelectedCount();
      });

      $('#character_list', this.element).sortable({
        distance: 10
      });

      $('#chapter_prev', this.element).on('click', () => this.scrollChapter(-1));
      $('#chapter_next', this.element).on('click', () => this.scrollChapter(1));

      $('#unlock_all_stages', this.element).on('click', () => {
        application.settings.chapters.forEach(chap => {
          chap.unlocked = true;
          chap.stages.forEach(st => st.unlocked = true);
        });
        this.reset();
      });

      $('#unlock_all_characters', this.element).on('click', () => {
        application.allCharacters.forEach(p => p.unlocked = true);
        this.reset();
      });
      $('#unlock_everything', this.element).on('click', () => {
        $('#unlock_all_characters, #unlock_all_stages').click();
      });
    }

    public reset() {
      // stages
      var chapter_list = this.element.find('#chapter_list').css('left', '0');
      chapter_list.empty();
      application.settings.chapters.forEach(chap => {
        if (!chap.unlocked) {
          return;
        }
        var chapli = $('#templates .chapter').clone().appendTo(chapter_list);
        var stage_list = chapli.find('.stage_list');
        chapli.find('.title').text(chap.title);
        chapli.find('.desc').text(chap.desc);
        chap.stages.forEach((stage, stage_idx) => {
          var stageli = $('<li>')
            .addClass('stage')
            .text((stage_idx + 1) + ': ' + stage.title)
            .data('stage', stage)
            .appendTo(stage_list);
          if (!stage.unlocked) {
            stageli.addClass('locked').text('? ? ?');
          }
        });
      });
      this._chap_index = 0;

      // characters
      var character_list = this.element.find('#character_list');
      character_list.find('.character').detach(); // do not empty

      var unlock_count = 0;
      application.allCharacters.forEach((p, i) => {
        if (!p.unlocked) {
          return;
        }
        unlock_count++;
        p.resetHighlight();
        p.updateSkillInvokableStatus();
        if (previousSelected.length == 0) {
          p.element.toggleClass('selected', i < StageSelector.MAX_PLAYERS);
        } else {
          p.element.toggleClass('selected', previousSelected.indexOf(p) >= 0);
        }
        $('<li>').append(p.element).appendTo(character_list);
      });
      this._select_max = Math.min(unlock_count, StageSelector.MAX_PLAYERS);
      this.updateSelectedCount();

      this.element.show().css({ opacity: 1 });

      if (this.openingTalkID) {
        Talk.show(this.openingTalkID);
        this.openingTalkID = null;
      }
    }
  }

}