(function () {
  const STYLES = `
    :host {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --bg-white: rgba(255, 255, 255, 0.9);
      --glass-border: rgba(255, 255, 255, 0.2);
      --shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 8px 15px -6px rgba(0, 0, 0, 0.05);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      display: block;
    }

    .widget-card {
      background: var(--bg-white);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: var(--shadow);
      width: 100%;
      max-width: 450px;
      overflow: hidden;
      margin: 0 auto;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .container { padding: 32px; }

    .header { margin-bottom: 24px; text-align: center; }
    .title { font-size: 22px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 14px; color: #6b7280; margin-top: 8px; }

    .service-list, .slots-grid { 
      display: flex; flex-direction: column; gap: 12px; 
      max-height: 350px; overflow-y: auto; padding-right: 4px;
    }

    .list-item {
      padding: 16px; border: 1px solid #f3f4f6; border-radius: 14px;
      background: white; cursor: pointer; transition: all 0.2s;
      text-align: left; display: flex; justify-content: space-between; align-items: center;
    }
    .list-item:hover { border-color: var(--primary); background: #f5f3ff; transform: translateY(-2px); }
    .list-item .name { font-weight: 600; color: #1f2937; }
    .list-item .meta { font-size: 12px; color: #9ca3af; }

    .slots-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 10px; }
    .slot-btn {
      padding: 12px 8px; border: 1px solid #f3f4f6; border-radius: 12px;
      font-size: 13px; font-weight: 700; text-align: center; cursor: pointer;
      background: white; transition: all 0.2s;
    }
    .slot-btn:hover { border-color: var(--primary); color: var(--primary); }
    .slot-btn.selected { background: var(--primary); color: white; border-color: var(--primary); }

    .btn-primary {
      width: 100%; background: var(--primary); color: white; border: none;
      padding: 16px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
      margin-top: 24px; transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .form-group { margin-bottom: 16px; text-align: left; }
    .form-group label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 6px; }
    .form-group input { 
      width: 100%; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; 
      font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;
    }
    .form-group input:focus { border-color: var(--primary); }

    .success-state { text-align: center; padding: 48px 24px; }
    .success-icon { 
      width: 64px; height: 64px; background: #ecfdf5; color: #10b981; 
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 32px;
    }

    .loader-bar { 
      height: 3px; width: 100%; background: #f3f4f6; position: absolute; top: 0; left: 0; overflow: hidden;
    }
    .loader-bar::after {
      content: ""; position: absolute; left: -50%; height: 100%; width: 50%;
      background: var(--primary); animation: loading 1.5s infinite ease-in-out;
    }
    @keyframes loading {
      0% { left: -50%; }
      100% { left: 100%; }
    }

    /* Popup Mode */
    .popup-trigger {
      position: fixed; bottom: 24px; right: 24px;
      padding: 14px 24px; background: var(--primary); color: white;
      border-radius: 50px; font-weight: 700; cursor: pointer;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
      z-index: 10000; display: flex; align-items: center; gap: 8px;
    }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px); z-index: 10001;
      display: flex; align-items: center; justify-content: center;
      padding: 24px; opacity: 0; pointer-events: none; transition: opacity 0.3s;
    }
    .modal-overlay.open { opacity: 1; pointer-events: auto; }
  `;

  class SlotcoreBooking extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.state = {
        step: "loading", // services, availability, customer, success, error
        services: [],
        slots: [],
        selectedService: null,
        selectedDate: new Date().toISOString().split("T")[0],
        selectedSlot: null,
        loading: false,
        isOpen: false,
      };
    }

    static get observedAttributes() {
      return ["org-id", "service-id", "base-url", "mode"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "org-id") this.orgId = newValue;
      if (name === "service-id") this.serviceId = newValue;
      if (name === "base-url") this.baseUrl = newValue;
      if (name === "mode") this.mode = newValue;

      if (this.orgId && this.orgId !== "null") {
        this.init();
      }
    }

    connectedCallback() {
      this.orgId = this.getAttribute("org-id");
      this.serviceId = this.getAttribute("service-id");
      this.baseUrl = "https://slotcore-production.up.railway.app";      
      this.mode = this.getAttribute("mode") || "inline";

      this.init();
    }

    async init() {
      this.render();
      if (this.serviceId) {
        await this.fetchServiceDetails(this.serviceId);
      } else {
        await this.fetchServices();
      }
    }

    async fetchServices() {
      if (!this.orgId || this.orgId === "null") {
        this.setState({
          step: "loading",
          message: "Waiting for organization context...",
        });
        return;
      }
      this.setState({ loading: true });
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/services`, {
          headers: { "X-Organization-Id": this.orgId }, // V1 needs org context if no API key
        });
        const data = await res.json();
        this.setState({
          services: data.data || [],
          step: "services",
          loading: false,
        });
      } catch (err) {
        this.setState({ step: "error", loading: false });
      }
    }

    async fetchServiceDetails(id) {
      this.setState({ loading: true });
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/services/${id}`, {
          headers: { "X-Organization-Id": this.orgId },
        });
        const data = await res.json();
        this.setState({ selectedService: data.data, loading: false });
        await this.fetchAvailability();
      } catch (err) {
        this.setState({ step: "error", loading: false });
      }
    }

    async fetchAvailability() {
      if (!this.state.selectedService) return;
      this.setState({ loading: true });
      try {
        const url = `${this.baseUrl}/api/v1/availability?service_id=${this.state.selectedService.id}&date=${this.state.selectedDate}&org_id=${this.orgId}`;
        const res = await fetch(url);
        const data = await res.json();
        this.setState({
          slots: data.data || [],
          step: "availability",
          loading: false,
        });
      } catch (err) {
        this.setState({ step: "error", loading: false });
      }
    }

    async handleBooking(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const customer = {
        name: formData.get("name"),
        email: formData.get("email"),
        mobile: formData.get("mobile"),
      };

      this.setState({ loading: true });
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": this.orgId,
          },
          body: JSON.stringify({
            service_id: this.state.selectedService.id,
            start_time: this.state.selectedSlot,
            customer: customer,
          }),
        });
        if (res.ok) {
          this.setState({ step: "success", loading: false });
        } else {
          throw new Error("Booking failed");
        }
      } catch (err) {
        alert("Booking failed. Please try again.");
        this.setState({ loading: false });
      }
    }

    setState(newState) {
      this.state = { ...this.state, ...newState };
      this.render();
    }

    togglePopup() {
      this.setState({ isOpen: !this.state.isOpen });
    }

    render() {
      const {
        step,
        services,
        slots,
        selectedService,
        selectedDate,
        selectedSlot,
        loading,
        isOpen,
      } = this.state;

      const cardHtml = `
        <div class="widget-card">
          ${loading ? '<div class="loader-bar"></div>' : ""}
          <div class="container">
            ${this.renderStep(step)}
          </div>
        </div>
      `;

      if (this.mode === "popup") {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="popup-trigger" id="trigger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Book Now
          </div>
          <div class="modal-overlay ${isOpen ? "open" : ""}" id="overlay">
            ${cardHtml}
          </div>
        `;
      } else {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          ${cardHtml}
        `;
      }

      this.attachEvents();
    }

    renderStep(step) {
      const {
        services,
        slots,
        selectedService,
        selectedDate,
        selectedSlot,
        loading,
      } = this.state;

      switch (step) {
        case "loading":
          return `<div style="text-align:center; padding:40px; color:#6b7280;">Loading experience...</div>`;

        case "services":
          return `
            <div class="header">
              <h3 class="title">Select Service</h3>
              <p class="subtitle">Choose what you'd like to book</p>
            </div>
            <div class="service-list">
              ${services
                .map(
                  (s) => `
                <div class="list-item" data-id="${s.id}">
                  <div>
                    <div class="name">${s.name}</div>
                    <div class="meta">${s.durationMin} mins • $${s.price}</div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              `,
                )
                .join("")}
            </div>
          `;

        case "availability":
          return `
             <div class="header">
              <h3 class="title">${selectedService.name}</h3>
              <p class="subtitle">Select a date and time</p>
            </div>
            <div class="form-group">
              <input type="date" value="${selectedDate}" id="date-input" min="${new Date().toISOString().split("T")[0]}">
            </div>
            <div class="slots-grid">
              ${
                slots.length > 0
                  ? slots
                      .map(
                        (s) => `
                <button class="slot-btn ${selectedSlot === s.time ? "selected" : ""}" data-slot="${s.time}">
                  ${new Date(s.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              `,
                      )
                      .join("")
                  : `<div style="grid-column: span 3; color: #9ca3af; text-align: center; padding: 20px;">No slots available</div>`
              }
            </div>
            <button class="btn-primary" id="confirm-slot" ${!selectedSlot ? "disabled" : ""}>Next</button>
            <button class="btn-primary" id="go-back" style="background:none; color:#6b7280; box-shadow:none; margin-top:8px;">Back</button>
          `;

        case "customer":
          return `
            <div class="header">
              <h3 class="title">Your Details</h3>
              <p class="subtitle">${new Date(selectedSlot).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <form id="booking-form">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" name="name" required placeholder="John Doe">
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" name="email" required placeholder="john@example.com">
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" name="mobile" placeholder="+1 (555) 000-0000">
              </div>
              <button type="submit" class="btn-primary" ${loading ? "disabled" : ""}>
                ${loading ? "Booking..." : "Confirm Booking"}
              </button>
              <button type="button" id="back-to-slots" style="width:100%; background:none; border:none; color:#6b7280; font-size:13px; font-weight:600; margin-top:16px; cursor:pointer;">Back to availability</button>
            </form>
          `;

        case "success":
          return `
            <div class="success-state">
              <div class="success-icon">✓</div>
              <h3 class="title">All Set!</h3>
              <p class="subtitle">Your booking for <b>${selectedService.name}</b> is confirmed. Check your email for details.</p>
              <button class="btn-primary" id="restart">Done</button>
            </div>
          `;

        case "error":
          return `
            <div style="text-align:center; padding:40px;">
              <h3 class="title" style="color:#ef4444">Error</h3>
              <p class="subtitle">Something went wrong. Please refresh.</p>
              <button class="btn-primary" id="restart">Try Again</button>
            </div>
          `;
      }
    }

    attachEvents() {
      // Trigger
      const trigger = this.shadowRoot.querySelector("#trigger");
      if (trigger) trigger.onclick = () => this.togglePopup();

      const overlay = this.shadowRoot.querySelector("#overlay");
      if (overlay)
        overlay.onclick = (e) => {
          if (e.target === overlay) this.togglePopup();
        };

      // Navigation
      const serviceItems = this.shadowRoot.querySelectorAll(".list-item");
      serviceItems.forEach((item) => {
        item.onclick = () => {
          const id = item.getAttribute("data-id");
          const service = this.state.services.find((s) => s.id === id);
          this.setState({ selectedService: service });
          this.fetchAvailability();
        };
      });

      const dateInput = this.shadowRoot.querySelector("#date-input");
      if (dateInput) {
        dateInput.onchange = (e) => {
          this.setState({ selectedDate: e.target.value, selectedSlot: null });
          this.fetchAvailability();
        };
      }

      const slotBtns = this.shadowRoot.querySelectorAll(".slot-btn");
      slotBtns.forEach((btn) => {
        btn.onclick = () => {
          this.setState({ selectedSlot: btn.getAttribute("data-slot") });
        };
      });

      const confirmSlot = this.shadowRoot.querySelector("#confirm-slot");
      if (confirmSlot)
        confirmSlot.onclick = () => this.setState({ step: "customer" });

      const goBack = this.shadowRoot.querySelector("#go-back");
      if (goBack)
        goBack.onclick = () => {
          if (this.serviceId) return; // Locked to one service
          this.setState({
            step: "services",
            selectedService: null,
            selectedSlot: null,
          });
        };

      const backToSlots = this.shadowRoot.querySelector("#back-to-slots");
      if (backToSlots)
        backToSlots.onclick = () => this.setState({ step: "availability" });

      const bookingForm = this.shadowRoot.querySelector("#booking-form");
      if (bookingForm) bookingForm.onsubmit = (e) => this.handleBooking(e);

      const restart = this.shadowRoot.querySelector("#restart");
      if (restart)
        restart.onclick = () => {
          if (this.mode === "popup") this.togglePopup();
          this.setState({
            step: "loading",
            selectedService: null,
            selectedSlot: null,
          });
          this.init();
        };
    }
  }

  if (!customElements.get("slotcore-booking")) {
    customElements.define("slotcore-booking", SlotcoreBooking);
  }

  // Backwards compatibility
  if (!customElements.get("slotcore-widget")) {
    customElements.define("slotcore-widget", class extends SlotcoreBooking {});
  }
})();
