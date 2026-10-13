const API_BASE = "http://localhost/event_booking_api/api";

// ==========================================
// GET LOGIN DATA
// ==========================================

let user = null;
const token = localStorage.getItem("token");

try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
        user = JSON.parse(storedUser);
    }
} catch (error) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
}


// ==========================================
// CHECK LOGIN + TOKEN
// ==========================================

if (!user || !token) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "login.html";
}


// ==========================================
// CHECK ORGANISER ROLE
// ==========================================

if (user && user.role !== "organiser") {

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

function getAuthHeaders() {

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            const confirmLogout = confirm(
                "Are you sure you want to logout?"
            );

            if (!confirmLogout) {
                return;
            }

            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("loggedInUser");

            window.location.href =
                "login.html";
        }
    );
}


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        // ==================================
        // GET ORGANISER EVENTS
        // ==================================

        const eventResponse = await fetch(
            `${API_BASE}/events.php?organiser_id=${user.user_id}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        const eventResult =
            await eventResponse.json();


        // ==================================
        // HANDLE INVALID / EXPIRED JWT
        // ==================================

        if (
            eventResponse.status === 401 ||
            eventResponse.status === 403
        ) {

            localStorage.removeItem("user");
            localStorage.removeItem("token");

            alert(
                eventResult.message ||
                "Your session has expired. Please login again."
            );

            window.location.href =
                "login.html";

            return;
        }


        if (
            !eventResponse.ok ||
            eventResult.success === false
        ) {

            throw new Error(
                eventResult.message ||
                "Failed to load events."
            );
        }


        // ==================================
        // EXTRACT EVENTS
        // ==================================

        let events = [];

        if (Array.isArray(eventResult)) {

            events = eventResult;

        } else if (
            eventResult &&
            Array.isArray(eventResult.data)
        ) {

            events = eventResult.data;
        }


        // ==================================
        // TOTAL EVENTS
        // ==================================

        const totalEvents =
            document.getElementById(
                "totalEvents"
            );

        if (totalEvents) {

            totalEvents.textContent =
                events.length;
        }


        // ==================================
        // DISPLAY RECENT EVENTS
        // ==================================

        displayRecentEvents(events);


        // ==================================
        // GET ORGANISER BOOKINGS
        // ==================================

        const bookingResponse =
            await fetch(
                `${API_BASE}/bookings.php`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );

        const bookingResult =
            await bookingResponse.json();


        // ==================================
        // HANDLE INVALID / EXPIRED JWT
        // ==================================

        if (
            bookingResponse.status === 401 ||
            bookingResponse.status === 403
        ) {

            localStorage.removeItem("user");
            localStorage.removeItem("token");

            alert(
                bookingResult.message ||
                "Your session has expired. Please login again."
            );

            window.location.href =
                "login.html";

            return;
        }


        if (
            !bookingResponse.ok ||
            bookingResult.success === false
        ) {

            throw new Error(
                bookingResult.message ||
                "Failed to load bookings."
            );
        }


        // ==================================
        // EXTRACT BOOKINGS
        // ==================================

        let bookings = [];

        if (Array.isArray(bookingResult)) {

            bookings = bookingResult;

        } else if (
            bookingResult &&
            Array.isArray(bookingResult.data)
        ) {

            bookings = bookingResult.data;
        }


        // ==================================
        // ORGANISER EVENT IDs
        // ==================================

        const organiserEventIds =
            events.map(event =>
                Number(event.event_id)
            );


        // ==================================
        // ORGANISER BOOKINGS ONLY
        // ==================================

        const organiserBookings =
            bookings.filter(booking =>

                organiserEventIds.includes(
                    Number(booking.event_id)
                )

            );


        // ==================================
        // TOTAL BOOKINGS
        // ==================================

        const totalBookings =
            document.getElementById(
                "totalBookings"
            );

        if (totalBookings) {

            totalBookings.textContent =
                organiserBookings.length;
        }


        // ==================================
        // CONFIRMED BOOKINGS
        // ==================================

        const confirmedBookings =
            organiserBookings.filter(
                booking => {

                    return String(
                        booking.booking_status || ""
                    ).toLowerCase() ===
                    "confirmed";
                }
            );


        const confirmedBookingsElement =
            document.getElementById(
                "confirmedBookings"
            );

        if (confirmedBookingsElement) {

            confirmedBookingsElement.textContent =
                confirmedBookings.length;
        }


        // ==================================
        // TOTAL REVENUE
        // ==================================

        const totalRevenue =
            confirmedBookings.reduce(
                (total, booking) => {

                    const amount =
                        Number(
                            booking.total_amount || 0
                        );

                    return total + amount;

                },
                0
            );


        const totalRevenueElement =
            document.getElementById(
                "totalRevenue"
            );

        if (totalRevenueElement) {

            totalRevenueElement.textContent =
                `RM ${totalRevenue.toFixed(2)}`;
        }


        console.log(
            "Organiser dashboard loaded successfully.",
            {
                events: events.length,
                bookings:
                    organiserBookings.length,
                confirmed:
                    confirmedBookings.length,
                revenue:
                    totalRevenue.toFixed(2)
            }
        );

    } catch (error) {

        console.error(
            "Organiser Dashboard Error:",
            error
        );


        const recentEvents =
            document.getElementById(
                "recentEvents"
            );


        if (recentEvents) {

            recentEvents.innerHTML = `
                <p style="color:red;">
                    ${escapeHTML(
                        error.message ||
                        "Unable to load dashboard data."
                    )}
                </p>
            `;
        }
    }
}


// ==========================================
// DISPLAY RECENT EVENTS
// ==========================================

function displayRecentEvents(events) {

    const container =
        document.getElementById(
            "recentEvents"
        );


    if (!container) {
        return;
    }


    if (events.length === 0) {

        container.innerHTML = `
            <p>No events found.</p>
        `;

        return;
    }


    const recentEvents =
        events.slice(0, 3);


    container.innerHTML =
        recentEvents.map(event => {

            const status =
                String(
                    event.status || "unknown"
                ).toLowerCase();


            return `

                <div class="event-card">

                    <div>

                        <span
                            class="status-badge status-${escapeHTML(status)}"
                        >
                            ${escapeHTML(
                                status.toUpperCase()
                            )}
                        </span>


                        <h3>
                            ${escapeHTML(
                                event.event_name || "-"
                            )}
                        </h3>


                        <p>
                            <strong>Date:</strong>
                            ${escapeHTML(
                                event.event_date || "-"
                            )}
                        </p>


                        <p>
                            <strong>Venue:</strong>
                            ${escapeHTML(
                                event.venue_name || "-"
                            )}
                        </p>


                        <p>
                            <strong>
                                Available Tickets:
                            </strong>

                            ${escapeHTML(
                                String(
                                    event.available_tickets ?? 0
                                )
                            )}
                        </p>

                    </div>

                </div>

            `;

        }).join("");
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
// START DASHBOARD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadDashboard();

    }
);