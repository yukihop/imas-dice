module cgdice {
  class CharacterGrow extends DomDisplayObject {
    public gainExp(exp: number) {
      var p = this.player;
      var old_level = this.player.level();
      var old_hp = this.player.maxHP();
      this.player.gainExp(exp);
      var e = this.element;
      $('.name', e)
        .text(p.name)
        .css('background-image', 'url(images/' + p.image + ')');
      $('.old_level', e).text(old_level.toString());
      $('.new_level', e).text(p.level().toString());
      $('.old_hp', e).text(old_hp.toString());
      $('.new_hp', e).text(p.maxHP().toString());
    }

    constructor(public player: characters.Character) {
      super('character_grow');
    }
  }

  export class GameResult extends DomDisplayObject {
    public start() {
      var exp = game.gainExp;
      this.element.find('.gain_exp').text(exp);

      var list = this.element.find('#growth');
      list.empty();
      game.players.forEach(p => {
        var cg = new CharacterGrow(p);
        cg.gainExp(exp);
        cg.element.appendTo(list);
      });

      this.element.show();
    }

    constructor() {
      super($('#game_result'));
      this.element.find('#result_ok').on('click', () => {
        this.element.hide();
        this.dispatchEvent('gameFinish');
      });
    }
  }
}