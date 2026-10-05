// assets-placeholders — shared placeholder helpers (required by asset-loading.js,
// gamestate-ui.js, menu-intro.js). Real art paths live in asset-loading.js.
// PLACEHOLDER_MODE=false -> use real files; renderPlaceholder() is only the
// fallback for assets that fail to load (and for HEART_IMAGES in placeholder mode).
window.__AIRBORNE_PLACEHOLDERS__ = window.__AIRBORNE_PLACEHOLDERS__ || {};
var PLACEHOLDER_MODE = false;
window.PLACEHOLDER_MODE = PLACEHOLDER_MODE;

function renderPlaceholder(key) {
  key = String(key || "asset");
  var cache = window.__AIRBORNE_PLACEHOLDERS__;
  if (cache[key]) return cache[key];
  var w = 128, h = 128;
  if (/bg|sky|Far|skyline|mountain|parallax|streetrow|map|strip|field|poster|banner/i.test(key)) { w = 256; h = 128; }
  else if (/blimp|ship|boss|rocket/i.test(key)) { w = 160; h = 96; }
  else if (/ring|coin|heart|bird|crystal|flag|sock|bomb|shield|power/i.test(key)) { w = 64; h = 64; }
  var hue = 0;
  for (var i = 0; i < key.length; i++) hue = (hue * 31 + key.charCodeAt(i)) % 360;
  var url = "";
  try {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d");
    g.fillStyle = "hsla(" + hue + ",45%,45%,0.55)";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "hsla(" + hue + ",60%,75%,0.9)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
    g.fillStyle = "#fff";
    g.font = "10px monospace";
    g.textAlign = "center";
    g.fillText(key.slice(0, 22), w / 2, h / 2);
    url = c.toDataURL("image/png");
  } catch (e) {
    // 1x1 transparent PNG
    url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  }
  cache[key] = url;
  return url;
}
window.renderPlaceholder = renderPlaceholder;
