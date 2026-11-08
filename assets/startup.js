/* Small, independent startup guard. Never removes personal storage. */
(function () {
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: function (index) { var n = Math.trunc(Number(index) || 0); return this[n < 0 ? this.length + n : n]; } });
  if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, 'flatMap', { configurable: true, writable: true, value: function (fn, context) { return this.reduce(function (result, item, index, array) { return result.concat(fn.call(context, item, index, array)); }, []); } });
  if (!Object.hasOwn) Object.hasOwn = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  function showRecovery() { if (!window.PANDA_READY) { var box = document.getElementById('startupRecovery'); if (box) box.hidden = false; } }
  window.addEventListener('error', showRecovery, true);
  setTimeout(showRecovery, 5000);
  var button = document.getElementById('startupRetry');
  if (button) button.onclick = function () {
    button.disabled = true; button.textContent = 'Načítání…';
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(function (r) { if (r) return r.update(); }).catch(function () {});
    var url = new URL(location.href); url.searchParams.set('refresh', Date.now().toString()); location.replace(url.href);
  };
}());
