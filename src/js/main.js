// Boot. Keeps progress across live page updates through the viewer's hot-reload hook when present.
(function (root) {
  'use strict';
  const hot = root.claude && root.claude.hot;
  const start = data => {
    root.CP.UI.init(data || {});
    if (hot && hot.snapshot) hot.snapshot(() => root.CP.UI.snapshot());
  };
  if (hot && hot.ready) hot.ready(start);
  else start(hot && hot.data ? hot.data : {});
})(this);
