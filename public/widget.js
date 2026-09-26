/* AskLGA embeddable ask box. Usage:
   <script src="https://YOUR-HOST/widget.js" data-lga="obio-akpor" async></script>
   The iframe is inserted where the script tag sits. */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var lga = script.getAttribute("data-lga");
  if (!lga) return;
  var base = script.src.replace(/\/widget\.js.*$/, "");
  var frame = document.createElement("iframe");
  frame.src = base + "/" + encodeURIComponent(lga) + "/embed";
  frame.title = "Ask your local government";
  frame.style.width = "100%";
  frame.style.border = "1px solid #d6dbd4";
  frame.style.borderRadius = "2px";
  frame.style.minHeight = "260px";
  frame.setAttribute("loading", "lazy");
  frame.setAttribute("allow", "microphone");
  script.parentNode.insertBefore(frame, script.nextSibling);
  window.addEventListener("message", function (ev) {
    if (ev.origin !== base) return;
    if (ev.data && ev.data.asklgaHeight) frame.style.height = ev.data.asklgaHeight + "px";
  });
})();
