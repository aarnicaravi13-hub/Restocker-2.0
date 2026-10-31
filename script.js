/* ==========================================
   RESTOCKER — FUNCTIONALITY
   Storage: browser localStorage
========================================== */

"use strict";

// ------------------------------------------
// 1. ELEMENTS
// ------------------------------------------

const itemForm = document.getElementById("item-form");
const itemDialog = document.getElementById("item-dialog");
const itemsList = document.getElementById("items-list");

const openAddButton = document.getElementById("open-add-modal");
const closeModalButton = document.getElementById("close-modal");
const cancelModalButton = document.getElementById("cancel-modal");
const submitButton = document.getElementById("submit-button");
const enableNotificationsButton =
    document.getElementById("enable-notifications");

const itemIdInput = document.getElementById("item-id");
const itemNameInput = document.getElementById("item-name");
const categoryInput = document.getElementById("item-category");
const lastPurchasedInput = document.getElementById("last-purchased");
const durationInput = document.getElementById("duration");
const reminderDateInput = document.getElementById("reminder-date");
const notesInput = document.getElementById("item-notes");

const modalTitle = document.getElementById("modal-title");
const formError = document.getElementById("form-error");

const totalCount = document.getElementById("total-count");
const dueCount = document.getElementById("due-count");
const overdueCount = document.getElementById("overdue-count");

const reminderSummary = document.getElementById("reminder-summary");

const searchInput = document.getElementById("search-input");
const filterSelect = document.getElementById("filter-select");

const toastElement = document.getElementById("toast");


// ------------------------------------------
// 2. STORAGE
// ------------------------------------------

const STORAGE_KEY = "restocker_items_v1";
const NOTIFIED_KEY = "restocker_notifications_v1";

let items = loadItems();
let toastTimer;

function loadItems() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        // Ignore invalid or unexpected saved data.
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(item =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.reminderDate === "string" &&
            typeof item.lastPurchased === "string" &&
            Number.isFinite(Number(item.duration)) &&
            Number(item.duration) >= 1
        );
    } catch (error) {
        console.error("Could not load Restocker data:", error);
        return [];
    }
}

function saveItems() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch (error) {
        console.error("Could not save Restocker data:", error);

        showToast(
            "Couldn't save your changes. Check your browser storage."
        );

        return false;
    }
}


// ------------------------------------------
// 3. DATE HELPERS
// ------------------------------------------

function todayString() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function dateToUTC(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

    if (!match) {
        return NaN;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);

    // Reject impossible dates, such as February 31.
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return NaN;
    }

    return timestamp;
}

function daysBetween(fromDate, toDate) {
    const from = dateToUTC(fromDate);
    const to = dateToUTC(toDate);

    if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return NaN;
    }

    return Math.round((to - from) / 86400000);
}

function formatDate(dateString) {
    const timestamp = dateToUTC(dateString);

    if (!Number.isFinite(timestamp)) {
        return "Invalid date";
    }

    return new Date(timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });
}

function reminderStatus(item) {
    const daysLeft = daysBetween(todayString(), item.reminderDate);

    if (!Number.isFinite(daysLeft)) {
        return "invalid";
    }

    if (daysLeft < 0) {
        return "overdue";
    }

    if (daysLeft <= 3) {
        return "upcoming";
    }

    return "later";
}

function statusLabel(item) {
    const status = reminderStatus(item);
    const daysLeft = daysBetween(todayString(), item.reminderDate);

    if (status === "overdue") {
        const daysOverdue = Math.abs(daysLeft);

        return daysOverdue === 1
            ? "1 day overdue"
            : `${daysOverdue} days overdue`;
    }

    if (daysLeft === 0) {
        return "Due today";
    }

    if (daysLeft === 1) {
        return "Due tomorrow";
    }

    if (status === "upcoming") {
        return `Due in ${daysLeft} days`;
    }

    if (status === "later") {
        return `Due ${formatDate(item.reminderDate)}`;
    }

    return "Check reminder date";
}


// ------------------------------------------
// 4. TOAST MESSAGES
// ------------------------------------------

function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastElement.classList.remove("show");
    }, 3000);
}


// ------------------------------------------
// 5. MODAL CONTROLS
// ------------------------------------------

function openModal(item = null) {
    itemForm.reset();
    formError.textContent = "";

    if (item) {
        modalTitle.textContent = "Edit item";
        submitButton.textContent = "Save changes";

        itemIdInput.value = item.id;
        itemNameInput.value = item.name;
        categoryInput.value = item.category;
        lastPurchasedInput.value = item.lastPurchased;
        durationInput.value = item.duration;
        reminderDateInput.value = item.reminderDate;
        notesInput.value = item.notes || "";
    } else {
        modalTitle.textContent = "Add an item";
        submitButton.textContent = "Save item";

        itemIdInput.value = "";
        lastPurchasedInput.value = todayString();

        const suggestedReminder = new Date();
        suggestedReminder.setDate(suggestedReminder.getDate() + 30);

        const year = suggestedReminder.getFullYear();
        const month = String(
            suggestedReminder.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
            suggestedReminder.getDate()
        ).padStart(2, "0");

        reminderDateInput.value = `${year}-${month}-${day}`;
        durationInput.value = 30;
    }

    itemDialog.showModal();
    itemNameInput.focus();
}

function closeModal() {
    itemDialog.close();
    formError.textContent = "";
}

openAddButton.addEventListener("click", () => openModal());

closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);

itemDialog.addEventListener("click", event => {
    if (event.target === itemDialog) {
        closeModal();
    }
});


// ------------------------------------------
// 6. ADD AND EDIT ITEMS
// ------------------------------------------

itemForm.addEventListener("submit", event => {
    // Prevent the browser from reloading the page.
    event.preventDefault();

    const name = itemNameInput.value.trim();
    const category = categoryInput.value;
    const lastPurchased = lastPurchasedInput.value;
    const duration = Number(durationInput.value);
    const reminderDate = reminderDateInput.value;
    const notes = notesInput.value.trim();

    // Validate the form.
    if (!name) {
        formError.textContent = "Please enter an item name.";
        itemNameInput.focus();
        return;
    }

    if (
        !Number.isInteger(duration) ||
        duration < 1 ||
        duration > 36500
    ) {
        formError.textContent =
            "Duration must be a whole number of days between 1 and 36500.";
        durationInput.focus();
        return;
    }

    if (
        !Number.isFinite(dateToUTC(lastPurchased)) ||
        !Number.isFinite(dateToUTC(reminderDate))
    ) {
        formError.textContent = "Please enter valid dates.";
        return;
    }

    if (lastPurchased > todayString()) {
        formError.textContent =
            "Last purchased cannot be a future date.";
        lastPurchasedInput.focus();
        return;
    }

    if (reminderDate < lastPurchased) {
        formError.textContent =
            "The reminder cannot be before the purchase date.";
        reminderDateInput.focus();
        return;
    }

    // Use the existing ID when editing.
    const existingId = itemIdInput.value;

    const existingItem = existingId
        ? items.find(item => item.id === existingId)
        : null;

    const newItem = {
        id: existingItem ? existingItem.id : createId(),
        name,
        category,
        lastPurchased,
        duration,
        reminderDate,
        notes,
        createdAt: existingItem
            ? existingItem.createdAt
            : new Date().toISOString()
    };

    if (existingItem) {
        items = items.map(item =>
            item.id === existingId ? newItem : item
        );
    } else {
        items.push(newItem);
    }

    if (!saveItems()) {
        // Restore the previous data if storage failed.
        items = existingItem
            ? items.map(item =>
                item.id === existingId ? existingItem : item
              )
            : items.filter(item => item.id !== newItem.id);

        return;
    }

    renderApp();
    closeModal();

    showToast(
        existingItem
            ? `${name} updated successfully.`
            : `${name} added to your essentials!`
    );

    checkReminders();
});

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


// ------------------------------------------
// 7. DELETE ITEMS
// ------------------------------------------

function deleteItem(id) {
    const item = items.find(entry => entry.id === id);

    if (!item) {
        return;
    }

    const confirmed = window.confirm(
        `Delete "${item.name}" from your essentials?`
    );

    if (!confirmed) {
        return;
    }

    const previousItems = items;
    items = items.filter(entry => entry.id !== id);

    if (!saveItems()) {
        items = previousItems;
        return;
    }

    renderApp();
    showToast(`${item.name} deleted.`);
}


// ------------------------------------------
// 8. ITEM CARD CREATION
// ------------------------------------------

// Build elements using textContent so user-entered text
// is displayed as text rather than interpreted as HTML.

function createTextElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;

    return element;
}

function createItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const top = document.createElement("div");
    top.className = "item-card-top";

    const identity = document.createElement("div");
    identity.className = "item-identity";

    const symbol = createTextElement("div", "item-symbol", "✳");
    symbol.setAttribute("aria-hidden", "true");

    const titleGroup = document.createElement("div");

    titleGroup.appendChild(
        createTextElement("h3", "item-name", item.name)
    );

    titleGroup.appendChild(
        createTextElement("p", "item-category", item.category)
    );

    identity.append(symbol, titleGroup);

    const status = createTextElement(
        "span",
        `status-badge ${reminderStatus(item)}`,
        statusLabel(item)
    );

    top.append(identity, status);
    card.appendChild(top);

    // Purchase and reminder details.
    const details = document.createElement("div");
    details.className = "item-details";

    const purchaseDetail = document.createElement("div");

    purchaseDetail.appendChild(
        createTextElement("span", "detail-label", "LAST PURCHASED")
    );

    purchaseDetail.appendChild(
        createTextElement(
            "span",
            "detail-value",
            formatDate(item.lastPurchased)
        )
    );

    const durationDetail = document.createElement("div");

    durationDetail.appendChild(
        createTextElement("span", "detail-label", "USUALLY LASTS")
    );

    durationDetail.appendChild(
        createTextElement(
            "span",
            "detail-value",
            `${item.duration} ${item.duration === 1 ? "day" : "days"}`
        )
    );

    const reminderDetail = document.createElement("div");

    reminderDetail.appendChild(
        createTextElement("span", "detail-label", "REMINDER DATE")
    );

    reminderDetail.appendChild(
        createTextElement(
            "span",
            "detail-value",
            formatDate(item.reminderDate)
        )
    );

    details.append(purchaseDetail, durationDetail, reminderDetail);

    card.appendChild(details);

    if (item.notes) {
        card.appendChild(
            createTextElement("p", "item-notes", item.notes)
        );
    }

    // Edit and delete buttons.
    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editButton = createTextElement(
        "button",
        "small-button",
        "✎ Edit"
    );

    editButton.type = "button";
    editButton.addEventListener("click", () => openModal(item));

    const deleteButton = createTextElement(
        "button",
        "small-button delete",
        "Delete"
    );

    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteItem(item.id));

    actions.append(editButton, deleteButton);
    card.appendChild(actions);

    return card;
}


// ------------------------------------------
// 9. SEARCH AND FILTER
// ------------------------------------------

function getVisibleItems() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;

    return items
        .filter(item => {
            const searchableText = [
                item.name,
                item.category,
                item.notes || ""
            ].join(" ").toLowerCase();

            return searchableText.includes(searchTerm);
        })
        .filter(item => {
            if (filter === "all") {
                return true;
            }

            return reminderStatus(item) === filter;
        })
        .sort((a, b) =>
            a.reminderDate.localeCompare(b.reminderDate)
        );
}

function renderItems() {
    itemsList.replaceChildren();

    const visibleItems = getVisibleItems();

    if (visibleItems.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = createTextElement("div", "empty-icon", "✳");
        icon.setAttribute("aria-hidden", "true");

        const heading = createTextElement(
            "h3",
            "",
            items.length === 0
                ? "Your essentials start here."
                : "No matching items found."
        );

        const description = createTextElement(
            "p",
            "",
            items.length === 0
                ? "Add your first item and let Restocker handle the reminders."
                : "Try another search term or change your filter."
        );

        emptyState.append(icon, heading, description);

        if (items.length === 0) {
            const addButton = createTextElement(
                "button",
                "button button-primary",
                "+ Add your first item"
            );

            addButton.type = "button";
            addButton.addEventListener("click", () => openModal());

            emptyState.appendChild(addButton);
        }

        itemsList.appendChild(emptyState);
        return;
    }

    visibleItems.forEach(item => {
        itemsList.appendChild(createItemCard(item));
    });
}


// ------------------------------------------
// 10. DASHBOARD
// ------------------------------------------

function renderDashboard() {
    totalCount.textContent = items.length;

    const dueSoon = items.filter(item => {
        const daysLeft = daysBetween(todayString(), item.reminderDate);

        return Number.isFinite(daysLeft) &&
               daysLeft >= 0 &&
               daysLeft <= 3;
    }).length;

    const overdue = items.filter(item =>
        reminderStatus(item) === "overdue"
    ).length;

    dueCount.textContent = dueSoon;
    overdueCount.textContent = overdue;

    const upcomingItems = items
        .filter(item => item.reminderDate >= todayString())
        .sort((a, b) =>
            a.reminderDate.localeCompare(b.reminderDate)
        );

    const overdueItems = items
        .filter(item => reminderStatus(item) === "overdue")
        .sort((a, b) =>
            a.reminderDate.localeCompare(b.reminderDate)
        );

    if (overdueItems.length > 0) {
        reminderSummary.textContent =
            `${overdueItems.length} item${overdueItems.length === 1 ? " is" : "s are"} overdue. ` +
            `Check ${overdueItems[0].name} first.`;
    } else if (upcomingItems.length > 0) {
        const nextItem = upcomingItems[0];

        reminderSummary.textContent =
            `Next up: ${nextItem.name}, ${statusLabel(nextItem).toLowerCase()}.`;
    } else if (items.length > 0) {
        reminderSummary.textContent =
            "All your reminders are in the past. Update your items to plan ahead.";
    } else {
        reminderSummary.textContent =
            "Add your essentials to start tracking reminders.";
    }
}

function renderApp() {
    renderDashboard();
    renderItems();
}


// ------------------------------------------
// 11. BROWSER NOTIFICATIONS
// ------------------------------------------

function getNotifiedRecords() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(NOTIFIED_KEY) || "{}"
        );

        return saved && typeof saved === "object" &&
               !Array.isArray(saved)
            ? saved
            : {};
    } catch {
        return {};
    }
}

function checkReminders() {
    if (!("Notification" in window)) {
        return;
    }

    if (Notification.permission !== "granted") {
        return;
    }

    const notifiedRecords = getNotifiedRecords();
    const today = todayString();
    let recordsChanged = false;

    items.forEach(item => {
        if (item.reminderDate > today) {
            return;
        }

        // One notification per item per reminder date.
        const notificationKey = `${item.id}:${item.reminderDate}`;

        if (notifiedRecords[notificationKey]) {
            return;
        }

        const daysLate = daysBetween(item.reminderDate, today);

        const message = daysLate === 0
            ? `${item.name} is due for restocking today.`
            : `${item.name} was due ${daysLate} day${daysLate === 1 ? "" : "s"} ago.`;

        try {
            const notification = new Notification("Restocker reminder", {
                body: message,
                tag: notificationKey
            });

            notification.onclick = () => {
                window.focus();
                document.getElementById("items-section")
                    .scrollIntoView({ behavior: "smooth" });

                notification.close();
            };

            notifiedRecords[notificationKey] = true;
            recordsChanged = true;
        } catch (error) {
            console.error("Notification could not be displayed:", error);
        }
    });

    if (recordsChanged) {
        try {
            localStorage.setItem(
                NOTIFIED_KEY,
                JSON.stringify(notifiedRecords)
            );
        } catch (error) {
            console.error("Could not save notification history:", error);
        }
    }
}

enableNotificationsButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
        showToast("This browser does not support notifications.");
        return;
    }

    if (Notification.permission === "granted") {
        showToast("Notifications are already enabled.");
        checkReminders();
        return;
    }

    if (Notification.permission === "denied") {
        showToast(
            "Notifications are blocked. Allow them in your browser settings."
        );
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            showToast("Notifications enabled!");
            checkReminders();
        } else {
            showToast("Notification permission was not granted.");
        }
    } catch (error) {
        console.error("Notification permission error:", error);
        showToast("Couldn't enable notifications.");
    }
});


// ------------------------------------------
// 12. SEARCH EVENTS
// ------------------------------------------

searchInput.addEventListener("input", renderItems);
filterSelect.addEventListener("change", renderItems);


// ------------------------------------------
// 13. INITIALIZE APP
// ------------------------------------------

renderApp();
checkReminders();

// Refresh reminder status when the date changes or
// when the user returns to the browser tab.
setInterval(() => {
    renderApp();
    checkReminders();
}, 60000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        renderApp();
        checkReminders();
    }
});

window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
        items = loadItems();
        renderApp();
    }
});
