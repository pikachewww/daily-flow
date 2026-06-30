(function () {
  class CompletionFeedback {
    constructor(root, options = {}) {
      this.root = root;
      this.message = options.message || "已完成";
      this.icon = options.icon || "";
      this.timer = null;
      this.root.innerHTML = this.render();
    }

    render() {
      const iconMarkup = this.icon
        ? `<img class="completion-icon-image" src="${this.icon}" alt="" />`
        : `<span class="completion-check" aria-hidden="true"><span class="check-stem"></span><span class="check-tail"></span></span>`;

      return `
        <div class="completion-mask" aria-hidden="true">
          <div class="completion-card">
            <div class="completion-orb">${iconMarkup}</div>
            <div class="completion-text">${this.message}</div>
          </div>
        </div>
      `;
    }

    play(options = {}) {
      this.message = options.message || this.message;
      this.icon = options.icon ?? this.icon;
      this.root.innerHTML = this.render();
      this.root.classList.remove("is-active");
      window.clearTimeout(this.timer);

      window.requestAnimationFrame(() => {
        this.root.classList.add("is-active");
      });

      this.timer = window.setTimeout(() => {
        this.root.classList.remove("is-active");
      }, 980);
    }
  }

  window.CompletionFeedback = CompletionFeedback;
})();
