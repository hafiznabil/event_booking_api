// =====================================================
// EVENT BOOKING SYSTEM - ADMIN BOOKING MANAGEMENT
// JWT VERSION
// =====================================================

const API_URL =
    "http://localhost/event_booking_api/api/bookings.php";

const bookingsContainer =
    document.getElementById("bookingsContainer");

const messageBox =
    document.getElementById("messageBox");

const statusFilter =
    document.getElementById("statusFilter");

const refreshBtn =
    document.getElementById("refreshBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

let allBookings = [];


// =====================================================
// GET USER
// =====================================================

function getLoggedInUser() {

    const userData =
        localStorage.getItem("user");

    if (!userData) {
        return null;
    }

    try {

        return JSON.parse(userData);

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        return null;
    }
}


// =====================================================
// GET JWT TOKEN
// =====================================================

function getToken() {

    return localStorage.getItem("token");
}


// =====================================================
// JWT AUTH HEADERS
// =====================================================

function getAuthHeaders(includeJson = false) {

    const token = getToken();

    const headers = {
        "Authorization": `Bearer ${token}`
    };

    if (includeJson) {

        headers["Content-Type"] =
            "application/json";
    }

    return headers;
}


// =====================================================
// CHECK ADMIN LOGIN
// =====================================================

function checkAdminLogin() {

    const user =
        getLoggedInUser();

    const token =
        getToken();


    // User or token missing
    if (!user || !token) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href =
            "login.html";

        return false;
    }


    // Must be admin
    if (user.role !== "admin") {

        alert(
            "Access denied. Admin only."
        );

        if (user.role === "organiser") {

            window.location.href =
                "organiser-dashboard.html";

        } else if (user.role === "customer") {

            window.location.href =
                "events.html";

        } else {

            localStorage.removeItem("user");
            localStorage.removeItem("token");

            window.location.href =
                "login.html";
        }

        return false;
    }


    return true;
}


// =====================================================
// HANDLE UNAUTHORIZED RESPONSE
// =====================================================

function handleUnauthorized(response) {

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

        window.location.href =
            "login.html";

        return true;
    }

    return false;
}


// =====================================================
// LOAD BOOKINGS
// =====================================================

async function loadBookings() {

    if (!bookingsContainer) {
        return;
    }


    bookingsContainer.innerHTML =
        "<p>Loading bookings...</p>";


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        // JWT invalid / expired
        if (handleUnauthorized(response)) {
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
                "Failed to load bookings."
            );
        }


        // ==========================================
        // EXTRACT BOOKINGS
        // ==========================================

        if (Array.isArray(result)) {

            allBookings = result;

        } else if (
            result &&
            Array.isArray(result.data)
        ) {

            allBookings =
                result.data;

        } else {

            allBookings = [];
        }


        displayBookings();


    } catch (error) {

        console.error(
            "Load bookings error:",
            error
        );


        bookingsContainer.innerHTML = `

            <div class="empty-message">

                ${escapeHTML(
                    error.message ||
                    "Failed to load bookings."
                )}

            </div>

        `;
    }
}


// =====================================================
// DISPLAY BOOKINGS
// =====================================================

function displayBookings() {

    if (!bookingsContainer) {
        return;
    }


    const selectedStatus =
        statusFilter
            ? statusFilter.value.toLowerCase()
            : "";


    let filteredBookings =
        allBookings;


    // ==========================================
    // STATUS FILTER
    // ==========================================

    if (selectedStatus !== "") {

        filteredBookings =
            allBookings.filter(
                booking =>

                    String(
                        booking.booking_status || ""
                    ).toLowerCase()
                    === selectedStatus
            );
    }


    // ==========================================
    // NO BOOKINGS
    // ==========================================

    if (
        filteredBookings.length === 0
    ) {

        bookingsContainer.innerHTML = `

            <div class="empty-message">

                No bookings found.

            </div>

        `;

        return;
    }


    // ==========================================
    // BOOKING CARDS
    // ==========================================

    bookingsContainer.innerHTML =

        filteredBookings
            .map(booking => {


                const bookingId =
                    booking.booking_id ?? "-";


                const customerName =
                    booking.customer_name ??
                    booking.name ??
                    `Customer #${booking.customer_id ?? "-"}`;


                const customerEmail =
                    booking.customer_email ??
                    booking.email ??
                    "-";


                const eventName =
                    booking.event_name ??
                    `Event #${booking.event_id ?? "-"}`;


                const quantity =
                    Number(
                        booking.quantity ?? 0
                    );


                const ticketPrice =
                    Number(
                        booking.ticket_price ?? 0
                    );


                const totalAmount =
                    Number(
                        booking.total_amount ??
                        (
                            ticketPrice *
                            quantity
                        )
                    );


                const status =
                    String(
                        booking.booking_status ??
                        "unknown"
                    );


                const createdAt =
                    booking.created_at ??
                    booking.booking_date ??
                    "-";


                return `

                    <div class="booking-card">


                        <div class="booking-card-top">

                            <span
                                class="status-badge ${getStatusClass(status)}"
                            >

                                ${escapeHTML(
                                    status.toUpperCase()
                                )}

                            </span>


                            <span class="booking-id">

                                Booking #${escapeHTML(
                                    String(bookingId)
                                )}

                            </span>

                        </div>


                        <h3>

                            ${escapeHTML(
                                eventName
                            )}

                        </h3>


                        <p class="booking-customer">

                            Booked by

                            <strong>

                                ${escapeHTML(
                                    customerName
                                )}

                            </strong>

                        </p>


                        <div class="booking-details">


                            <div class="booking-detail">

                                <span>
                                    Customer Email
                                </span>

                                <strong>

                                    ${escapeHTML(
                                        customerEmail
                                    )}

                                </strong>

                            </div>


                            <div class="booking-detail">

                                <span>
                                    Customer ID
                                </span>

                                <strong>

                                    ${escapeHTML(
                                        String(
                                            booking.customer_id ??
                                            "-"
                                        )
                                    )}

                                </strong>

                            </div>


                            <div class="booking-detail">

                                <span>
                                    Event ID
                                </span>

                                <strong>

                                    ${escapeHTML(
                                        String(
                                            booking.event_id ??
                                            "-"
                                        )
                                    )}

                                </strong>

                            </div>


                            <div class="booking-detail">

                                <span>
                                    Quantity
                                </span>

                                <strong>

                                    ${escapeHTML(
                                        String(quantity)
                                    )}

                                </strong>

                            </div>


                            <div class="booking-detail">

                                <span>
                                    Ticket Price
                                </span>

                                <strong>

                                    RM ${ticketPrice.toFixed(2)}

                                </strong>

                            </div>


                            <div class="booking-detail">

                                <span>
                                    Total Amount
                                </span>

                                <strong>

                                    RM ${totalAmount.toFixed(2)}

                                </strong>

                            </div>


                            <div
                                class="
                                    booking-detail
                                    booking-detail-full
                                "
                            >

                                <span>
                                    Booking Date
                                </span>

                                <strong>

                                    ${escapeHTML(
                                        String(createdAt)
                                    )}

                                </strong>

                            </div>


                        </div>


                        <div class="booking-actions">

                            ${
                                status.toLowerCase()
                                !== "cancelled"

                                ? `

                                <button
                                    class="cancel-booking-btn"
                                    onclick="cancelBooking(
                                        ${Number(bookingId)},
                                        ${quantity}
                                    )"
                                >

                                    Cancel Booking

                                </button>

                                `

                                : `

                                <button
                                    class="cancel-booking-btn"
                                    disabled
                                >

                                    Cancelled

                                </button>

                                `
                            }

                        </div>


                    </div>

                `;

            })
            .join("");
}


// =====================================================
// CANCEL BOOKING
// =====================================================

async function cancelBooking(
    bookingId,
    quantity
) {

    bookingId =
        Number(bookingId);

    quantity =
        Number(quantity);


    // ==========================================
    // VALIDATE BOOKING ID
    // ==========================================

    if (
        !Number.isInteger(bookingId) ||
        bookingId <= 0
    ) {

        showMessage(
            "Invalid booking ID.",
            "error"
        );

        return;
    }


    // ==========================================
    // CONFIRM
    // ==========================================

    const confirmCancel =
        confirm(
            "Are you sure you want to cancel this booking?"
        );


    if (!confirmCancel) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}?id=${bookingId}`,
                {
                    method: "PUT",

                    headers:
                        getAuthHeaders(true),

                    body:
                        JSON.stringify({

                            quantity:
                                quantity,

                            booking_status:
                                "cancelled"
                        })
                }
            );


        // JWT invalid / expired
        if (handleUnauthorized(response)) {
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
                "Failed to cancel booking."
            );
        }


        showMessage(
            "Booking cancelled successfully.",
            "success"
        );


        await loadBookings();


    } catch (error) {

        console.error(
            "Cancel booking error:",
            error
        );


        showMessage(
            error.message ||
            "Failed to cancel booking.",
            "error"
        );
    }
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    status =
        String(status).toLowerCase();


    if (
        status === "confirmed"
    ) {

        return "status-confirmed";
    }


    if (
        status === "pending"
    ) {

        return "status-pending";
    }


    if (
        status === "cancelled"
    ) {

        return "status-cancelled";
    }


    return "status-default";
}


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(
    message,
    type
) {

    if (!messageBox) {

        alert(message);

        return;
    }


    messageBox.innerHTML = `

        <div class="admin-message ${type}">

            ${escapeHTML(message)}

        </div>

    `;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    setTimeout(() => {

        messageBox.innerHTML = "";

    }, 4000);
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
// FILTER
// =====================================================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        () => {

            displayBookings();
        }
    );
}


// =====================================================
// REFRESH
// =====================================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        () => {

            loadBookings();
        }
    );
}


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmLogout) {
                return;
            }


            // Remove authentication data
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
    );
}


// =====================================================
// START PAGE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!checkAdminLogin()) {
            return;
        }

        loadBookings();
    }
);