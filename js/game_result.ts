module cgdice {
  export class GameResult extends DomDisplayObject {
    public start() {
      var exp = game.gainExp;
      this.element.find('.gain_exp').text(exp);
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