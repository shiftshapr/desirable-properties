/**
 * Desirable Properties – shared loading spinner.
 * Matches the Metaweb loading API for cross-familiar use.
 */
(function (global) {
  var INNER = '<div class="loading-spinner" aria-hidden="true"></div>';

  var SPINNER =
    '<div class="dp-loading" role="status" aria-label="Loading">' +
    INNER +
    '</div>';

  function html(extraClass) {
    if (!extraClass) return SPINNER;
    return (
      '<div class="dp-loading ' +
      extraClass +
      '" role="status" aria-label="Loading">' +
      INNER +
      '</div>'
    );
  }

  function set(el, extraClass) {
    if (!el) return;
    el.innerHTML = html(extraClass);
  }

  global.DPLoading = {
    html: html,
    set: set,
    SPINNER: SPINNER,
    INNER: INNER,
  };
})(typeof window !== 'undefined' ? window : globalThis);