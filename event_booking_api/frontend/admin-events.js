// =====================================================
// ADMIN EVENTS - JWT VERSION
// =====================================================

const API_URL =
    "http://localhost/event_booking_api/api/events.php";


// =====================================================
// GET LOGGED-IN USER + JWT TOKEN
// =====================================================

const userData = localStorage.getItem("user");
const token = localStorage.getItem("token");

let user = null;

try {
    user = userData ? JSON.parse(userData) : null;
} catch (error) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
}


// =====================================================
// CHECK LOGIN
// =====================================================

if (!user || !token) {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "login.html";

} else if (user.role !== "admin") {

    window.location.href = "events.html";
}


// =====================================================
// JWT AUTH HEADERS
// =====================================================

function getAuthHeaders(includeContentType = false) {

    const jwtToken = localStorage.getItem("token");

    if (!jwtToken) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href = "login.html";

        return {};
    }

    const headers = {
        "Authorization": `Bearer ${jwtToken}`
    };

    if (includeContentType) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}


// =====================================================
// ELEMENTS
// =====================================================

const userInfo =
    document.getElementById("userInfo");

const eventsContainer =
    document.getElementById("eventsContainer");

const loading =
    document.getElementById("loading");

const message =
    document.getElementById("message");

const addEventBtn =
    document.getElementById("addEventBtn");

const eventFormContainer =
    document.getElementById("eventFormContainer");

const eventForm =
    document.getElementById("eventForm");

const closeFormBtn =
    document.getElementById("closeFormBtn");

const cancelFormBtn =
    document.getElementById("cancelFormBtn");

const formTitle =
    document.getElementById("formTitle");


let currentAvailableTickets = null;
let originalTotalTickets = null;


// =====================================================
// DISPLAY ADMIN INFO
// =====================================================

if (userInfo && user) {

    userInfo.innerHTML = `
        <strong>${escapeHTML(user.name)}</strong>
        <span>${escapeHTML(capitalize(user.role))}</span>
    `;
}


// =====================================================
// HANDLE AUTHENTICATION FAILURE
// =====================================================

function handleAuthenticationFailure(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");

        alert(
            "Your login session is invalid or expired. Please login again."
        );

        window.location.href = "login.html";

        return true;
    }

    return false;
}


// =====================================================
// LOAD EVENTS
// =====================================================

async function loadEvents() {

    if (loading) {
        loading.style.display = "block";
    }

    if (eventsContainer) {
        eventsContainer.innerHTML = "";
    }

    try {

        const response = await fetch(
            API_URL,
            {
                method: "GET",
                headers: getAuthHeaders(false)
            }
        );


        // Check expired / invalid JWT
        if (handleAuthenticationFailure(response)) {
            return;
        }


        const result =
            await response.json();


        if (loading) {
            loading.style.display = "none";
        }


        if (
            !response.ok ||
            result.success === false
        ) {

            showMessage(
                result.message ||
                "Failed to load events.",
                "error"
            );

            return;
        }


        let events = [];


        if (Array.isArray(result)) {

            events = result;

        } else if (
            result &&
            Array.isArray(result.data)
        ) {

            events = result.data;
        }


        if (events.length === 0) {

            eventsContainer.innerHTML = `
                <div class="empty-state">
                    No events found.
                </div>
            `;

            return;
        }


        events.forEach(event => {

            const card =
                document.createElement("div");

            card.className =
                "admin-event-card";


            const status =
                String(
                    event.status || "upcoming"
                ).toLowerCase();


            card.innerHTML = `

                <div class="admin-event-top">

                    <span class="status-badge ${escapeHTML(status)}">
                        ${escapeHTML(status.toUpperCase())}
                    </span>

                    <span class="event-id">
                        Event #${escapeHTML(
                            String(event.event_id)
                        )}
                    </span>

                </div>


                <h3>
                    ${escapeHTML(event.event_name)}
                </h3>


                <p class="event-description">
                    ${escapeHTML(
                        event.description ||
                        "No description"
                    )}
                </p>


                <div class="admin-event-details">

                    <div>
                        <span>Date</span>
                        <strong>
                            ${escapeHTML(
                                event.event_date || "-"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Time</span>
                        <strong>
                            ${escapeHTML(
                                event.event_time || "-"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Venue</span>
                        <strong>
                            ${escapeHTML(
                                event.venue_name ||
                                "N/A"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Location</span>
                        <strong>
                            ${escapeHTML(
                                event.location ||
                                "N/A"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Ticket Price</span>
                        <strong>
                            RM ${Number(
                                event.ticket_price || 0
                            ).toFixed(2)}
                        </strong>
                    </div>


                    <div>
                        <span>Available Tickets</span>

                        <strong>
                            ${escapeHTML(
                                String(
                                    event.available_tickets ?? 0
                                )
                            )}
                            /
                            ${escapeHTML(
                                String(
                                    event.total_tickets ?? 0
                                )
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Organiser</span>
                        <strong>
                            ${escapeHTML(
                                event.organiser_name ||
                                "N/A"
                            )}
                        </strong>
                    </div>

                </div>


                <div class="admin-event-actions">

                    <button
                        class="edit-btn"
                        onclick="editEvent(${Number(
                            event.event_id
                        )})"
                    >
                        Edit
                    </button>


                    <button
                        class="delete-btn"
                        onclick="deleteEvent(${Number(
                            event.event_id
                        )})"
                    >
                        Delete
                    </button>

                </div>
            `;


            eventsContainer.appendChild(card);
        });


    } catch (error) {

        if (loading) {
            loading.style.display = "none";
        }

        console.error(
            "Load events error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );
    }
}


// =====================================================
// OPEN ADD EVENT FORM
// =====================================================

if (addEventBtn) {

    addEventBtn.addEventListener(
        "click",
        () => {

            eventForm.reset();

            document
                .getElementById("eventId")
                .value = "";

            currentAvailableTickets = null;
            originalTotalTickets = null;

            formTitle.textContent =
                "Add New Event";

            eventFormContainer.style.display =
                "block";

            eventFormContainer.scrollIntoView({
                behavior: "smooth"
            });
        }
    );
}


// =====================================================
// CLOSE FORM
// =====================================================

function closeForm() {

    if (eventForm) {
        eventForm.reset();
    }

    const eventIdElement =
        document.getElementById("eventId");

    if (eventIdElement) {
        eventIdElement.value = "";
    }

    currentAvailableTickets = null;
    originalTotalTickets = null;

    if (eventFormContainer) {
        eventFormContainer.style.display =
            "none";
    }
}


if (closeFormBtn) {

    closeFormBtn.addEventListener(
        "click",
        closeForm
    );
}


if (cancelFormBtn) {

    cancelFormBtn.addEventListener(
        "click",
        closeForm
    );
}


// =====================================================
// SAVE EVENT - POST / PUT
// =====================================================

if (eventForm) {

    eventForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const eventId =
                document
                    .getElementById("eventId")
                    .value;


            const newTotalTickets =
                Number(
                    document
                        .getElementById(
                            "totalTickets"
                        )
                        .value
                );


            let availableTickets =
                newTotalTickets;


            // ==========================================
            // PRESERVE SOLD TICKETS WHEN EDITING
            // ==========================================

            if (
                eventId &&
                currentAvailableTickets !== null &&
                originalTotalTickets !== null
            ) {

                const soldTickets =
                    originalTotalTickets -
                    currentAvailableTickets;


                availableTickets =
                    newTotalTickets -
                    soldTickets;


                if (availableTickets < 0) {

                    showMessage(
                        `Total tickets cannot be lower than tickets already sold (${soldTickets}).`,
                        "error"
                    );

                    return;
                }
            }


            // ==========================================
            // EVENT DATA
            // ==========================================

            const eventData = {

                event_name:
                    document
                        .getElementById(
                            "eventName"
                        )
                        .value
                        .trim(),

                description:
                    document
                        .getElementById(
                            "description"
                        )
                        .value
                        .trim(),

                event_date:
                    document
                        .getElementById(
                            "eventDate"
                        )
                        .value,

                event_time:
                    document
                        .getElementById(
                            "eventTime"
                        )
                        .value,

                ticket_price:
                    Number(
                        document
                            .getElementById(
                                "ticketPrice"
                            )
                            .value
                    ),

                total_tickets:
                    newTotalTickets,

                available_tickets:
                    availableTickets,

                venue_id:
                    Number(
                        document
                            .getElementById(
                                "venueId"
                            )
                            .value
                    ),

                organiser_id:
                    Number(
                        document
                            .getElementById(
                                "organiserId"
                            )
                            .value
                    ),

                status:
                    document
                        .getElementById(
                            "status"
                        )
                        .value
            };


            // ==========================================
            // FRONTEND VALIDATION
            // ==========================================

            if (!eventData.event_name) {

                showMessage(
                    "Event name is required.",
                    "error"
                );

                return;
            }


            if (!eventData.event_date) {

                showMessage(
                    "Event date is required.",
                    "error"
                );

                return;
            }


            if (!eventData.event_time) {

                showMessage(
                    "Event time is required.",
                    "error"
                );

                return;
            }


            if (
                !Number.isFinite(
                    eventData.ticket_price
                ) ||
                eventData.ticket_price < 0
            ) {

                showMessage(
                    "Invalid ticket price.",
                    "error"
                );

                return;
            }


            if (
                !Number.isInteger(
                    eventData.total_tickets
                ) ||
                eventData.total_tickets <= 0
            ) {

                showMessage(
                    "Total tickets must be greater than 0.",
                    "error"
                );

                return;
            }


            if (
                !Number.isInteger(
                    eventData.venue_id
                ) ||
                eventData.venue_id <= 0
            ) {

                showMessage(
                    "Invalid venue ID.",
                    "error"
                );

                return;
            }


            if (
                !Number.isInteger(
                    eventData.organiser_id
                ) ||
                eventData.organiser_id <= 0
            ) {

                showMessage(
                    "Invalid organiser ID.",
                    "error"
                );

                return;
            }


            try {

                let url = API_URL;
                let method = "POST";


                if (eventId) {

                    url +=
                        `?id=${encodeURIComponent(
                            eventId
                        )}`;

                    method = "PUT";
                }


                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers:
                                getAuthHeaders(true),

                            body:
                                JSON.stringify(
                                    eventData
                                )
                        }
                    );


                if (
                    handleAuthenticationFailure(
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

                    showMessage(
                        result.message ||
                        "Failed to save event.",
                        "error"
                    );

                    return;
                }


                showMessage(
                    eventId
                        ? "Event updated successfully."
                        : "Event created successfully.",
                    "success"
                );


                closeForm();

                await loadEvents();


            } catch (error) {

                console.error(
                    "Save event error:",
                    error
                );

                showMessage(
                    "Unable to connect to the server.",
                    "error"
                );
            }
        }
    );
}


// =====================================================
// EDIT EVENT
// =====================================================

async function editEvent(id) {

    if (
        !Number.isInteger(Number(id)) ||
        Number(id) <= 0
    ) {

        showMessage(
            "Invalid event ID.",
            "error"
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}?id=${encodeURIComponent(
                    id
                )}`,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders(false)
                }
            );


        if (
            handleAuthenticationFailure(
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

            showMessage(
                result.message ||
                "Event not found.",
                "error"
            );

            return;
        }


        const event =
            result.data;


        if (!event) {

            showMessage(
                "Event not found.",
                "error"
            );

            return;
        }


        currentAvailableTickets =
            Number(
                event.available_tickets
            );


        originalTotalTickets =
            Number(
                event.total_tickets
            );


        document
            .getElementById("eventId")
            .value =
            event.event_id;


        document
            .getElementById("eventName")
            .value =
            event.event_name || "";


        document
            .getElementById("description")
            .value =
            event.description || "";


        document
            .getElementById("eventDate")
            .value =
            event.event_date || "";


        document
            .getElementById("eventTime")
            .value =
            event.event_time
                ? String(
                    event.event_time
                ).substring(0, 5)
                : "";


        document
            .getElementById("ticketPrice")
            .value =
            event.ticket_price ?? "";


        document
            .getElementById("totalTickets")
            .value =
            event.total_tickets ?? "";


        document
            .getElementById("venueId")
            .value =
            event.venue_id ?? "";


        document
            .getElementById("organiserId")
            .value =
            event.organiser_id ?? "";


        document
            .getElementById("status")
            .value =
            event.status || "upcoming";


        formTitle.textContent =
            "Edit Event";


        eventFormContainer.style.display =
            "block";


        eventFormContainer.scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Edit event error:",
            error
        );

        showMessage(
            "Unable to load event information.",
            "error"
        );
    }
}


// =====================================================
// DELETE EVENT
// =====================================================

async function deleteEvent(id) {

    if (
        !Number.isInteger(Number(id)) ||
        Number(id) <= 0
    ) {

        showMessage(
            "Invalid event ID.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this event?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}?id=${encodeURIComponent(
                    id
                )}`,
                {
                    method: "DELETE",

                    headers:
                        getAuthHeaders(false)
                }
            );


        if (
            handleAuthenticationFailure(
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

            showMessage(
                result.message ||
                "Failed to delete event.",
                "error"
            );

            return;
        }


        showMessage(
            "Event deleted successfully.",
            "success"
        );


        await loadEvents();


    } catch (error) {

        console.error(
            "Delete event error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );
    }
}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(text, type) {

    if (!message) {
        return;
    }


    message.innerHTML = `
        <div class="message ${escapeHTML(type)}">
            ${escapeHTML(text)}
        </div>
    `;


    setTimeout(
        () => {

            message.innerHTML = "";

        },
        4000
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// =====================================================
// CAPITALIZE
// =====================================================

function capitalize(text) {

    if (!text) {
        return "";
    }

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            // Remove login information
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


// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadEvents();

    }
);