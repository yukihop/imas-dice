/// <reference path="jquery.d.ts" />

class DiceGame {
  private compatibilityCheck() {
    if (typeof console !== 'object') return false;
    return true;
  }

  public init() {
    if (!this.compatibilityCheck()) {
      alert('このブラウザは使えません');
    }
    alert('HELLO!!');
  }
}

$(function() {
  var game = new DiceGame();
  game.init();
});