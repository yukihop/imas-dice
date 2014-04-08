/// <reference path="types/jquery/jquery.d.ts" />
/// <reference path="types/jqueryui/jqueryui.d.ts" />
/// <reference path="game.ts" />

/**
 * モバマス実録ダイスゲーム
 * @author ゆきほP
 */


$(() => {
  CGDice.application = new CGDice.Application();
  CGDice.application.run();
});