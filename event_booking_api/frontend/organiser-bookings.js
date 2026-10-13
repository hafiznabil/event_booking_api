const API_BASE = "http://localhost/event_booking_api/api";

let currentUser = null;
let token = null;

let myEvents = [];
let allBookings = [];


// =====================================================
// AUTH HEADERS - JWT
// =====================================================

function getAuthHeaders() {

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}


// =====================================================
// START PAGE
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Get saved login information
    const userData = localStorage.getItem("user");
    token = localStorage.getItem("token");


    // ==============================================
    // CHECK LOGIN + TOKEN
    // ==============================================

    if (!userData || !token) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href = "login.html";
        return;
    }


    // ==============================================
    // PARSE USER
    // ==============================================

    try {

        currentUser = JSON.parse(userData);

    } catch (error) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href = "login.html";
        return;
    }


    // ==============================================
    // ORGANISER ONLY
    // ==============================================

    if (currentUser.role !== "organiser") {

        alert("Access denied. Organiser only.");

        window.location.href = "login.html";
        return;
    }


    // ==============================================
    // DISPLAY ORGANISER NAME
    // ==============================================

    const organiserName =
        document.getElementById("organiserName");

    if (organiserName) {

        organiserName.textContent =
            currentUser.name;
    }


    // ==============================================
    // LOGOUT BUTTON
    // ==============================================

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    // ==============================================
    // EVENT FILTER
    // ==============================================

    const eventFilter =
        document.getElementById("eventFilter");

    if (eventFilter) {

        eventFilter.addEventListener(
            "change",
            displayBookings
        );
    }


    // ==============================================
    // STATUS FILTER
    // ==============================================

    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            displayBookings
        );
    }


    // ==============================================
    // LOAD DATA
    // ==============================================

    await loadOrganiserEvents();
});


// =====================================================
// LOAD ORGANISER EVENTS
// =====================================================

async function loadOrganiserEvents() {

    try {

        const response = await fetch(
            `${API_BASE}/events.php?organiser_id=${currentUser.user_id}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );


        let result;

        try {

            result = await response.json();

        } catch (jsonError) {

            throw new Error(
                "Invalid response received from events API."
            );
        }


        // ==============================================
        // CHECK RESPONSE
        // ==============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            // JWT expired / invalid
            if (response.status === 401) {

                handleAuthenticationError(
                    result.message ||
                    "Authentication failed."
                );

                return;
            }


            throw new Error(
                result.message ||
                "Failed to load organiser events."
            );
        }


        // ==============================================
        // GET EVENTS
        // ==============================================

        if (Array.isArray(result)) {

            myEvents = result;

        } else if (
            result &&
            Array.isArray(result.data)
        ) {

            myEvents = result.data;

        } else {

            myEvents = [];
        }


        // ==============================================
        // POPULATE EVENT FILTER
        // ==============================================

        populateEventFilter();


        // ==============================================
        // LOAD BOOKINGS
        // ==============================================

        await loadBookings();


    } catch (error) {

        console.error(
            "Organiser Events Error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load organiser events.",
            "error"
        );


        const container =
            document.getElementById(
                "bookingsContainer"
            );


        if (container) {

            container.innerHTML = `
                <div class="empty-bookings">

                    <h3>
                        Unable to Load Data
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Unable to load data."
                        )}
                    </p>

                </div>
            `;
        }
    }
}


// =====================================================
// POPULATE EVENT FILTER
// =====================================================

function populateEventFilter() {

    const select =
        document.getElementById(
            "eventFilter"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            All My Events
        </option>
    `;


    myEvents.forEach(event => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            event.event_id;


        option.textContent =
            `${event.event_name} (Event #${event.event_id})`;


        select.appendChild(option);
    });
}


// =====================================================
// LOAD BOOKINGS
// =====================================================

async function loadBookings() {

    const container =
        document.getElementById(
            "bookingsContainer"
        );


    if (container) {

        container.innerHTML =
            "<p>Loading bookings...</p>";
    }


    try {

        // ==============================================
        // JWT AUTHENTICATED REQUEST
        // ==============================================

        const response = await fetch(
            `${API_BASE}/bookings.php`,
            {
                method: "GET",

                headers: getAuthHeaders()
            }
        );


        let result;


        try {

            result =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Invalid response received from bookings API."
            );
        }


        // ==============================================
        // CHECK RESPONSE
        // ==============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            // JWT invalid / expired
            if (response.status === 401) {

                handleAuthenticationError(
                    result.message ||
                    "Authentication failed."
                );

                return;
            }


            throw new Error(
                result.message ||
                "Failed to load bookings."
            );
        }


        // ==============================================
        // GET BOOKINGS ARRAY
        // ==============================================

        let bookings = [];


        if (Array.isArray(result)) {

            bookings = result;

        } else if (
            result &&
            Array.isArray(result.data)
        ) {

            bookings =
                result.data;
        }


        // ==============================================
        // GET ORGANISER EVENT IDS
        // ==============================================

        const myEventIds =

            myEvents.map(event =>

                Number(
                    event.event_id
                )
            );


        // ==============================================
        // ORGANISER BOOKINGS ONLY
        // ==============================================

        allBookings =

            bookings.filter(
                booking =>

                    myEventIds.includes(
                        Number(
                            booking.event_id
                        )
                    )
            );


        // ==============================================
        // DISPLAY
        // ==============================================

        displayBookings();


    } catch (error) {

        console.error(
            "Bookings Error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load bookings.",
            "error"
        );


        updateStats([]);


        if (container) {

            container.innerHTML = `
                <div class="empty-bookings">

                    <h3>
                        Failed to Load Bookings
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Unable to load bookings."
                        )}
                    </p>

                </div>
            `;
        }
    }
}


// =====================================================
// DISPLAY BOOKINGS
// =====================================================

function displayBookings() {

    const container =
        document.getElementById(
            "bookingsContainer"
        );


    if (!container) {
        return;
    }


    const eventFilter =
        document.getElementById(
            "eventFilter"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const eventId =
        eventFilter
            ? eventFilter.value
            : "";


    const status =
        statusFilter
            ? statusFilter.value.toLowerCase()
            : "";


    let filteredBookings =
        [...allBookings];


    // ==============================================
    // FILTER BY EVENT
    // ==============================================

    if (eventId !== "") {

        filteredBookings =
            filteredBookings.filter(
                booking =>

                    Number(
                        booking.event_id
                    ) ===
                    Number(eventId)
            );
    }


    // ==============================================
    // FILTER BY STATUS
    // ==============================================

    if (status !== "") {

        filteredBookings =
            filteredBookings.filter(
                booking =>

                    String(
                        booking.booking_status || ""
                    ).toLowerCase() === status
            );
    }


    // ==============================================
    // UPDATE STATISTICS
    // ==============================================

    updateStats(
        filteredBookings
    );


    // ==============================================
    // NO BOOKINGS
    // ==============================================

    if (
        filteredBookings.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-bookings">

                <h3>
                    No Bookings Found
                </h3>

                <p>
                    There are currently no customer
                    bookings matching this filter.
                </p>

            </div>
        `;

        return;
    }


    // ==============================================
    // DISPLAY BOOKING CARDS
    // ==============================================

    container.innerHTML =

        filteredBookings
            .map(createBookingCard)
            .join("");
}


// =====================================================
// CREATE BOOKING CARD
// =====================================================

function createBookingCard(booking) {

    const bookingStatus =

        String(
            booking.booking_status ||
            "pending"
        ).toLowerCase();


    let statusClass =
        "pending";


    if (
        bookingStatus ===
        "confirmed"
    ) {

        statusClass =
            "confirmed";
    }


    if (
        bookingStatus ===
        "cancelled"
    ) {

        statusClass =
            "cancelled";
    }


    const eventName =

        booking.event_name ||

        `Event #${
            booking.event_id || "-"
        }`;


    const customerName =

        booking.customer_name ||

        `Customer #${
            booking.customer_id || "-"
        }`;


    const customerEmail =

        booking.customer_email ||

        booking.email ||

        "-";


    const eventDate =

        booking.event_date ||
        "-";


    const eventTime =

        booking.event_time ||
        "-";


    const quantity =

        Number(
            booking.quantity || 0
        );


    const totalAmount =

        Number(
            booking.total_amount || 0
        );


    const bookingDate =

        booking.booking_date ||

        booking.created_at ||

        "-";


    return `

        <div class="organiser-booking-card">

            <div class="booking-card-top">

                <span
                    class="booking-status ${statusClass}"
                >

                    ${escapeHtml(
                        bookingStatus.toUpperCase()
                    )}

                </span>


                <span class="booking-number">

                    Booking #${escapeHtml(
                        booking.booking_id
                    )}

                </span>

            </div>


            <h3>
                ${escapeHtml(
                    eventName
                )}
            </h3>


            <div class="booking-customer">

                <strong>
                    ${escapeHtml(
                        customerName
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        customerEmail
                    )}
                </span>

            </div>


            <div class="booking-info-grid">

                <div>

                    <span>
                        Event Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            eventDate
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Event Time
                    </span>

                    <strong>
                        ${escapeHtml(
                            eventTime
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Quantity
                    </span>

                    <strong>
                        ${quantity} Ticket(s)
                    </strong>

                </div>


                <div>

                    <span>
                        Total Amount
                    </span>

                    <strong>
                        RM ${totalAmount.toFixed(2)}
                    </strong>

                </div>

            </div>


            <div class="booking-date">

                Booking Date:

                <strong>
                    ${escapeHtml(
                        bookingDate
                    )}
                </strong>

            </div>

        </div>
    `;
}


// =====================================================
// UPDATE STATISTICS
// =====================================================

function updateStats(bookings) {

    const confirmed =

        bookings.filter(
            booking =>

                String(
                    booking.booking_status || ""
                ).toLowerCase()
                === "confirmed"
        );


    const cancelled =

        bookings.filter(
            booking =>

                String(
                    booking.booking_status || ""
                ).toLowerCase()
                === "cancelled"
        );


    // ==============================================
    // REVENUE FROM CONFIRMED BOOKINGS
    // ==============================================

    const revenue =

        confirmed.reduce(

            (total, booking) => {

                return total +

                    Number(
                        booking.total_amount || 0
                    );

            },

            0
        );


    const totalBookingsElement =
        document.getElementById(
            "totalBookings"
        );


    const confirmedElement =
        document.getElementById(
            "confirmedBookings"
        );


    const cancelledElement =
        document.getElementById(
            "cancelledBookings"
        );


    const revenueElement =
        document.getElementById(
            "totalRevenue"
        );


    if (totalBookingsElement) {

        totalBookingsElement.textContent =
            bookings.length;
    }


    if (confirmedElement) {

        confirmedElement.textContent =
            confirmed.length;
    }


    if (cancelledElement) {

        cancelledElement.textContent =
            cancelled.length;
    }


    if (revenueElement) {

        revenueElement.textContent =
            `RM ${revenue.toFixed(2)}`;
    }
}


// =====================================================
// HANDLE JWT AUTHENTICATION ERROR
// =====================================================

function handleAuthenticationError(
    errorMessage
) {

    console.error(
        "Authentication Error:",
        errorMessage
    );


    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "token"
    );


    alert(
        "Your login session is invalid or expired. Please login again."
    );


    window.location.href =
        "login.html";
}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    message,
    type = "success"
) {

    const box =
        document.getElementById(
            "messageBox"
        );


    if (!box) {
        return;
    }


    box.innerHTML = `
        <div class="message ${type}">
            ${escapeHtml(message)}
        </div>
    `;


    setTimeout(
        () => {

            box.innerHTML = "";

        },
        4000
    );
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    const confirmLogout =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmLogout) {
        return;
    }


    // Remove user + JWT
    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


// =====================================================
// SECURITY - ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}