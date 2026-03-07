(function () {
  class SlotcoreWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.state = {
        step: "loading", // loading, availability, booking, success
        slots: [],
        selectedDate: new Date().toISOString().split("T")[0],
        selectedSlot: null,
        loading: false,
      };
    }

    connectedCallback() {
      this.orgId = this.getAttribute("org-id");
      this.serviceId = this.getAttribute("service-id");
      this.baseUrl = "https://slotcore-production.up.railway.app";
      this.render();
      this.fetchAvailability();
    }

    async fetchAvailability() {
      this.setState({ loading: true });
      try {
        const url = `${this.baseUrl}/v1/availability?service_id=${this.serviceId}&date=${this.state.selectedDate}&org_id=${this.orgId}`;
        const res = await fetch(url);
        const data = await res.json();
        this.setState({
          slots: data.data || [],
          step: "availability",
          loading: false,
        });
      } catch (err) {
        console.error("Slotcore Widget Error:", err);
        this.setState({ step: "error", loading: false });
      }
    }

    async handleBooking(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const customer = {
        name: formData.get("name"),
        email: formData.get("email"),
      };

      this.setState({ loading: true });
      try {
        const res = await fetch(`${this.baseUrl}/v1/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": this.orgId, // The v1 controller needs org context
          },
          body: JSON.stringify({
            service_id: this.serviceId,
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

    render() {
      const { step, slots, loading, selectedDate, selectedSlot } = this.state;

      const styles = `
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          max-width: 400px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
          border: 1px solid #f3f4f6;
          overflow: hidden;
          color: #111827;
        }
        .container { padding: 24px; }
        .header { margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: 700; margin: 0; }
        .subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
        
        .date-picker { margin-bottom: 20px; }
        .date-picker input { 
          width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; 
          font-size: 14px; outline: none;
        }

        .slots-grid { 
          display: grid; grid-template-cols: repeat(3, 1fr); gap: 8px; 
          max-height: 200px; overflow-y: auto; padding: 2px;
        }
        .slot-btn {
          padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px;
          font-size: 13px; font-weight: 600; text-align: center; cursor: pointer;
          background: white; transition: all 0.2s;
        }
        .slot-btn:hover { border-color: #6366f1; color: #6366f1; }
        .slot-btn.selected { background: #6366f1; color: white; border-color: #6366f1; }

        .btn-primary {
          width: 100%; background: #6366f1; color: white; border: none;
          padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer;
          margin-top: 16px; transition: background 0.2s;
        }
        .btn-primary:hover { background: #4f46e5; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px; }
        .form-group input { 
          width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; 
          box-sizing: border-box;
        }

        .success-state { text-align: center; padding: 40px 20px; }
        .success-icon { 
          width: 48px; height: 48px; background: #ecfdf5; color: #10b981; 
          border-radius: 50%; display: flex; items-center: center; justify-content: center;
          margin: 0 auto 16px; font-size: 24px;
        }
        
        .loader { 
          height: 2px; width: 100%; background: #f3f4f6; position: relative; overflow: hidden;
        }
        .loader::after {
          content: ""; position: absolute; left: -50%; height: 100%; width: 50%;
          background: #6366f1; animation: loading 1s infinite linear;
        }
        @keyframes loading {
          0% { left: -50%; }
          100% { left: 100%; }
        }
      `;

      let content = "";

      if (step === "loading") {
        content = `<div class="container text-center">Loading availability...</div>`;
      } else if (step === "availability") {
        content = `
          <div class="header">
            <h3 class="title">Select a Time</h3>
            <p class="subtitle">Available slots for your service</p>
          </div>
          <div class="date-picker">
            <input type="date" value="${selectedDate}" id="widget-date-input">
          </div>
          <div class="slots-grid">
            ${
              slots.length > 0
                ? slots
                    .map(
                      (slot) => `
              <button class="slot-btn ${selectedSlot === slot.time ? "selected" : ""}" data-slot="${slot.time}">
                ${new Date(slot.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            `,
                    )
                    .join("")
                : '<div style="grid-column: span 3; color: #999; text-align: center; padding: 20px;">No slots available</div>'
            }
          </div>
          <button class="btn-primary" id="confirm-slot-btn" ${!selectedSlot ? "disabled" : ""}>
            Next
          </button>
        `;
      } else if (step === "booking") {
        content = `
          <div class="header">
            <h3 class="title">Confirm Booking</h3>
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
            <button type="submit" class="btn-primary" ${loading ? "disabled" : ""}>
              ${loading ? "Processing..." : "Book Now"}
            </button>
            <button type="button" class="btn-secondary" id="back-btn" style="width:100%; background:none; border:none; color:#6b7280; font-size:12px; margin-top:10px; cursor:pointer;">
              Back to slots
            </button>
          </form>
        `;
      } else if (step === "success") {
        content = `
          <div class="success-state">
            <div class="success-icon">✓</div>
            <h3 class="title">Booking Confirmed!</h3>
            <p class="subtitle">Check your email for details.</p>
            <button class="btn-primary" id="restart-btn" style="margin-top:24px;">Add another</button>
          </div>
        `;
      }

      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        ${loading ? '<div class="loader"></div>' : ""}
        <div class="container">
          ${content}
        </div>
      `;

      this.attachEvents();
    }

    attachEvents() {
      const dateInput = this.shadowRoot.querySelector("#widget-date-input");
      if (dateInput) {
        dateInput.addEventListener("change", (e) => {
          this.setState({ selectedDate: e.target.value, selectedSlot: null });
          this.fetchAvailability();
        });
      }

      this.shadowRoot.querySelectorAll(".slot-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.setState({ selectedSlot: btn.getAttribute("data-slot") });
        });
      });

      const confirmBtn = this.shadowRoot.querySelector("#confirm-slot-btn");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          this.setState({ step: "booking" });
        });
      }

      const bookingForm = this.shadowRoot.querySelector("#booking-form");
      if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => this.handleBooking(e));
      }

      const backBtn = this.shadowRoot.querySelector("#back-btn");
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          this.setState({ step: "availability" });
        });
      }

      const restartBtn = this.shadowRoot.querySelector("#restart-btn");
      if (restartBtn) {
        restartBtn.addEventListener("click", () => {
          this.setState({ step: "availability", selectedSlot: null });
          this.fetchAvailability();
        });
      }
    }
  }

  customElements.define("slotcore-widget", SlotcoreWidget);
})();
