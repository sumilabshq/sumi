window.DCLogic = class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = {};
  }
  setState(patch) {
    this.state = Object.assign(
      {},
      this.state,
      typeof patch === "function" ? patch(this.state) : patch,
    );
    if (this.__render) {
      this.__render();
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const host = document.querySelector("x-dc");
  const helmet = host.querySelector("helmet");
  if (helmet) {
    Array.from(helmet.children).forEach((node) =>
      document.head.appendChild(node.cloneNode(true)),
    );
    helmet.remove();
  }
  const scriptNode = document.querySelector("script[data-dc-script]");
  const defaults = JSON.parse(scriptNode.getAttribute("data-props") || "{}");
  const props = {};
  Object.keys(defaults).forEach((key) => {
    if (key.charAt(0) !== "$" && defaults[key] && "default" in defaults[key]) {
      props[key] = defaults[key].default;
    }
  });
  const Component = new Function(
    "DCLogic",
    scriptNode.textContent + "\nreturn Component;",
  )(window.DCLogic);
  const instance = new Component(props);
  const template = host.innerHTML;
  const hashState = location.hash.replace("#", "");
  if (hashState && instance.applyHash) {
    instance.applyHash(hashState);
  }
  const escapeAttr = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  instance.__render = () => {
    const vals = instance.renderVals();
    let html = template.replace(
      /\s(on[A-Z][A-Za-z]*)="\{\{(\w+)\}\}"/g,
      ' data-dcon-$1="$2"',
    );
    html = html.replace(/\{\{(\w+)\}\}/g, (match, name) =>
      name in vals ? escapeAttr(vals[name]) : "",
    );
    host.innerHTML = html;
    host.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.indexOf("data-dcon-") === 0) {
          const type = attribute.name
            .slice(10)
            .replace(/^on/, "")
            .toLowerCase();
          element.addEventListener(type, (event) =>
            vals[attribute.value](event),
          );
        }
      });
    });
  };
  instance.__render();
});
