/// <reference path="types/jquery/jquery.d.ts" />
/// <reference path="types/jqueryui/jqueryui.d.ts" />
/// <reference path="types/jquery.transit/jquery.transit.d.ts" />
/// <reference path="types/createjs/createjs.d.ts" />
/// <reference path="application.ts" />

/**
 * モバマス実録ダイスゲーム
 * @author ゆきほP
 */

$(window).on('load', () => {
  cgdice.application = new cgdice.Application();
  cgdice.application.run();
});