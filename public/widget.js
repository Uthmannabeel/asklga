/* AskLGA embeddable ask box. Usage:
   <script src="https://YOUR-HOST/widget.js" data-lga="obio-akpor" async></script>
   The iframe is inserted where the script tag sits. A plain link is shown first and
   removed once the frame reports that it has loaded, so a blocked frame still leaves a way in. */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var lga = script.getAttribute("data-lga");
  if (!lga) return;
  var src = new URL(script.src, document.baseURI);
  var base = src.href.replace(/\/widget\.js.*$/, "");
  var origin = src.origin;
  var pageUrl = base + "/" + encodeURIComponent(lga);

  var link = document.createElement("a");
  link.href = pageUrl;
  link.textContent = "Ask your local government";
  link.style.display = "inline-block";
  link.style.margin = "0 0 8px";
  script.parentNode.insertBefore(link, script.nextSibling);

  var frame = document.createElement("iframe");
  frame.src = pageUrl + "/embed";
  frame.title = "Ask your local government";
  frame.style.width = "100%";
  frame.style.border = "1px solid #d6dbd4";
  frame.style.borderRadius = "2px";
  frame.style.minHeight = "260px";
  frame.setAttribute("loading", "lazy");
  frame.setAttribute("allow", "microphone");
  link.parentNode.insertBefore(frame, link.nextSibling);

  window.addEventListener("message", function (ev) {
    if (ev.origin !== origin || ev.source !== frame.contentWindow) return;
    var h = ev.data && ev.data.asklgaHeight;
    if (typeof h === "number" && h > 0 && h < 20000) {
      frame.style.height = Math.ceil(h) + "px";
      if (link.parentNode) link.parentNode.removeChild(link);
    }
  });
})();
