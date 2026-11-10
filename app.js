(() => {
  "use strict";

  const PRICING = {
    baseFare: 18,
    perKm: 2.25,
    vatRate: 0.15,
    helperFee: 35,
    vehicles: {
      pickup: { multiplier: 1, minimum: 35 },
      van: { multiplier: 1.35, minimum: 55 },
      truck: { multiplier: 1.9, minimum: 90 }
    },
    cargoMultipliers: {
      furniture: 1.08,
      boxes: 1,
      electronics: 1.15,
      food: 1.12,
      construction: 1.2
    }
  };

  const elements = {
    form: document.querySelector("#bookingForm"),
    pickup: document.querySelector("#pickup"),
    dropoff: document.querySelector("#dropoff"),
    distance: document.querySelector("#distance"),
    cargoType: document.querySelector("#cargoType"),
    helpers: document.querySelector("#helpers"),
    priceValue: document.querySelector("#priceValue"),
    submitButton: document.querySelector("#submitBooking"),
    confirmationModal: document.querySelector("#confirmationModal"),
    confirmationId: document.querySelector("#confirmationId"),
    confirmationPrice: document.querySelector("#confirmationPrice"),
    toastRegion: document.querySelector("#toastRegion"),
    sidebar: document.querySelector("#sidebar"),
    menuToggle: document.querySelector("#menuToggle"),
    infoModal: document.querySelector("#infoModal"),
    infoModalTitle: document.querySelector("#infoModalTitle"),
    infoModalCopy: document.querySelector("#infoModalCopy")
  };

  const PAGE_TITLES = {
    overview: "نظرة عامة",
    shipments: "شحناتي",
    tracking: "تتبع شحنة",
    fleet: "الأسطول",
    billing: "الفواتير والمدفوعات",
    support: "المساعدة والدعم",
    settings: "الإعدادات"
  };
  const STORAGE_KEYS = {
    shipments: "fleetflow.shipments.v1",
    settings: "fleetflow.settings.v1"
  };
  const seededShipments = [
    { id: "FF-28491", cargo: "أثاث منزلي", pickup: "العليا", dropoff: "النرجس", date: "اليوم، 10:30 ص", status: "transit", price: 186 },
    { id: "FF-28488", cargo: "أجهزة إلكترونية", pickup: "الملز", dropoff: "الدرعية", date: "اليوم، 09:15 ص", status: "preparing", price: 245 },
    { id: "FF-28476", cargo: "مواد غذائية", pickup: "السلي", dropoff: "الورود", date: "اليوم، 08:40 ص", status: "delivered", price: 132 },
    { id: "FF-28462", cargo: "كراتين وبضائع", pickup: "الياسمين", dropoff: "الروضة", date: "أمس، 04:20 م", status: "delivered", price: 98 }
  ];
  const fleetVehicles = [
    { type: "فان متوسط", plate: "أ ب ج ٤٥٦٧", driver: "فهد السبيعي", location: "طريق الملك فهد", status: "moving" },
    { type: "شاحنة صندوق", plate: "د هـ و ٨٢١٤", driver: "سالم الحربي", location: "حي النرجس", status: "moving" },
    { type: "بيك أب", plate: "ر ز س ٣٠٩٢", driver: "ناصر القحطاني", location: "حي الملز", status: "available" },
    { type: "فان مبرد", plate: "ط ي ك ٧٥١٠", driver: "عبدالله المطيري", location: "مركز الصيانة", status: "maintenance" },
    { type: "شاحنة نقل", plate: "ل م ن ١١٨٣", driver: "تركي الدوسري", location: "طريق الدائري الشمالي", status: "moving" }
  ];
  const invoices = [
    { id: "INV-2026-1104", date: "١٠ نوفمبر ٢٠٢٦", shipments: 4, amount: 1284, status: "paid", due: "مدفوعة" },
    { id: "INV-2026-1092", date: "٠٥ نوفمبر ٢٠٢٦", shipments: 3, amount: 480, status: "pending", due: "٢٠ نوفمبر ٢٠٢٦" },
    { id: "INV-2026-1088", date: "٢٨ أكتوبر ٢٠٢٦", shipments: 8, amount: 2130, status: "paid", due: "مدفوعة" },
    { id: "INV-2026-1061", date: "١٥ أكتوبر ٢٠٢٦", shipments: 6, amount: 1765, status: "paid", due: "مدفوعة" }
  ];

  const state = {
    activeModal: null,
    lastFocusedElement: null,
    requestInProgress: false,
    price: 0,
    currentPage: "overview",
    shipments: loadShipments()
  };

  const formatPrice = (amount) => new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0
  }).format(amount);

  function loadShipments() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.shipments);
      if (!saved) return [...seededShipments];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new TypeError("Saved shipment data is not an array.");
      return [...parsed, ...seededShipments.filter((shipment) => !parsed.some((item) => item.id === shipment.id))];
    } catch (error) {
      console.error("FleetFlow could not load saved shipments:", error);
      return [...seededShipments];
    }
  }

  function saveShipments() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.shipments, JSON.stringify(state.shipments));
    } catch (error) {
      console.error("FleetFlow could not save shipments:", error);
      showToast("تعذر حفظ الشحنة على هذا الجهاز.", "error");
    }
  }

  function setTextCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function makeStatus(status) {
    const translations = {
      transit: ["in-transit", "في الطريق"],
      preparing: ["preparing", "جاري التحميل"],
      delivered: ["delivered", "تم التوصيل"],
      searching: ["preparing", "البحث عن سائق"],
      paid: ["delivered", "مدفوعة"],
      pending: ["preparing", "مستحقة"],
      moving: ["in-transit", "على الطريق"],
      available: ["delivered", "متاحة"],
      maintenance: ["preparing", "صيانة"]
    };
    const [className, label] = translations[status] ?? translations.preparing;
    const pill = document.createElement("span");
    pill.className = `status-pill ${className}`;
    const dot = document.createElement("i");
    pill.append(dot, document.createTextNode(` ${label}`));
    return pill;
  }

  function renderShipments() {
    const body = document.querySelector("#shipmentsTableBody");
    if (!body) return;
    const query = document.querySelector("#shipmentSearch").value.trim().toLocaleLowerCase("ar");
    const status = document.querySelector("#shipmentFilter").value;
    const rows = state.shipments.filter((shipment) => {
      const searchable = `${shipment.id} ${shipment.cargo} ${shipment.pickup} ${shipment.dropoff}`.toLocaleLowerCase("ar");
      return (!query || searchable.includes(query)) && (status === "all" || shipment.status === status);
    });
    body.replaceChildren();
    rows.forEach((shipment) => {
      const row = document.createElement("tr");
      setTextCell(row, shipment.id);
      setTextCell(row, shipment.cargo);
      const route = document.createElement("td");
      route.textContent = `${shipment.pickup} ← ${shipment.dropoff}`;
      row.append(route);
      setTextCell(row, shipment.date ?? "اليوم");
      const statusCell = document.createElement("td");
      statusCell.append(makeStatus(shipment.status));
      row.append(statusCell);
      setTextCell(row, `${formatPrice(shipment.price)} ر.س`);
      const actionCell = document.createElement("td");
      const action = document.createElement("button");
      action.className = "table-action";
      action.type = "button";
      action.dataset.trackId = shipment.id;
      action.textContent = shipment.status === "delivered" ? "التفاصيل" : "تتبّع";
      actionCell.append(action);
      row.append(actionCell);
      body.append(row);
    });
    document.querySelector("#shipmentsEmpty").hidden = rows.length > 0;
    document.querySelector("#shipmentResultsCount").textContent = `عرض ${formatPrice(rows.length)} من ${formatPrice(state.shipments.length)} شحنة`;
    document.querySelector("#shipmentsTotal").innerHTML = `${formatPrice(state.shipments.length).padStart(2, "٠")} <span>شحنات</span>`;
    document.querySelector(".nav-number").textContent = formatPrice(state.shipments.length);
  }

  function renderFleet() {
    const body = document.querySelector("#fleetTableBody");
    if (!body) return;
    const query = document.querySelector("#fleetSearch").value.trim().toLocaleLowerCase("ar");
    body.replaceChildren();
    fleetVehicles.filter((vehicle) => `${vehicle.type} ${vehicle.plate} ${vehicle.driver} ${vehicle.location}`.toLocaleLowerCase("ar").includes(query))
      .forEach((vehicle) => {
        const row = document.createElement("tr");
        setTextCell(row, vehicle.type);
        setTextCell(row, vehicle.plate);
        setTextCell(row, vehicle.driver);
        setTextCell(row, vehicle.location);
        const statusCell = document.createElement("td");
        statusCell.append(makeStatus(vehicle.status));
        row.append(statusCell);
        body.append(row);
      });
  }

  function renderInvoices() {
    const body = document.querySelector("#invoicesTableBody");
    if (!body) return;
    const filter = document.querySelector("#invoiceFilter").value;
    body.replaceChildren();
    invoices.filter((invoice) => filter === "all" || invoice.status === filter).forEach((invoice) => {
      const row = document.createElement("tr");
      setTextCell(row, invoice.id);
      setTextCell(row, invoice.date);
      setTextCell(row, formatPrice(invoice.shipments));
      setTextCell(row, `${formatPrice(invoice.amount)} ر.س`);
      const statusCell = document.createElement("td");
      statusCell.append(makeStatus(invoice.status));
      row.append(statusCell);
      setTextCell(row, invoice.due);
      const actionCell = document.createElement("td");
      const download = document.createElement("button");
      download.type = "button";
      download.className = "table-action";
      download.dataset.invoiceId = invoice.id;
      download.textContent = "تحميل";
      actionCell.append(download);
      row.append(actionCell);
      body.append(row);
    });
  }

  function showPage(pageName, updateHash = true) {
    const target = PAGE_TITLES[pageName] ? pageName : "overview";
    state.currentPage = target;
    document.querySelectorAll(".route-page").forEach((page) => {
      const active = page.dataset.page === target;
      page.hidden = !active;
      page.classList.toggle("active", active);
    });
    document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
      const active = link.dataset.route === target;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#breadcrumbTitle").textContent = PAGE_TITLES[target];
    document.title = `${PAGE_TITLES[target]} — FleetFlow`;
    if (updateHash && window.location.hash !== `#${target}`) window.location.hash = target;
    window.scrollTo({ top: 0, behavior: "smooth" });
    elements.sidebar.classList.remove("is-open");
    elements.menuToggle.setAttribute("aria-expanded", "false");
    elements.menuToggle.setAttribute("aria-label", "فتح القائمة");
    if (target === "shipments") renderShipments();
    if (target === "fleet") renderFleet();
    if (target === "billing") renderInvoices();
  }

  function getSelectedVehicle() {
    return document.querySelector('input[name="vehicle"]:checked')?.value ?? "van";
  }

  function calculatePrice() {
    const distance = Number(elements.distance.value);
    if (!Number.isFinite(distance) || distance <= 0) return 0;

    const vehicle = PRICING.vehicles[getSelectedVehicle()];
    const cargoMultiplier = PRICING.cargoMultipliers[elements.cargoType.value] ?? 1;
    const helperCost = elements.helpers.checked ? PRICING.helperFee : 0;
    const beforeTax = Math.max(
      vehicle.minimum,
      (PRICING.baseFare + distance * PRICING.perKm) * vehicle.multiplier * cargoMultiplier
    ) + helperCost;

    return Math.round(beforeTax * (1 + PRICING.vatRate));
  }

  function updatePrice() {
    state.price = calculatePrice();
    elements.priceValue.textContent = formatPrice(state.price);
    return state.price;
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " error" : ""}`;
    const icon = document.createElement("i");
    icon.className = type === "error" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check";
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(icon, text);
    elements.toastRegion.append(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-10px)";
      window.setTimeout(() => toast.remove(), 220);
    }, 3500);
  }

  function openModal(modal) {
    if (state.activeModal) closeModal(state.activeModal);
    state.lastFocusedElement = document.activeElement;
    state.activeModal = modal;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector("[data-close-modal]")?.focus();
  }

  function closeModal(modal = state.activeModal) {
    if (!modal) return;
    modal.hidden = true;
    if (state.activeModal === modal) {
      state.activeModal = null;
      document.body.classList.remove("modal-open");
      state.lastFocusedElement?.focus?.();
    }
  }

  function openInfoModal(title, message) {
    elements.infoModalTitle.textContent = title;
    elements.infoModalCopy.textContent = message;
    openModal(elements.infoModal);
  }

  function validateBooking() {
    const pickup = elements.pickup.value.trim();
    const dropoff = elements.dropoff.value.trim();
    const distance = Number(elements.distance.value);
    if (!pickup || !dropoff) {
      showToast("أدخل موقعي الاستلام والتسليم للمتابعة.", "error");
      (pickup ? elements.dropoff : elements.pickup).focus();
      return false;
    }
    if (pickup.localeCompare(dropoff, "ar", { sensitivity: "base" }) === 0) {
      showToast("يجب أن يختلف موقع التسليم عن موقع الاستلام.", "error");
      elements.dropoff.focus();
      return false;
    }
    if (!Number.isFinite(distance) || distance < 1 || distance > 2000) {
      showToast("أدخل مسافة بين ١ و٢٠٠٠ كيلومتر.", "error");
      elements.distance.focus();
      return false;
    }
    return true;
  }

  function createShipmentId() {
    return `FF-${String(Math.floor(10000 + Math.random() * 90000))}`;
  }

  // Mock API boundary: replace this promise with a fetch call when a backend is available.
  async function createShipment(payload) {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return {
      id: createShipmentId(),
      ...payload,
      status: "searching",
      createdAt: new Date().toISOString()
    };
  }

  function addShipmentToList(shipment) {
    const record = {
      ...shipment,
      cargo: elements.cargoType.selectedOptions[0].textContent,
      date: "الآن",
      status: "searching"
    };
    state.shipments.unshift(record);
    saveShipments();
    renderShipments();

    const row = document.createElement("article");
    row.className = "shipment-row new-shipment-row";
    const icon = document.createElement("span");
    icon.className = "shipment-type-icon";
    const iconElement = document.createElement("i");
    iconElement.className = "fa-solid fa-box";
    icon.append(iconElement);

    const details = document.createElement("div");
    details.className = "shipment-main";
    const title = document.createElement("strong");
    title.textContent = elements.cargoType.selectedOptions[0].textContent;
    const id = document.createElement("span");
    id.textContent = `${shipment.id} • الآن`;
    details.append(title, id);

    const route = document.createElement("div");
    route.className = "shipment-route";
    const pickup = document.createElement("span");
    pickup.textContent = shipment.pickup;
    const arrow = document.createElement("i");
    arrow.className = "fa-solid fa-arrow-left-long";
    const dropoff = document.createElement("span");
    dropoff.textContent = shipment.dropoff;
    route.append(pickup, arrow, dropoff);

    const status = makeStatus("searching");
    row.append(icon, details, route, status);
    document.querySelector("#shipmentList").prepend(row);
    const count = document.querySelector(".heading-count");
    count.textContent = String(Number(count.textContent) + 1);
    const overviewCount = document.querySelector(".stats-grid .stat-card .stat-value");
    overviewCount.innerHTML = `${String(state.shipments.filter((item) => item.status !== "delivered").length).padStart(2, "0")} <span>شحنات</span>`;
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();
    if (state.requestInProgress || !validateBooking()) return;

    state.requestInProgress = true;
    elements.submitButton.disabled = true;
    elements.submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>جارٍ تأكيد طلبك...</span>';
    const shipment = {
      pickup: elements.pickup.value.trim(),
      dropoff: elements.dropoff.value.trim(),
      distanceKm: Number(elements.distance.value),
      vehicle: getSelectedVehicle(),
      cargoType: elements.cargoType.value,
      helpers: elements.helpers.checked,
      price: updatePrice()
    };

    try {
      const createdShipment = await createShipment(shipment);
      addShipmentToList(createdShipment);
      elements.confirmationId.textContent = createdShipment.id;
      elements.confirmationPrice.textContent = `${formatPrice(createdShipment.price)} ر.س`;
      openModal(elements.confirmationModal);
      elements.form.reset();
      updatePrice();
    } catch (error) {
      console.error("FleetFlow shipment request failed:", error);
      showToast("تعذر إنشاء الشحنة. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      state.requestInProgress = false;
      elements.submitButton.disabled = false;
      elements.submitButton.innerHTML = '<span>تأكيد وحجز الشاحنة</span><i class="fa-solid fa-arrow-left"></i>';
    }
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadShipments() {
    const rows = [
      ["رقم الشحنة", "نوع الحمولة", "الاستلام", "التسليم", "الحالة", "التكلفة"],
      ...state.shipments.map((shipment) => [shipment.id, shipment.cargo, shipment.pickup, shipment.dropoff, shipment.status, shipment.price])
    ];
    downloadCsv("fleetflow-shipments.csv", rows);
  }

  function downloadInvoice(invoice) {
    downloadCsv(`${invoice.id}.csv`, [
      ["FleetFlow — ملخص الفاتورة"],
      ["رقم الفاتورة", invoice.id],
      ["تاريخ الإصدار", invoice.date],
      ["عدد الشحنات", invoice.shipments],
      ["الإجمالي (ر.س)", invoice.amount],
      ["الحالة", invoice.status],
      ["تاريخ الاستحقاق", invoice.due]
    ]);
  }

  function handleTracking(event) {
    event.preventDefault();
    const id = document.querySelector("#trackingId").value.trim().toUpperCase();
    const shipment = state.shipments.find((item) => item.id.toUpperCase() === id);
    if (!shipment) {
      document.querySelector("#trackingResult").hidden = true;
      showToast("لم نعثر على شحنة بهذا الرقم. تحقق من رقم الشحنة.", "error");
      return;
    }
    document.querySelector("#trackingRoute").textContent = `${shipment.pickup} ← ${shipment.dropoff}`;
    document.querySelector("#trackingNumberLabel").textContent = shipment.id;
    const result = document.querySelector("#trackingResult");
    result.hidden = false;
    const stages = [
      { key: "requested", title: "تم استلام طلبك", description: "تم تسجيل طلب الشحنة بنجاح." },
      { key: "preparing", title: "جاري تحميل الشحنة", description: "السائق يجهّز الشحنة للاستلام." },
      { key: "transit", title: "الشحنة في الطريق إليك", description: "الوصول المتوقع خلال ٢٥ دقيقة." },
      { key: "delivered", title: "تم التسليم", description: "اكتمل توصيل الشحنة بنجاح." }
    ];
    const currentStage = shipment.status === "searching" ? 1
      : shipment.status === "preparing" ? 1
        : shipment.status === "delivered" ? 3 : 2;
    const stageLabel = shipment.status === "searching" ? "البحث عن سائق"
      : shipment.status === "preparing" ? "جاري التحميل"
        : shipment.status === "delivered" ? "تم التوصيل" : "الشحنة في الطريق";
    const badge = result.querySelector(".tracking-map-panel .status-pill");
    badge.className = `status-pill ${shipment.status === "delivered" ? "delivered" : shipment.status === "transit" ? "in-transit" : "preparing"}`;
    const badgeDot = document.createElement("i");
    badge.replaceChildren(badgeDot, document.createTextNode(` ${stageLabel}`));

    result.querySelectorAll("[data-tracking-step]").forEach((step, index) => {
      const stage = stages[index];
      step.classList.toggle("completed", index < currentStage || shipment.status === "delivered");
      step.classList.toggle("current", index === currentStage && shipment.status !== "delivered");
      step.querySelector("strong").textContent = stage.title;
      step.querySelector("small").textContent = stage.description;
    });

    const locationLabel = result.querySelector(".tracking-truck-label");
    const locationIcon = document.createElement("i");
    locationIcon.className = "fa-solid fa-truck-fast";
    locationLabel.replaceChildren(
      locationIcon,
      document.createTextNode(shipment.status === "delivered"
        ? " تم تسليم الشحنة بنجاح"
        : shipment.status === "searching"
          ? " جارٍ البحث عن سائق قريب"
          : shipment.status === "preparing"
            ? " السائق في موقع الاستلام"
            : " السائق على بُعد ٤.٢ كم")
    );
    result.querySelector(".driver-card").hidden = shipment.status === "searching";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.settings) ?? "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new TypeError("Saved settings are invalid.");
    } catch (error) {
      console.error("FleetFlow could not load saved settings:", error);
      showToast("تعذر تحميل الإعدادات المحفوظة.", "error");
      return;
    }
    const form = document.querySelector("#settingsForm");
    Object.entries(saved).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else if (typeof value === "string") field.value = value;
    });
  }

  function saveSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = {};
    [...form.elements].forEach((field) => {
      if (!field.name) return;
      values[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(values));
      document.querySelector("#settingsSaved").textContent = "تم الحفظ بنجاح";
      showToast("تم حفظ إعدادات حسابك على هذا الجهاز.");
    } catch (error) {
      console.error("FleetFlow could not save settings:", error);
      document.querySelector("#settingsSaved").textContent = "";
      showToast("تعذر حفظ الإعدادات. تحقق من مساحة التخزين في المتصفح.", "error");
    }
  }

  function bindInteractions() {
    elements.form.addEventListener("input", updatePrice);
    elements.form.addEventListener("change", updatePrice);
    elements.form.addEventListener("submit", handleBookingSubmit);
    window.addEventListener("hashchange", () => showPage(window.location.hash.slice(1), false));
    document.querySelectorAll("[data-route]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(link.dataset.route);
      });
    });
    document.querySelectorAll("[data-booking]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage("overview");
        window.setTimeout(() => {
          document.querySelector("#new-shipment").scrollIntoView({ behavior: "smooth", block: "start" });
          elements.pickup.focus({ preventScroll: true });
        }, 80);
      });
    });
    document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelectorAll("[data-settings-tab]").forEach((item) => item.classList.toggle("active", item === tab));
        document.querySelectorAll("[data-settings-section]").forEach((section) => {
          section.hidden = section.id !== tab.dataset.settingsTab;
          section.classList.toggle("active", !section.hidden);
        });
      });
    });
    document.querySelector("#settingsForm").addEventListener("submit", saveSettings);
    document.querySelector("#supportForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ إرسال طلبك';
      window.setTimeout(() => {
        form.reset();
        button.disabled = false;
        button.innerHTML = 'إرسال الطلب <i class="fa-solid fa-arrow-left"></i>';
        showToast("تم إرسال طلبك. سيتواصل معك فريق الدعم قريبًا.");
      }, 500);
    });
    document.querySelector("#trackingForm").addEventListener("submit", handleTracking);
    document.querySelector("#shipmentSearch").addEventListener("input", renderShipments);
    document.querySelector("#shipmentFilter").addEventListener("change", renderShipments);
    document.querySelector("#fleetSearch").addEventListener("input", renderFleet);
    document.querySelector("#invoiceFilter").addEventListener("change", renderInvoices);
    document.querySelector("#shipmentsTableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-track-id]");
      if (!button) return;
      showPage("tracking");
      document.querySelector("#trackingId").value = button.dataset.trackId;
      handleTracking(new Event("submit", { cancelable: true }));
    });
    document.querySelector("#invoicesTableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-invoice-id]");
      if (!button) return;
      const invoice = invoices.find((item) => item.id === button.dataset.invoiceId);
      if (invoice) downloadInvoice(invoice);
    });
    document.querySelector("#exportShipments").addEventListener("click", downloadShipments);
    document.querySelector("#billingExport").addEventListener("click", () => {
      downloadCsv("fleetflow-account-summary.csv", [
        ["رقم الفاتورة", "تاريخ الإصدار", "عدد الشحنات", "المبلغ (ر.س)", "الحالة", "الاستحقاق"],
        ...invoices.map((invoice) => [invoice.id, invoice.date, invoice.shipments, invoice.amount, invoice.status, invoice.due])
      ]);
    });
    document.querySelector("#refreshFleet").addEventListener("click", () => {
      renderFleet();
      showToast("تم تحديث بيانات الأسطول.");
    });
    document.querySelector("#managePayment").addEventListener("click", () => {
      openInfoModal("وسيلة الدفع", "بطاقة Visa المنتهية بـ 4829 هي وسيلة الدفع الافتراضية. إدارة البطاقات تتطلب ربط بوابة الدفع الآمنة.");
    });
    document.querySelector("#shipmentList").addEventListener("click", (event) => {
      const more = event.target.closest(".row-more");
      if (more) showToast("افتح صفحة «شحناتي» لعرض تفاصيل الطلب.");
    });
    document.querySelector("#allShipmentsButton").addEventListener("click", () => showPage("shipments"));
    document.querySelector("#mapViewButton").addEventListener("click", () => showPage("fleet"));
    document.querySelector("#mapExpandButton").addEventListener("click", () => showPage("fleet"));

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop")));
    });
    document.querySelectorAll(".modal-backdrop").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(modal);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "Tab" && state.activeModal) {
        const focusable = [...state.activeModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.querySelectorAll("[data-scroll-to]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (window.innerWidth <= 700) {
          elements.sidebar.classList.remove("is-open");
          elements.menuToggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    elements.menuToggle.addEventListener("click", () => {
      const isOpen = elements.sidebar.classList.toggle("is-open");
      elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
      elements.menuToggle.setAttribute("aria-label", isOpen ? "إغلاق القائمة" : "فتح القائمة");
    });
    document.addEventListener("click", (event) => {
      if (window.innerWidth <= 700 && elements.sidebar.classList.contains("is-open")
        && !elements.sidebar.contains(event.target) && !elements.menuToggle.contains(event.target)) {
        elements.sidebar.classList.remove("is-open");
        elements.menuToggle.setAttribute("aria-expanded", "false");
        elements.menuToggle.setAttribute("aria-label", "فتح القائمة");
      }
    });

    document.querySelectorAll("[data-locate]").forEach((button) => {
      button.addEventListener("click", () => {
        const field = document.getElementById(button.dataset.locate);
        if (!navigator.geolocation) {
          showToast("تحديد الموقع غير متاح في هذا المتصفح.", "error");
          return;
        }
        button.disabled = true;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            field.value = `موقعي الحالي (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`;
            button.disabled = false;
            showToast("تم تحديد موقع الاستلام.");
          },
          () => {
            button.disabled = false;
            showToast("تعذر تحديد الموقع. تحقق من صلاحيات المتصفح.", "error");
          },
          { timeout: 8000, maximumAge: 60000 }
        );
      });
    });

    document.querySelector("#notificationButton").addEventListener("click", () => {
      showToast("ليس لديك إشعارات جديدة.");
    });
    document.querySelector("#mapExpandButton").addEventListener("click", () => {
      openInfoModal("خريطة الأسطول", "تظهر هنا مواقع الشاحنات النشطة ومساراتها. تتوفر التتبعات الحية للشحنات بعد تأكيد السائق.");
    });
    document.querySelector("#rewardsButton").addEventListener("click", () => {
      openInfoModal("مكافآت FleetFlow", "اجمع نقطة مع كل ريال تنفقه على شحناتك، واستبدل نقاطك بخصومات على طلباتك القادمة.");
    });
    document.querySelector("#profileButton").addEventListener("click", () => {
      openInfoModal("حساب محمد العتيبي", "حساب أعمال مفعّل. لإدارة بيانات الفوترة أو أعضاء الفريق، تواصل مع مدير الحساب.");
    });
    document.querySelector(".topbar-user").addEventListener("click", () => {
      openInfoModal("حساب محمد العتيبي", "حساب أعمال مفعّل. لإدارة بيانات الفوترة أو أعضاء الفريق، تواصل مع مدير الحساب.");
    });
  }

  updatePrice();
  document.querySelector("#dashboardDate").textContent = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
  loadSettings();
  showPage(window.location.hash.slice(1) || "overview", false);
  bindInteractions();
})();
