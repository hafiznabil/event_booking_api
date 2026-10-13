const API_BASE = "http://localhost/event_booking_api/api";


// ==========================================
// CHECK LOGIN + JWT
// ==========================================

let user = null;

try {

    const storedUser =
        localStorage.getItem("user");

    if (storedUser) {
        user = JSON.parse(storedUser);
    }

} catch (error) {

    localStorage.removeItem("user");
}


const token =
    localStorage.getItem("token");


if (!user || !token) {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "login.html";
}


if (
    user &&
    user.role !== "organiser"
) {

    alert("Access denied. Organiser only.");

    window.location.href = "login.html";
}


// ==========================================
// DISPLAY ORGANISER NAME
// ==========================================

const organiserName =
    document.getElementById("organiserName");

if (organiserName && user) {
    organiserName.textContent = user.name;
}


// ==========================================
// JWT AUTH HEADERS
// ==========================================

function getAuthHeaders(includeJSON = false) {

    const headers = {
        "Authorization": `Bearer ${token}`
    };

    if (includeJSON) {

        headers["Content-Type"] =
            "application/json";
    }

    return headers;
}


// ==========================================
// ELEMENTS
// ==========================================

const eventsContainer =
    document.getElementById("eventsContainer");

const eventFormSection =
    document.getElementById("eventFormSection");

const eventForm =
    document.getElementById("eventForm");

const formTitle =
    document.getElementById("formTitle");

const messageBox =
    document.getElementById("messageBox");

const eventIdInput =
    document.getElementById("eventId");

const eventNameInput =
    document.getElementById("eventName");

const descriptionInput =
    document.getElementById("description");

const eventDateInput =
    document.getElementById("eventDate");

const eventTimeInput =
    document.getElementById("eventTime");

const ticketPriceInput =
    document.getElementById("ticketPrice");

const totalTicketsInput =
    document.getElementById("totalTickets");

const venueIdInput =
    document.getElementById("venueId");

const statusInput =
    document.getElementById("status");


let organiserEvents = [];


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );

            if (!confirmLogout) {
                return;
            }


            localStorage.removeItem("user");

            localStorage.removeItem("token");

            localStorage.removeItem(
                "loggedInUser"
            );


            window.location.href =
                "login.html";
        }
    );
}


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
    message,
    type = "success"
) {

    if (!messageBox) {
        return;
    }


    messageBox.innerHTML = `
        <div class="${
            type === "success"
                ? "success-message"
                : "error-message"
        }">
            ${escapeHTML(message)}
        </div>
    `;


    setTimeout(
        function () {

            messageBox.innerHTML = "";

        },
        3500
    );
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ==========================================
// HANDLE AUTH ERROR
// ==========================================

function handleAuthError(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        alert(
            "Your login session is invalid or expired. Please login again."
        );

        window.location.href =
            "login.html";

        return true;
    }

    return false;
}


// ==========================================
// LOAD VENUES
// ==========================================

async function loadVenues() {

    try {

        const response =
            await fetch(
                `${API_BASE}/venues.php`,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );


        if (handleAuthError(response)) {
            return;
        }


        const result =
            await response.json();


        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "Unable to load venues."
            );
        }


        let venues = [];


        if (Array.isArray(result)) {

            venues = result;

        } else if (
            Array.isArray(result.data)
        ) {

            venues = result.data;
        }


        if (!venueIdInput) {
            return;
        }


        venueIdInput.innerHTML = `
            <option value="">
                Select Venue
            </option>
        `;


        venues.forEach(
            function (venue) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    venue.venue_id;


                option.textContent =
                    `${venue.venue_name} - ${venue.location}`;


                venueIdInput.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.error(
            "Venue error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load venues.",
            "error"
        );
    }
}


// ==========================================
// LOAD ORGANISER EVENTS
// ==========================================

async function loadEvents() {

    try {

        if (eventsContainer) {

            eventsContainer.innerHTML =
                "<p>Loading events...</p>";
        }


        const response =
            await fetch(
                `${API_BASE}/events.php?organiser_id=${user.user_id}`,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );


        if (handleAuthError(response)) {
            return;
        }


        const result =
            await response.json();


        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "Unable to load events."
            );
        }


        if (Array.isArray(result)) {

            organiserEvents =
                result;

        } else if (
            Array.isArray(result.data)
        ) {

            organiserEvents =
                result.data;

        } else {

            organiserEvents = [];
        }


        displayEvents();

    } catch (error) {

        console.error(
            "Event error:",
            error
        );


        organiserEvents = [];


        if (eventsContainer) {

            eventsContainer.innerHTML = `
                <p style="color:red;">
                    ${escapeHTML(
                        error.message ||
                        "Unable to load events."
                    )}
                </p>
            `;
        }
    }
}


// ==========================================
// DISPLAY EVENTS
// ==========================================

function displayEvents() {

    if (!eventsContainer) {
        return;
    }


    if (
        organiserEvents.length === 0
    ) {

        eventsContainer.innerHTML = `
            <p>No events created yet.</p>
        `;

        return;
    }


    eventsContainer.innerHTML = `
        <div class="organiser-events-grid">

            ${organiserEvents.map(
                function (event) {

                    const status =
                        String(
                            event.status ||
                            "unknown"
                        ).toLowerCase();


                    return `

                    <div class="organiser-event-card">

                        <div class="event-card-top">

                            <span
                                class="status-badge status-${escapeHTML(status)}"
                            >
                                ${escapeHTML(
                                    status.toUpperCase()
                                )}
                            </span>

                            <span class="event-number">
                                Event #${escapeHTML(
                                    String(
                                        event.event_id
                                    )
                                )}
                            </span>

                        </div>


                        <h3>
                            ${escapeHTML(
                                event.event_name ||
                                "-"
                            )}
                        </h3>


                        <p class="event-description">
                            ${escapeHTML(
                                event.description ||
                                "No description"
                            )}
                        </p>


                        <div class="event-info-grid">

                            <div>
                                <span>Date</span>

                                <strong>
                                    ${escapeHTML(
                                        event.event_date ||
                                        "-"
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>Time</span>

                                <strong>
                                    ${escapeHTML(
                                        event.event_time ||
                                        "-"
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>Venue</span>

                                <strong>
                                    ${escapeHTML(
                                        event.venue_name ||
                                        "-"
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>Location</span>

                                <strong>
                                    ${escapeHTML(
                                        event.location ||
                                        "-"
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    Ticket Price
                                </span>

                                <strong>
                                    RM ${Number(
                                        event.ticket_price ||
                                        0
                                    ).toFixed(2)}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    Available Tickets
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        String(
                                            event.available_tickets ??
                                            0
                                        )
                                    )}
                                </strong>
                            </div>

                        </div>


                        <button
                            class="primary-btn event-edit-btn"
                            onclick="editEvent(${Number(
                                event.event_id
                            )})"
                        >
                            Edit Event
                        </button>

                    </div>

                    `;
                }
            ).join("")}

        </div>
    `;
}


// ==========================================
// ADD EVENT BUTTON
// ==========================================

const addEventBtn =
    document.getElementById(
        "addEventBtn"
    );


if (addEventBtn) {

    addEventBtn.addEventListener(
        "click",
        function () {

            resetForm();


            if (formTitle) {

                formTitle.textContent =
                    "Add New Event";
            }


            if (eventFormSection) {

                eventFormSection.style.display =
                    "block";


                eventFormSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        }
    );
}


// ==========================================
// CANCEL FORM
// ==========================================

const cancelFormBtn =
    document.getElementById(
        "cancelFormBtn"
    );


if (cancelFormBtn) {

    cancelFormBtn.addEventListener(
        "click",
        function () {

            resetForm();


            if (eventFormSection) {

                eventFormSection.style.display =
                    "none";
            }
        }
    );
}


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {

    if (eventForm) {
        eventForm.reset();
    }


    if (eventIdInput) {
        eventIdInput.value = "";
    }


    if (statusInput) {

        statusInput.value =
            "upcoming";
    }
}


// ==========================================
// EDIT EVENT
// ==========================================

function editEvent(eventId) {

    const event =
        organiserEvents.find(
            function (item) {

                return (
                    Number(item.event_id) ===
                    Number(eventId)
                );
            }
        );


    if (!event) {

        showMessage(
            "Event not found.",
            "error"
        );

        return;
    }


    eventIdInput.value =
        event.event_id;


    eventNameInput.value =
        event.event_name || "";


    descriptionInput.value =
        event.description || "";


    eventDateInput.value =
        event.event_date || "";


    eventTimeInput.value =
        String(
            event.event_time ||
            ""
        ).substring(0, 5);


    ticketPriceInput.value =
        event.ticket_price;


    totalTicketsInput.value =
        event.total_tickets;


    venueIdInput.value =
        String(
            event.venue_id
        );


    statusInput.value =
        event.status;


    formTitle.textContent =
        "Edit Event";


    eventFormSection.style.display =
        "block";


    eventFormSection.scrollIntoView({
        behavior: "smooth"
    });
}


// ==========================================
// SAVE EVENT
// ==========================================

if (eventForm) {

    eventForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const eventId =
                eventIdInput.value;


            const totalTickets =
                Number(
                    totalTicketsInput.value
                );


            const ticketPrice =
                Number(
                    ticketPriceInput.value
                );


            const venueId =
                Number(
                    venueIdInput.value
                );


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !eventNameInput.value.trim()
            ) {

                showMessage(
                    "Event name is required.",
                    "error"
                );

                return;
            }


            if (!eventDateInput.value) {

                showMessage(
                    "Event date is required.",
                    "error"
                );

                return;
            }


            if (!eventTimeInput.value) {

                showMessage(
                    "Event time is required.",
                    "error"
                );

                return;
            }


            if (
                !Number.isFinite(
                    ticketPrice
                ) ||
                ticketPrice < 0
            ) {

                showMessage(
                    "Ticket price must be 0 or greater.",
                    "error"
                );

                return;
            }


            if (
                !Number.isInteger(
                    totalTickets
                ) ||
                totalTickets <= 0
            ) {

                showMessage(
                    "Total tickets must be greater than 0.",
                    "error"
                );

                return;
            }


            if (
                !Number.isInteger(
                    venueId
                ) ||
                venueId <= 0
            ) {

                showMessage(
                    "Please select a venue.",
                    "error"
                );

                return;
            }


            // ==================================
            // EVENT DATA
            // ==================================

            const eventData = {

                event_name:
                    eventNameInput.value.trim(),

                description:
                    descriptionInput.value.trim(),

                event_date:
                    eventDateInput.value,

                event_time:
                    eventTimeInput.value,

                ticket_price:
                    ticketPrice,

                total_tickets:
                    totalTickets,

                organiser_id:
                    Number(user.user_id),

                venue_id:
                    venueId,

                status:
                    statusInput.value
            };


            // ==================================
            // AVAILABLE TICKETS
            // ==================================

            if (eventId) {

                const currentEvent =
                    organiserEvents.find(
                        function (item) {

                            return (
                                Number(
                                    item.event_id
                                ) ===
                                Number(eventId)
                            );
                        }
                    );


                if (!currentEvent) {

                    showMessage(
                        "Event not found.",
                        "error"
                    );

                    return;
                }


                const oldTotal =
                    Number(
                        currentEvent.total_tickets
                    );


                const oldAvailable =
                    Number(
                        currentEvent.available_tickets
                    );


                const bookedTickets =
                    oldTotal -
                    oldAvailable;


                const newAvailable =
                    totalTickets -
                    bookedTickets;


                if (newAvailable < 0) {

                    showMessage(
                        `Total tickets cannot be lower than ${bookedTickets} because ${bookedTickets} ticket(s) are already booked.`,
                        "error"
                    );

                    return;
                }


                eventData.available_tickets =
                    newAvailable;

            } else {

                eventData.available_tickets =
                    totalTickets;
            }


            // ==================================
            // SEND REQUEST
            // ==================================

            try {

                let url =
                    `${API_BASE}/events.php`;


                let method =
                    "POST";


                if (eventId) {

                    url +=
                        `?id=${eventId}`;

                    method =
                        "PUT";
                }


                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers:
                                getAuthHeaders(
                                    true
                                ),

                            body:
                                JSON.stringify(
                                    eventData
                                )
                        }
                    );


                if (
                    handleAuthError(
                        response
                    )
                ) {
                    return;
                }


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    result.success === false
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to save event."
                    );
                }


                // ==================================
                // SUCCESS
                // ==================================

                if (eventId) {

                    showMessage(
                        "Event updated successfully."
                    );

                } else {

                    showMessage(
                        "Event created successfully."
                    );
                }


                resetForm();


                eventFormSection.style.display =
                    "none";


                await loadEvents();

            } catch (error) {

                console.error(
                    "Save event error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to connect to the server.",
                    "error"
                );
            }
        }
    );
}


// ==========================================
// START PAGE
// ==========================================

async function startPage() {

    await loadVenues();

    await loadEvents();
}


startPage();